import React from 'react';
import { ShieldCheck, Lock, Cpu, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#0c0c0e]/50 backdrop-blur-sm mt-auto text-xs text-zinc-500 dark:text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Privacy statement */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>CleanPost</span>
            </div>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Ephemeral in-memory processing • Zero data retention • Not used for AI training
            </p>
          </div>

          {/* Badges & Year */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono text-zinc-400 dark:text-zinc-500">
              <Lock className="w-3 h-3 text-emerald-500" /> Auto-Purged
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-zinc-400 dark:text-zinc-500">
              <Cpu className="w-3 h-3 text-cyan-500" /> Local FFmpeg & Sharp
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
