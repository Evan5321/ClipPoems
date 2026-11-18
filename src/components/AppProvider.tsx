'use client';

import { useEffect, useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import Toaster from '@/components/shared/Toaster';
import { WifiOff } from 'lucide-react';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const loadAllCorpora = useCorpusStore((s) => s.loadAllCorpora);
  const restoreSelectedDraft = useCorpusStore((s) => s.restoreSelectedDraft);
  const isLoaded = useCorpusStore((s) => s.isLoaded);
  const [online, setOnline] = useState(true);

  // 水合完成后再恢复本地已选碎片草稿，避免 SSR 与客户端首帧不一致导致 Hydration 错误
  useEffect(() => {
    restoreSelectedDraft();
  }, [restoreSelectedDraft]);

  useEffect(() => {
    if (!isLoaded) loadAllCorpora();
  }, [isLoaded, loadAllCorpora]);

  // PWA：注册 Service Worker（仅生产环境，避免干扰开发热更新）
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[PWA] Service Worker 注册失败', err));
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  // 在线/离线状态
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster />
      {!online && (
        <div className="fixed bottom-4 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur">
          <WifiOff className="h-3.5 w-3.5" />
          当前离线 · 编辑内容会保存在本地
        </div>
      )}
    </>
  );
}
