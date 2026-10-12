'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Camera,
  Clock,
  Code,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { FileMetadataSummary } from '@/types/metadata';

interface MetadataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: FileMetadataSummary | null;
  afterMetadata?: FileMetadataSummary | null;
}

export function MetadataDrawer({
  isOpen,
  onClose,
  metadata,
  afterMetadata,
}: MetadataDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'gps' | 'device' | 'ai' | 'comparison' | 'raw'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !metadata) return null;

  const riskColors = {
    critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  const rawEntries = Object.entries(metadata.rawTags || {}).filter(([key, val]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      key.toLowerCase().includes(q) ||
      String(val).toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#101014] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-start justify-between">
          <div className="space-y-1 pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                {metadata.format}
              </span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={metadata.fileName}>
                {metadata.fileName}
              </h3>
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-3">
              <span>{metadata.fileSizeFormatted}</span>
              {metadata.dimensions?.width && (
                <span>
                  {metadata.dimensions.width} × {metadata.dimensions.height} px
                </span>
              )}
              {metadata.dimensions?.duration && (
                <span>{metadata.dimensions.duration.toFixed(1)}s video</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Risk Banner */}
        <div className={`px-5 py-3 border-b flex items-center justify-between text-xs ${riskColors[metadata.privacyRiskScore]}`}>
          <div className="flex items-center gap-2">
            {metadata.privacyRiskScore === 'critical' || metadata.privacyRiskScore === 'high' ? (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">
              Privacy Risk Level: <strong className="uppercase">{metadata.privacyRiskScore}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono">
            {metadata.riskReasons.length} leak indicator{metadata.riskReasons.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 gap-1 bg-zinc-50/40 dark:bg-zinc-900/30 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gps')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'gps'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            GPS & Location
            {metadata.hasGps && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'device'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Device & Camera
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI & C2PA
            {(metadata.hasAiIndicators || metadata.hasC2pa) && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            )}
          </button>

          {afterMetadata && (
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Before & After
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw Tags ({metadata.rawTagCount})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Risk Reasons */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Detected Privacy Findings
                </h4>
                {metadata.riskReasons.length > 0 ? (
                  <div className="space-y-1.5">
                    {metadata.riskReasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>No critical or high-risk metadata tags detected in this media file.</span>
                  </div>
                )}
              </div>

              {/* Status matrix */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
                  <div className="text-zinc-500">GPS Coordinates</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {metadata.hasGps ? (
                      <span className="text-rose-500">Exposed</span>
                    ) : (
                      <span className="text-emerald-500">None</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
                  <div className="text-zinc-500">Camera / Serial #</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {metadata.hasDeviceDetails ? (
                      <span className="text-amber-500">Logged</span>
                    ) : (
                      <span className="text-emerald-500">None</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
                  <div className="text-zinc-500">AI / C2PA Provenance</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {metadata.hasAiIndicators || metadata.hasC2pa ? (
                      <span className="text-purple-500">Detected</span>
                    ) : (
                      <span className="text-zinc-400">None</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-1">
                  <div className="text-zinc-500">Embedded Thumbnail</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {metadata.hasThumbnails ? (
                      <span className="text-amber-500">Present</span>
                    ) : (
                      <span className="text-emerald-500">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GPS */}
          {activeTab === 'gps' && (
            <div className="space-y-4">
              {metadata.hasGps ? (
                <>
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
                    <MapPin className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold">Location Privacy Leak</div>
                      <p>
                        This file contains exact geographic coordinates. Anyone with access to the raw file can pinpoint where you took this photo/video.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Latitude:</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {metadata.categories.gps.latitude}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Longitude:</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {metadata.categories.gps.longitude}
                      </span>
                    </div>
                    {metadata.categories.gps.altitude !== undefined && (
                      <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-500">Altitude:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">
                          {metadata.categories.gps.altitude} meters
                        </span>
                      </div>
                    )}
                    {metadata.categories.gps.timestamp && (
                      <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-500">GPS Timestamp:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">
                          {metadata.categories.gps.timestamp}
                        </span>
                      </div>
                    )}

                    {metadata.categories.gps.mapsUrl && (
                      <div className="pt-2">
                        <a
                          href={metadata.categories.gps.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                        >
                          View Coordinates on Google Maps
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">No GPS data found</p>
                  <p>This file does not leak geographic coordinates.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEVICE & CAMERA */}
          {activeTab === 'device' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Camera Manufacturer:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.device.make || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Camera Model:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.device.model || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Lens Model:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.device.lensModel || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Serial Number:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.device.serialNumber || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Creation Date:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.timestamps.dateTimeOriginal ||
                      metadata.categories.timestamps.createDate ||
                      'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Editing Software:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {metadata.categories.software.software ||
                      metadata.categories.software.creatorTool ||
                      'None detected'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI & C2PA */}
          {activeTab === 'ai' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Generative AI & Provenance Analysis
                </div>
                <p className="leading-relaxed">
                  CleanPost scans for C2PA Content Credentials JUMBF manifest blocks, Midjourney prompt signatures, Stable Diffusion/ComfyUI generation logs, Adobe Firefly flags, and IPTC digitalSourceType tags.
                </p>
              </div>

              {metadata.categories.aiIndicators.detected ? (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Detection Confidence:</span>
                    <span className="font-semibold uppercase text-purple-600 dark:text-purple-400">
                      {metadata.categories.aiIndicators.confidence}
                    </span>
                  </div>
                  {metadata.categories.aiIndicators.toolIdentified && (
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Identified Engine/Tool:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {metadata.categories.aiIndicators.toolIdentified}
                      </span>
                    </div>
                  )}
                  {metadata.categories.aiIndicators.digitalSourceType && (
                    <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500">Digital Source Type:</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {metadata.categories.aiIndicators.digitalSourceType}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <span className="text-zinc-500 font-medium">Detection Reasons:</span>
                    {metadata.categories.aiIndicators.reasons.map((r, i) => (
                      <div key={i} className="p-2 rounded bg-zinc-100 dark:bg-zinc-800/80 font-mono text-[11px]">
                        {r}
                      </div>
                    ))}
                  </div>

                  {metadata.categories.aiIndicators.promptFound && (
                    <div className="space-y-1 pt-1">
                      <span className="text-zinc-500 font-medium">Embedded Prompt Snippet:</span>
                      <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] break-all max-h-24 overflow-y-auto">
                        {metadata.categories.aiIndicators.promptFound}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 space-y-1">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">No AI generation markers detected</p>
                  <p>No standard C2PA manifests, SD parameters, or IPTC digitalSourceType tags were discovered.</p>
                </div>
              )}

              {/* Educational Disclaimer */}
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  What can vs. cannot be removed:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>Can be removed:</strong> Embedded EXIF tags, PNG chunk prompts (A1111/ComfyUI), C2PA JUMBF container manifests, and editing history.</li>
                  <li><strong>Cannot reliably be removed:</strong> Invisible latent model watermarks (e.g. Google SynthID), visual watermarks burned into image pixels, or labels assigned by social media platforms during upload.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: BEFORE & AFTER COMPARISON */}
          {activeTab === 'comparison' && afterMetadata && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                  <div className="font-semibold text-rose-600 dark:text-rose-400 uppercase text-[10px] tracking-wider">
                    Before Cleaning
                  </div>
                  <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
                    <div>GPS: {metadata.hasGps ? 'Latitude & Longitude' : 'None'}</div>
                    <div>Camera: {metadata.categories.device.make || 'None'}</div>
                    <div>Timestamps: {metadata.hasTimestamps ? 'Embedded' : 'None'}</div>
                    <div>AI Markers: {metadata.hasAiIndicators ? 'Present' : 'None'}</div>
                    <div>Raw Tags: {metadata.rawTagCount}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                    After Cleaning
                  </div>
                  <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
                    <div>GPS: <span className="text-emerald-500 font-semibold">Stripped</span></div>
                    <div>Camera: <span className="text-emerald-500 font-semibold">Stripped</span></div>
                    <div>Timestamps: <span className="text-emerald-500 font-semibold">Stripped</span></div>
                    <div>AI Markers: <span className="text-emerald-500 font-semibold">Stripped</span></div>
                    <div>Raw Tags: <span className="text-emerald-500 font-semibold">{afterMetadata.rawTagCount}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RAW TAGS */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search raw metadata tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs font-mono max-h-96 overflow-y-auto">
                {rawEntries.map(([k, v]) => (
                  <div key={k} className="p-2.5 flex items-start justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                    <span className="text-zinc-500 dark:text-zinc-400 pr-2 shrink-0">{k}:</span>
                    <span className="text-zinc-900 dark:text-zinc-100 text-right break-all">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
