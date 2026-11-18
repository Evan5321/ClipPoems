'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listWorks, deleteWork, renameWork, type Work } from '@/lib/canvas/storage';
import {
  Plus,
  Trash2,
  Pencil,
  FolderOpen,
  Check,
  X,
  Search,
  LayoutGrid,
  List,
  History,
} from 'lucide-react';
import TopNav from '@/components/layout/TopNav';
import { estimateFragmentSize } from '@/lib/canvas/geometry';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function bgStyle(work: Work): React.CSSProperties {
  const bg = work.snapshot.background;
  if (bg.type === 'solid') return { background: bg.value };
  if (bg.type === 'gradient') return { backgroundImage: bg.value };
  if (bg.type === 'image' || bg.type === 'texture') {
    return { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: '#f5f0e8' };
}

/** 用 SVG 按真实坐标缩放渲染作品缩略图 */
function WorkPreview({ work }: { work: Work }) {
  const { canvasSize, fragments } = work.snapshot;
  const { width, height } = canvasSize;
  const sorted = [...fragments].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="absolute inset-0" style={bgStyle(work)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {sorted.map((f) => {
          const fontSize = f.style?.fontSize || 24;
          const size = f.width && f.height ? { width: f.width, height: f.height } : estimateFragmentSize(f.text, fontSize);
          const lines = f.text.split('\n');
          return (
            <g
              key={f.id}
              transform={`translate(${f.position.x} ${f.position.y}) rotate(${f.rotation})`}
              opacity={f.style?.opacity ?? 1}
            >
              <rect width={size.width} height={size.height} fill={f.style?.backgroundColor || '#ffffff'} rx={2} />
              <text
                x={size.width / 2}
                y={size.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={f.style?.fontFamily || 'serif'}
                fontSize={fontSize}
                fill={f.style?.color || '#333'}
                letterSpacing={f.style?.letterSpacing ?? 0}
                style={f.style?.direction === 'vertical' ? { writingMode: 'vertical-rl' } : undefined}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={size.width / 2} dy={i === 0 ? 0 : fontSize * (f.style?.lineHeight || 1.6)}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type SortKey = 'updated' | 'created' | 'name';
type ViewMode = 'grid' | 'list';

export default function GalleryPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [view, setView] = useState<ViewMode>('grid');

  const refresh = () => {
    setWorks(listWorks());
    setLoaded(true);
  };

  useEffect(() => {
    // 延迟一帧展示加载态
    const t = setTimeout(refresh, 30);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const list = works.filter((w) => w.title.toLowerCase().includes(query.trim().toLowerCase()));
    return list.sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title, 'zh-CN');
      if (sort === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
  }, [works, query, sort]);

  const startNew = () => {
    try {
      localStorage.removeItem('clip-poems-auto-new');
    } catch {
      // ignore
    }
    router.push('/editor/new');
  };

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

  const titleEditor = (w: Work) =>
    editingId === w.id ? (
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
        <button onClick={() => confirmRename(w.id)} className="rounded p-1 text-primary hover:bg-primary/10" title="确认">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditingId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary" title="取消">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-between gap-1">
        <h3 className="truncate text-sm font-medium">{w.title}</h3>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => startRename(w)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="重命名">
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
    );

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <TopNav />
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">作品画廊</h1>
            <p className="text-xs text-muted-foreground">{loaded ? `共 ${works.length} 个作品` : '加载中…'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索作品标题…"
                className="h-8 w-44 rounded-md border bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
              title="排序"
            >
              <option value="updated">最近修改</option>
              <option value="created">创建时间</option>
              <option value="name">名称</option>
            </select>
            <div className="flex items-center gap-0.5 rounded-md border p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`rounded px-1.5 py-1 ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="网格视图"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`rounded px-1.5 py-1 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="列表视图"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={startNew}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              新建作品
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {!loaded ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg border bg-background/60" />
            ))}
          </div>
        ) : works.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground">还没有作品</p>
            <p className="mt-1 text-sm text-muted-foreground">从语料中挑选碎片，开始创作你的第一首剪贴诗</p>
            <button
              onClick={startNew}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              开始创作
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-sm text-muted-foreground">没有匹配「{query}」的作品</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((w) => (
              <div key={w.id} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md">
                <button
                  onClick={() => router.push(`/editor/${w.id}`)}
                  className="relative block aspect-[4/3] w-full overflow-hidden"
                  title="打开编辑"
                >
                  <WorkPreview work={w} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                    <span className="rounded-md bg-background/90 px-3 py-1 text-xs font-medium shadow">打开编辑</span>
                  </div>
                  {(w.versions?.length || 0) > 0 && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <History className="h-2.5 w-2.5" />
                      {w.versions!.length}
                    </span>
                  )}
                </button>
                <div className="p-3">
                  {titleEditor(w)}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{w.snapshot.fragments.length} 个碎片</span>
                    <span>·</span>
                    <span>{formatDate(w.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((w) => (
              <div key={w.id} className="group flex items-center gap-3 rounded-lg border bg-card p-2 shadow-sm hover:shadow-md">
                <button
                  onClick={() => router.push(`/editor/${w.id}`)}
                  className="relative h-14 w-20 shrink-0 overflow-hidden rounded"
                  title="打开编辑"
                >
                  <WorkPreview work={w} />
                </button>
                <div className="min-w-0 flex-1">
                  {titleEditor(w)}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{w.snapshot.fragments.length} 个碎片</span>
                    <span>·</span>
                    <span>创建于 {new Date(w.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span>·</span>
                    <span>修改于 {formatDate(w.updatedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/editor/${w.id}`)}
                  className="shrink-0 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  打开
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
