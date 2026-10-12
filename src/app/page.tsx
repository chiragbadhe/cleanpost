'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  MapPin,
  Camera,
  Sparkles,
  Lock,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Dropzone } from '@/components/Dropzone';
import { FileQueue, QueueItem } from '@/components/FileQueue';
import { MetadataDrawer } from '@/components/MetadataDrawer';
import { CleaningOptionsModal } from '@/components/CleaningOptionsModal';
import { CleaningOptions } from '@/types/metadata';

export default function HomePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedItemForInspect, setSelectedItemForInspect] = useState<QueueItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

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
            prev.map((q) => (q.id === item.id ? { ...q, metadata: data.metadata } : q))
          );
          setSelectedItemForInspect((current) =>
            current && current.id === item.id ? { ...current, metadata: data.metadata } : current
          );
        }
      } catch (e) {
        console.error('Inspection failed:', e);
      }
    }
  };

  const handleCleanSingle = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: 'cleaning' } : q))
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
        throw new Error(data.error || 'Failed to clean');
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
    } catch (err: unknown) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: 'failed', error: (err as Error)?.message } : q
        )
      );
    }
  };

  const handleCleanAll = async () => {
    const pending = queue.filter((q) => q.status === 'ready' || q.status === 'failed');
    if (pending.length === 0) return;

    setIsProcessingBatch(true);
    for (const item of pending) {
      await handleCleanSingle(item.id);
    }
    setIsProcessingBatch(false);
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
              q.id === item.id ? { ...q, status: 'ready', metadata: data.metadata } : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'ready' } : q))
          );
        }
      } catch (e) {
        console.error('Scan error:', e);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'ready' } : q))
        );
      }
    }
    setIsProcessingBatch(false);
  };

  const handleDownloadAllZip = async () => {
    const completed = queue.filter((q) => q.status === 'completed' && q.cleanResult);
    if (completed.length === 0) return;

    const fileIds = completed.map((q) => q.cleanResult!.fileId);
    try {
      const res = await fetch('/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });

      if (!res.ok) throw new Error('ZIP failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleanpost_batch_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error)?.message || 'Failed to download zip');
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleClearQueue = () => {
    queue.forEach((q) => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });
    setQueue([]);
  };

  const faqs = [
    {
      q: "Don't social media platforms automatically strip metadata when I post?",
      a: "While platforms like Instagram or X recompress public photos, their backend ingestion servers read and record your raw metadata (exact GPS coordinates, camera serial numbers, and device model) the moment you hit upload. CleanPost strips these tags before they ever touch social media servers.",
    },
    {
      q: "Can CleanPost detect and remove C2PA Content Credentials and AI prompts?",
      a: "Yes. CleanPost scans image and video containers for C2PA JUMBF manifest blocks, XMP digitalSourceType declarations, and generation prompt strings (e.g., Stable Diffusion parameters, Midjourney comment logs). We strip these manifest blocks cleanly.",
    },
    {
      q: "Does CleanPost guarantee my file won't be labeled 'AI' by platforms?",
      a: "No privacy tool can make that guarantee. While CleanPost removes all embedded metadata, manifest credentials, and prompt text, social platforms may use their own visual classifiers, or the image may contain invisible latent watermarks (such as Google SynthID). CleanPost is transparent about what can be stripped versus what cannot.",
    },
    {
      q: "Will stripping metadata ruin the quality of my photos or videos?",
      a: "No. For images, CleanPost uses Sharp to auto-rotate and preserve orientation while re-encoding at high visual quality (90%+). For videos, CleanPost defaults to fast stream-copying via FFmpeg, which removes container metadata atoms without touching your video or audio tracks.",
    },
    {
      q: "Are my media files stored or logged on your servers?",
      a: "Never. Files are processed in volatile scratch storage, cleaned immediately, and served via ephemeral download links that expire within 15 minutes. We maintain a strict zero-retention policy and never use files for AI training.",
    },
  ];

  return (
    <div className="flex flex-col space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 pb-12 overflow-hidden">
        {/* Ambient subtle glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Retention Social Media Privacy Shield</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]">
            Share photos and videos{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              without leaking your privacy
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Every photo and clip you shoot carries hidden GPS coordinates, camera serial numbers, and AI provenance manifests. CleanPost sanitizes them before you post to Instagram, X, TikTok, or LinkedIn.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/clean"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              Open Dedicated Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="px-5 py-3 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-[#121215]/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Learn What Leaks
            </Link>
          </div>
        </div>

        {/* LIVE DROPZONE & INSTANT WORKSPACE */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="p-4 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#101014]/70 border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                Quick Upload & Clean
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Photos & Videos Supported
              </span>
            </div>

            <Dropzone onFilesSelected={handleFilesSelected} disabled={isProcessingBatch} />

            {/* Queue widget if files are loaded */}
            {queue.length > 0 && (
              <div className="pt-2">
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
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            What CleanPost Removes From Your Media
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Engineered with deep inspection tools to target both traditional EXIF leaks and modern generative AI credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              GPS & Physical Location
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Strips latitude, longitude, altitude, and timestamps that pinpoint the exact spot where a photo or video was recorded. Protects homes and secret spots.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Camera & Device Fingerprint
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Erases hardware serial numbers, camera body, lens model, firmware versions, and owner copyright identifiers stored inside the EXIF block.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-purple-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              AI Prompts & C2PA Provenance
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Scans and scrubs embedded Stable Diffusion parameters, ComfyUI node graphs, Midjourney markers, and C2PA Content Credentials JUMBF manifest boxes.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Embedded Thumbnail Wipe
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Removes internal preview thumbnails. These mini-images often leak uncropped, unblurred, or original versions of cropped and edited photos.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Visual Quality Preserved
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Auto-rotates images before stripping orientation tags so your photos never end up upside-down. Uses lossless video stream-copying when possible.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Zero Server Retention
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We never save your originals, never inspect the visual content, and never feed uploaded media into AI training sets. Everything auto-purges in 15 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            What Platforms Ingest vs What CleanPost Sends
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Compare what happens when uploading a raw photo from your camera roll vs after sanitizing with CleanPost.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="py-3 px-4">Metadata Category</th>
                  <th className="py-3 px-4">Raw File (Before)</th>
                  <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                    CleanPost Output (After)
                  </th>
                  <th className="py-3 px-4">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    GPS Coordinates
                  </td>
                  <td className="py-3 px-4 text-rose-500 font-mono">
                    Lat/Long to 6 decimal places (±1 meter)
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    100% Stripped (0 bytes)
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold text-[10px] uppercase">
                      Critical
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    Device Serial Number
                  </td>
                  <td className="py-3 px-4 text-amber-500 font-mono">
                    Unique hardware serial number
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Removed
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold text-[10px] uppercase">
                      High
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    Original Capture Time
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono">
                    Year, month, day, second, timezone
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Erased
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold text-[10px] uppercase">
                      Medium
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    C2PA Content Credentials
                  </td>
                  <td className="py-3 px-4 text-purple-500 font-mono">
                    JUMBF manifest tracking author & AI edits
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Manifest box deleted
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-semibold text-[10px] uppercase">
                      High
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    AI Prompts (SD / ComfyUI)
                  </td>
                  <td className="py-3 px-4 text-purple-500 font-mono">
                    Generation prompt, seed, model checkpoint
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Scrubbed from chunk payload
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-semibold text-[10px] uppercase">
                      High
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                    Embedded Mini Thumbnail
                  </td>
                  <td className="py-3 px-4 text-amber-500 font-mono">
                    Pre-rendered thumbnail in IFD1
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Stripped
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold text-[10px] uppercase">
                      Medium
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HONEST AI & PLATFORM DISCLOSURE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
            <Info className="w-4 h-4 text-blue-500" />
            Honest Privacy Commitment: What CleanPost Can and Cannot Guarantee
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Privacy tools should never make deceptive promises. CleanPost reliably inspects and strips all standard metadata, container tags, C2PA JUMBF manifests, and generation prompts from file headers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="space-y-1">
              <strong className="text-emerald-600 dark:text-emerald-400 block">✓ What We Guarantee:</strong>
              <p className="text-zinc-500 dark:text-zinc-400">
                100% removal of EXIF, GPS coordinates, device identifiers, embedded thumbnails, PNG text prompts, and C2PA manifest boxes from your exported file.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-amber-600 dark:text-amber-400 block">⚠ What No Tool Can Promise:</strong>
              <p className="text-zinc-500 dark:text-zinc-400">
                Removal of server-side platform labels added during upload, visible burn-in watermarks, or latent AI watermarks (like Google SynthID) embedded directly into the pixel math.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Common questions regarding metadata, AI provenance, and social platform behavior.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = faqOpenIndex === index;
            return (
              <div
                key={index}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#121215] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      isOpen ? 'rotate-180 text-emerald-500' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Ready to sanitize your media?
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          No sign up required. No accounts, no subscriptions, and zero file retention.
        </p>
        <div>
          <Link
            href="/clean"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md transition-transform hover:scale-105"
          >
            Launch Clean Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Metadata Inspection Drawer */}
      <MetadataDrawer
        isOpen={Boolean(selectedItemForInspect)}
        onClose={() => setSelectedItemForInspect(null)}
        metadata={selectedItemForInspect?.metadata || null}
        afterMetadata={selectedItemForInspect?.cleanResult?.afterMetadata || null}
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
