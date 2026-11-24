import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Database, X } from 'lucide-react';
import { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import schemaSql from '../../supabase/schema.sql?raw';

interface SupabaseStatusModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupabaseStatusModal({ open, onClose }: SupabaseStatusModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supabase-setup-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2
                  id="supabase-setup-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Supabase Backend Setup & SQL Schema
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close setup modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Connection Status:{' '}
                  <span
                    className={
                      isSupabaseConfigured
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {isSupabaseConfigured
                      ? 'Configured (Connected via VITE_SUPABASE_URL)'
                      : 'Not Configured (Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)'}
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  To enable Email &amp; Password authentication and PostgreSQL storage, add{' '}
                  <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded">
                    VITE_SUPABASE_URL
                  </code>{' '}
                  and{' '}
                  <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded">
                    VITE_SUPABASE_ANON_KEY
                  </code>{' '}
                  to your environment configuration, ensure the <strong>Email</strong> provider is
                  enabled under Supabase Authentication → Providers, and run the schema below in
                  your Supabase SQL Editor.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    PostgreSQL Schema & RLS Policies (supabase/schema.sql)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied SQL' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
                  {schemaSql}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
