'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listWorks, deleteWork, renameWork, type Work } from '@/lib/canvas/storage';
import { Plus, Trash2, Pencil, FolderOpen, ArrowLeft, Check, X } from 'lucide-react';
import TopNav from '@/components/layout/TopNav';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/** 取作品背景预览样式 */
function bgPreview(work: Work): React.CSSProperties {
  const bg = work.snapshot.background;
  if (bg.type === 'solid') return { background: bg.value };
  if (bg.type === 'gradient') return { backgroundImage: bg.value };
  if (bg.type === 'image' || bg.type === 'texture') {
    return { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: '#f5f0e8' };
}

export default function GalleryPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = () => {
    setWorks(listWorks());
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`确定删除「${title}」吗？此操作不可撤销。`)) {
      deleteWork(id);
      refresh();
    }
  };

  const startRename = (w: Work) => {
    setEditingId(w.id);
    setEditingTitle(w.title);
  };

  const confirmRename = (id: string) => {
    renameWork(id, editingTitle.trim() || '未命名作品');
    setEditingId(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <TopNav />
      {/* Header */}
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">作品画廊</h1>
            <p className="text-xs text-muted-foreground">
              {loaded ? `共 ${works.length} 个作品` : '加载中…'}
            </p>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('clip-poems-auto-new');
              } catch {
                // ignore
              }
              router.push('/editor/new');
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {loaded && works.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground">还没有作品</p>
            <p className="mt-1 text-sm text-muted-foreground">从语料中挑选碎片，开始创作你的第一首剪贴诗</p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('clip-poems-auto-new');
                } catch {
                  // ignore
                }
                router.push('/editor/new');
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              开始创作
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {works.map((w) => {
              const fragments = w.snapshot.fragments;
              const previewTexts = fragments.slice(0, 4).map((f) => f.text);
              return (
                <div
                  key={w.id}
                  className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md"
                >
                  {/* 预览区 */}
                  <button
                    onClick={() => router.push(`/editor/${w.id}`)}
                    className="relative block aspect-[4/3] w-full overflow-hidden"
                    style={bgPreview(w)}
                    title="打开编辑"
                  >
                    {/* 碎片预览 */}
                    <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-1.5 p-3">
                      {previewTexts.length > 0 ? (
                        previewTexts.map((t, i) => (
                          <span
                            key={i}
                            className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-stone-800 shadow-sm"
                            style={{
                              transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (2 + i)}deg)`,
                            }}
                          >
                            {t.length > 8 ? t.slice(0, 8) + '…' : t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400">空白作品</span>
                      )}
                    </div>
                    {/* 悬浮打开提示 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                      <span className="rounded-md bg-background/90 px-3 py-1 text-xs font-medium shadow">
                        打开编辑
                      </span>
                    </div>
                  </button>

                  {/* 信息区 */}
                  <div className="p-3">
                    {editingId === w.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(w.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-6 flex-1 rounded border bg-background px-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() => confirmRename(w.id)}
                          className="rounded p-1 text-primary hover:bg-primary/10"
                          title="确认"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary"
                          title="取消"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="truncate text-sm font-medium">{w.title}</h3>
                        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startRename(w)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="重命名"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(w.id, w.title)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{fragments.length} 个碎片</span>
                      <span>·</span>
                      <span>{formatDate(w.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
