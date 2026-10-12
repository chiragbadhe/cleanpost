import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Trash2,
  ServerOff,
  EyeOff,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy & Data Security — CleanPost',
  description:
    'Complete transparency regarding CleanPost ephemeral processing, zero file retention, and data security guarantees.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="space-y-3 border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy Guarantee</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Privacy Policy & Ephemeral Data Lifecycle
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          CleanPost exists to protect your privacy, not compromise it. We operate under a strict zero-retention architecture where files are cleaned in transient scratch space and immediately destroyed.
        </p>
      </div>

      {/* Core Commitments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ServerOff className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Zero File Retention
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Originals and cleaned outputs are never persisted to long-term databases or cloud buckets.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <EyeOff className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            No AI Model Training
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Your photos and video clips are never used to train machine learning models or generative AI.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            No Coordinate Logging
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We never record or log extracted GPS coordinates, camera serial numbers, or EXIF timestamps.
          </p>
        </div>
      </div>

      {/* Technical Data Lifecycle */}
      <section className="space-y-4 text-xs sm:text-sm">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          1. The Ephemeral Data Lifecycle
        </h2>
        <div className="space-y-3 text-zinc-600 dark:text-zinc-400 leading-relaxed">
          <p>
            When you upload a photo or video to CleanPost:
          </p>
          <div className="space-y-2">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <strong className="text-zinc-800 dark:text-zinc-200 block">In-Memory Ingestion:</strong>
                Your file is validated against binary magic signatures (preventing malformed payloads) and placed in a transient scratch folder with a randomized UUID.
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <strong className="text-zinc-800 dark:text-zinc-200 block">Inspection & Sanitization:</strong>
                Sharp and FFmpeg execute local stream processing to strip EXIF, GPS, C2PA JUMBF manifests, and embedded thumbnails. No external third-party cloud APIs are called.
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <strong className="text-zinc-800 dark:text-zinc-200 block">Immediate Disk Cleanup:</strong>
                The temporary folder on disk is deleted immediately in a guaranteed <code>finally</code> block as soon as cleaning finishes.
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <strong className="text-zinc-800 dark:text-zinc-200 block">Ephemeral Download Store:</strong>
                Cleaned outputs are held in a short-lived memory cache for up to 15 minutes to allow single or batch ZIP downloading, after which they are permanently flushed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="space-y-4 text-xs sm:text-sm">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          2. Security Architecture & Safeguards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1.5">
            <strong className="text-zinc-900 dark:text-zinc-100 block">MIME Magic Number Validation</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              We verify the binary header signature of every upload (e.g. <code>0xFFD8FF</code> for JPEG, <code>ftyp</code> for MP4) to prevent disguised executable uploads or malformed payloads.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1.5">
            <strong className="text-zinc-900 dark:text-zinc-100 block">Path Traversal & Filename Scrubbing</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              All filenames are sanitized to prevent directory traversal attacks (<code>../</code>) and null-byte injection vulnerabilities.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1.5">
            <strong className="text-zinc-900 dark:text-zinc-100 block">Strict HTTP Headers</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Responses enforce <code>X-Content-Type-Options: nosniff</code> and <code>Cache-Control: no-store</code> so intermediary proxies never cache private media.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-1.5">
            <strong className="text-zinc-900 dark:text-zinc-100 block">Strict Upload Limits</strong>
            <p className="text-zinc-500 dark:text-zinc-400">
              Uploads are capped at 150MB per file to defend against memory exhaustion and denial-of-service attempts.
            </p>
          </div>
        </div>
      </section>

      {/* Contact & Transparency */}
      <section className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs sm:text-sm">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
          3. Complete User Autonomy
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          CleanPost requires no accounts, no credit cards, and no cookies. You are in complete control over your media. If you have questions about our privacy policies or want to run CleanPost in an air-gapped private environment, you can deploy the Docker container directly.
        </p>
        <div className="pt-2">
          <Link
            href="/clean"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Go to Processing Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
