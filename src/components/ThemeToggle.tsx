'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full border border-zinc-200 dark:border-zinc-700/60 shadow-sm text-xs">
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Light theme"
        className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
          theme === 'light'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark theme"
        className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-zinc-900 text-white dark:bg-zinc-700 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        title="System preference"
        className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
          theme === 'system'
            ? 'bg-white text-zinc-900 dark:bg-zinc-700 dark:text-white shadow-sm'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
