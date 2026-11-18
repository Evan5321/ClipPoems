'use client';

import { useToastStore } from '@/store/toastStore';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
          const color =
            t.type === 'success'
              ? 'text-emerald-500'
              : t.type === 'error'
                ? 'text-red-500'
                : 'text-sky-500';
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex max-w-xs items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg"
            >
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <span className="flex-1 text-sm">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
