'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, FolderOpen, Scissors } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';

const NAV_ITEMS = [
  { href: '/', label: '首页', icon: Home },
  { href: '/corpus', label: '语料库', icon: BookOpen },
  { href: '/editor/new', label: '新建作品', icon: Scissors, clearDraft: true },
  { href: '/gallery', label: '作品画廊', icon: FolderOpen },
];

export default function TopNav() {
  const pathname = usePathname();
  const dirty = useCanvasStore((s) => s.dirty);

  const handleNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    clearDraft?: boolean,
  ) => {
    const isEditor = pathname.startsWith('/editor/');
    if (isEditor && dirty && pathname !== href) {
      if (!confirm('当前作品有未保存的修改，确定要离开吗？')) {
        e.preventDefault();
        return;
      }
      // 确认离开：清除当前作品的自动保存草稿
      const canvasId = pathname.replace('/editor/', '');
      try {
        localStorage.removeItem(`clip-poems-auto-${canvasId}`);
      } catch {
        // ignore
      }
    }
    if (clearDraft) {
      try {
        localStorage.removeItem('clip-poems-auto-new');
      } catch {
        // ignore
      }
    }
    // 离开编辑器或新建作品时重置画布状态，避免重新进入时残留旧内容
    if ((isEditor && pathname !== href) || clearDraft) {
      useCanvasStore.getState().resetCanvas();
      useCorpusStore.getState().clearSelection();
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link
          href="/"
          onClick={(e) => handleNavigate(e, '/')}
          className="flex items-center gap-2 font-bold"
        >
          <span className="text-lg">✂</span>
          <span>ClipPoems</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigate(e, item.href, item.clearDraft)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
