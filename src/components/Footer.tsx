import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Cpu, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#0c0c0e]/50 backdrop-blur-sm mt-auto text-xs text-zinc-500 dark:text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              CleanPost Privacy Guarantee
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-w-md">
              Files uploaded to CleanPost are processed ephemerally using memory and transient scratch storage. We do not store original or cleaned media, do not inspect private content, do not log GPS coordinates, and never use customer uploads to train AI models.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/50">
                <Lock className="w-3 h-3 text-emerald-500" /> Auto-Purge Cache
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/50">
                <Cpu className="w-3 h-3 text-cyan-500" /> Local FFmpeg & Sharp
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs uppercase tracking-wider">
              Navigation
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  Home & Quick Upload
                </Link>
              </li>
              <li>
                <Link href="/clean" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  Batch Cleaner Workspace
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  About Metadata & AI Provenance
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                  Privacy Policy & Data Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Supported Formats */}
          <div className="space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs uppercase tracking-wider">
              Supported Media
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Photos: JPG, JPEG, PNG, WebP, HEIC.<br />
              Videos: MP4, MOV, WebM container streams.<br />
              Sanitizes EXIF, GPS, XMP, IPTC, C2PA, and generative AI parameters.
            </p>
            <div className="pt-1">
              <Link
                href="/api/health"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
              >
                ● System & Engine Status (/api/health)
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">
            &copy; {new Date().getFullYear()} CleanPost. Built for high-integrity privacy before posting to Instagram, X, TikTok, LinkedIn, & Facebook.
          </p>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            <span>Built with care for public privacy</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
