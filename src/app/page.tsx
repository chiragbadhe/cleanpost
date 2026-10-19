'use client';

import React, { useState } from 'react';
import { Dropzone } from '@/components/Dropzone';
import { FileQueue, QueueItem } from '@/components/FileQueue';
import { MetadataDrawer } from '@/components/MetadataDrawer';
import { CleaningOptionsModal } from '@/components/CleaningOptionsModal';
import { CleaningOptions } from '@/types/metadata';
import Link from 'next/link';
import { ShieldCheck, Sliders, CheckCircle2, Sparkles } from 'lucide-react';

export default function CleanPostApp() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedItemForInspect, setSelectedItemForInspect] = useState<QueueItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const [options, setOptions] = useState<CleaningOptions>({
    removeExif: true,
    removeGps: true,
    removeTimestamps: true,
    removeSoftware: true,
    removeXmpIptc: true,
    removeThumbnails: true,
    stripC2pa: true,
    stripAiPrompts: true,
    reencode: false,
    targetFormat: 'original',
    quality: 90,
  });

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleFilesSelected = (files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'ready',
      metadata: null,
      cleanResult: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    showNotification(`Added ${newItems.length} file${newItems.length > 1 ? 's' : ''} to queue.`);
  };

  const handleInspect = async (item: QueueItem) => {
    setSelectedItemForInspect(item);
    if (!item.metadata && item.status !== 'cleaning') {
      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const res = await fetch('/api/metadata/inspect', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.metadata) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, metadata: data.metadata } : q
            )
          );
          setSelectedItemForInspect((current) =>
            current && current.id === item.id
              ? { ...current, metadata: data.metadata }
              : current
          );
        }
      } catch (err) {
        console.error('Inspection failed:', err);
      }
    }
  };

  const handleCleanSingle = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: 'cleaning', error: undefined } : q))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('options', JSON.stringify(options));

      const res = await fetch('/api/metadata/clean', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to clean file metadata');
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: 'completed',
                cleanResult: data.result,
                metadata: data.result.beforeMetadata,
              }
            : q
        )
      );
      showNotification(`Successfully cleaned ${item.file.name}`);
    } catch (err: unknown) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: 'failed', error: (err as Error)?.message || 'Cleaning failed' }
            : q
        )
      );
    }
  };

  const handleCleanAll = async () => {
    const pendingItems = queue.filter(
      (q) => q.status === 'ready' || q.status === 'failed'
    );
    if (pendingItems.length === 0) return;

    setIsProcessingBatch(true);
    for (const item of pendingItems) {
      await handleCleanSingle(item.id);
    }
    setIsProcessingBatch(false);
    showNotification('Batch cleaning completed.');
  };

  const handleScanAll = async () => {
    const unscanned = queue.filter((q) => !q.metadata);
    if (unscanned.length === 0) return;

    setIsProcessingBatch(true);
    for (const item of unscanned) {
      try {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'scanning' } : q))
        );

        const formData = new FormData();
        formData.append('file', item.file);

        const res = await fetch('/api/metadata/inspect', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.metadata) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'ready', metadata: data.metadata }
                : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'ready' } : q))
          );
        }
      } catch (e) {
        console.error('Scan failed for item:', item.id, e);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'ready' } : q))
        );
      }
    }
    setIsProcessingBatch(false);
    showNotification('All files scanned.');
  };

  const handleDownloadAllZip = async () => {
    const completedItems = queue.filter((q) => q.status === 'completed' && q.cleanResult);
    if (completedItems.length === 0) return;

    const fileIds = completedItems.map((q) => q.cleanResult!.fileId);

    try {
      showNotification('Generating ZIP archive...');
      const res = await fetch('/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to build ZIP');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `cleanpost_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showNotification('ZIP download started.');
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to download ZIP archive.');
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleClearQueue = () => {
    queue.forEach((q) => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });
    setQueue([]);
    showNotification('Queue cleared.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              CleanPost
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Ready
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Remove sensitive EXIF, GPS location, device serials, and AI generation metadata from images and videos before posting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/compress"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Image Compressor
          </Link>
          <button
            type="button"
            onClick={() => setIsOptionsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            Cleaning Rules
          </button>
        </div>
      </div>

      {/* Toast Banner */}
      {statusNotification && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Main Dropzone */}
      <Dropzone onFilesSelected={handleFilesSelected} disabled={isProcessingBatch} />

      {/* Processing Queue */}
      <FileQueue
        items={queue}
        options={options}
        onInspect={handleInspect}
        onCleanSingle={handleCleanSingle}
        onRemove={handleRemove}
        onCleanAll={handleCleanAll}
        onScanAll={handleScanAll}
        onDownloadAllZip={handleDownloadAllZip}
        onClearQueue={handleClearQueue}
        onOpenOptions={() => setIsOptionsModalOpen(true)}
        isProcessingBatch={isProcessingBatch}
      />

      {/* Privacy Guarantee Note */}
      <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            100% Ephemeral Processing Guarantee
          </span>
          <p>
            Your files are processed securely in volatile scratch memory and are never retained, logged, or used for AI training. Download links expire automatically after 15 minutes.
          </p>
        </div>
      </div>

      {/* Metadata Inspection Drawer */}
      <MetadataDrawer
        isOpen={Boolean(selectedItemForInspect)}
        onClose={() => setSelectedItemForInspect(null)}
        metadata={selectedItemForInspect?.metadata || null}
        afterMetadata={selectedItemForInspect?.cleanResult?.afterMetadata || null}
        report={selectedItemForInspect?.cleanResult?.report || null}
      />

      {/* Options Preferences Modal */}
      <CleaningOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        options={options}
        onOptionsChange={setOptions}
      />
    </div>
  );
}
