'use client';

import { useEffect } from 'react';
import { RotateCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('页面渲染出错:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f0e8] px-6 text-center">
      <div className="text-4xl">✂️</div>
      <h1 className="text-xl font-semibold">出了点小问题</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        页面渲染时发生错误。你的作品保存在本地，不会丢失。可以尝试刷新页面或返回首页。
      </p>
      {error.digest && <p className="text-[10px] text-muted-foreground/60">错误编号：{error.digest}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <RotateCw className="h-4 w-4" />
          重试
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm hover:bg-secondary"
        >
          <Home className="h-4 w-4" />
          返回首页
        </a>
      </div>
    </main>
  );
}
