'use client';

import { useEffect, useMemo, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import { OFFICIAL_MARKET_PACKS, type MarketPack } from '@/data/market/packs';
import { fetchMarketPacks, fetchTodayCorpus, type TodayCorpus } from '@/lib/api/market';
import { listCustomPacks, renameCustomPack, deleteCustomPack, type CustomCorpusPack } from '@/lib/corpus/customCorpus';
import { useCorpusStore } from '@/store/corpusStore';
import { toast } from '@/store/toastStore';
import type { CorpusFragment } from '@/types/corpus';
import {
  Search,
  Download,
  Upload,
  Trash2,
  Pencil,
  Sparkles,
  Newspaper,
  PackageOpen,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';

/* ===== 分类筛选 ===== */

const CATEGORY_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'classical', label: '古典诗词' },
  { id: 'modern', label: '现代文学' },
  { id: 'idiom', label: '成语熟语' },
  { id: 'daily', label: '日常语料' },
] as const;

type FilterId = (typeof CATEGORY_FILTERS)[number]['id'];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/* ===== 详情弹窗 ===== */

interface ViewPack {
  name: string;
  description?: string;
  icon: string;
  gradient: string;
  meta: string;
  fragments: CorpusFragment[];
  importable: boolean;
}

function PackDetailDialog({ pack, onClose }: { pack: ViewPack; onClose: () => void }) {
  const importCorpusPack = useCorpusStore((s) => s.importCorpusPack);

  const handleImport = () => {
    importCorpusPack(pack.name, pack.fragments, pack.description);
    toast.success(`已导入语料包「${pack.name}」（${pack.fragments.length} 条碎片）`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg"
            style={{ background: pack.gradient }}
          >
            {pack.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{pack.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{pack.meta}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {pack.description && (
          <p className="border-b bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">{pack.description}</p>
        )}

        {/* 碎片预览 */}
        <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
          <p className="text-[11px] text-muted-foreground">碎片预览 · 共 {pack.fragments.length} 条</p>
          {pack.fragments.map((f) => (
            <div key={f.id} className="rounded-md border px-3 py-2">
              <p className="text-sm">{f.text}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {f.author ? `${f.dynasty ? f.dynasty + ' · ' : ''}${f.author} · ` : ''}
                {f.source}
              </p>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary">
            关闭
          </button>
          {pack.importable && (
            <button
              onClick={handleImport}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              导入到我的语料
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== 卡片 ===== */

function PackCover({ icon, gradient }: { icon: string; gradient: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-t-lg text-4xl" style={{ background: gradient }}>
      {icon}
    </div>
  );
}

/* ===== 页面 ===== */

export default function MarketPage() {
  const importCorpusPack = useCorpusStore((s) => s.importCorpusPack);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [myPacks, setMyPacks] = useState<CustomCorpusPack[]>([]);
  const [today, setToday] = useState<TodayCorpus | null>(null);
  const [todayHint, setTodayHint] = useState('');
  const [todayLoading, setTodayLoading] = useState(true);
  /** 在线语料包；后端不可用时为 null，页面回退到本地预置 */
  const [remotePacks, setRemotePacks] = useState<MarketPack[] | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [viewPack, setViewPack] = useState<ViewPack | null>(null);

  const refreshMyPacks = () => setMyPacks(listCustomPacks());

  const loadToday = () => {
    setTodayLoading(true);
    fetchTodayCorpus().then((res) => {
      setToday(res.ok ? res.data : null);
      setTodayHint(res.ok ? '' : res.message);
      setTodayLoading(false);
    });
  };

  useEffect(() => {
    refreshMyPacks();
    loadToday();
    fetchMarketPacks().then((res) => {
      if (res.ok) setRemotePacks(res.data);
    });
  }, []);

  /** 优先使用后端语料包，未接入时用本地预置 */
  const packs = remotePacks ?? OFFICIAL_MARKET_PACKS;
  const packsOnline = remotePacks !== null;

  const q = query.trim().toLowerCase();

  const filteredOfficial = useMemo(
    () =>
      packs.filter((p) => {
        if (filter !== 'all' && p.category !== filter) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }),
    [packs, filter, q],
  );

  const filteredMyPacks = useMemo(
    () => (q ? myPacks.filter((p) => p.name.toLowerCase().includes(q)) : myPacks),
    [myPacks, q],
  );

  /* ===== 我的语料包操作 ===== */

  const handleExport = (pack: CustomCorpusPack) => {
    const payload = { format: 'clip-poems-pack-v1', ...pack };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出「${pack.name}」`);
  };

  const handleRename = (pack: CustomCorpusPack) => {
    const name = prompt('新的语料包名称：', pack.name);
    if (name === null) return;
    renameCustomPack(pack.id, name);
    refreshMyPacks();
    if (name.trim()) toast.success('已重命名');
  };

  const handleDelete = (pack: CustomCorpusPack) => {
    if (!confirm(`确定删除语料包「${pack.name}」吗？该操作不可恢复。`)) return;
    deleteCustomPack(pack.id);
    refreshMyPacks();
    toast.success('已删除');
  };

  const handleImportOfficial = (pack: MarketPack) => {
    importCorpusPack(pack.name, pack.fragments, pack.description);
    setImportedIds((s) => new Set(s).add(pack.id));
    refreshMyPacks();
    toast.success(`已导入语料包「${pack.name}」（${pack.fragments.length} 条碎片）`);
  };

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        {/* 头部横幅 */}
        <section className="mt-4 overflow-hidden rounded-lg border bg-gradient-to-r from-primary/10 via-transparent to-primary/5 px-5 py-6">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            语料市场
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            发现精选语料包与每日爬取的新鲜语料，一键导入本地，供拼贴创作随时取用
          </p>
        </section>

        {/* 搜索 + 分类筛选 */}
        <section className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索语料包…"
              className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === c.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* 今日语料 */}
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Newspaper className="h-4 w-4 text-primary" />
              今日语料
              {today && (
                <span className="text-[10px] font-normal text-muted-foreground">
                  {today.date} · 来源 {today.source}
                  {today.isMock && '（示例数据）'}
                </span>
              )}
            </h2>
            <button
              onClick={loadToday}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              <RefreshCw className="h-3 w-3" />
              刷新
            </button>
          </div>

          {todayLoading ? (
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-56 shrink-0 animate-pulse rounded-lg bg-secondary/60" />
              ))}
            </div>
          ) : today ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {today.fragments.map((f) => (
                <div
                  key={f.id}
                  className="w-56 shrink-0 rounded-lg border px-3 py-2.5 transition-colors hover:border-primary/50"
                >
                  <p className="text-sm leading-snug">{f.text}</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {f.author ? `${f.author} · ` : ''}
                    {f.source}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* 占位：后端爬取服务未启动时的空状态 */
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center">
              <Newspaper className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">今日语料暂不可用</p>
              <p className="text-[10px] text-muted-foreground/70">
                {todayHint || '需启动 corpus-service 后端爬取服务后，每日自动更新'}
              </p>
            </div>
          )}
        </section>

        {/* 官方精选语料包 */}
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <PackageOpen className="h-4 w-4 text-primary" />
            官方精选语料包
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-normal ${
                packsOnline ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {packsOnline ? '在线语料' : '本地预置'}
            </span>
          </h2>
          {filteredOfficial.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
              没有符合条件的语料包
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredOfficial.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
                  <PackCover icon={p.icon} gradient={p.gradient} />
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="truncate text-sm font-medium">{p.name}</h3>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{p.fragments.length} 条</span>
                    </div>
                    <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-4 text-muted-foreground">
                      {p.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {p.author} · {p.downloads} 次使用
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setViewPack({
                              name: p.name,
                              description: p.description,
                              icon: p.icon,
                              gradient: p.gradient,
                              meta: `官方精选 · ${p.fragments.length} 条碎片`,
                              fragments: p.fragments,
                              importable: true,
                            })
                          }
                          className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary"
                        >
                          预览
                        </button>
                        <button
                          onClick={() => handleImportOfficial(p)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
                            importedIds.has(p.id)
                              ? 'border border-primary/40 text-primary'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {importedIds.has(p.id) ? (
                            <>
                              <Check className="h-3 w-3" />
                              已导入
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" />
                              导入
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 我的语料包 */}
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Upload className="h-4 w-4 text-primary" />
            我的语料包
            <span className="text-[10px] font-normal text-muted-foreground">本地保存 · {myPacks.length} 个</span>
          </h2>
          {filteredMyPacks.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
              还没有本地语料包，可在上方导入，或到语料库导入自定义语料
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredMyPacks.map((p) => (
                <div key={p.id} className="rounded-lg border p-3 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="truncate text-sm font-medium">{p.name}</h3>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{p.fragments.length} 条</span>
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{p.description}</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground/70">更新于 {formatDate(p.updatedAt)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setViewPack({
                          name: p.name,
                          description: p.description,
                          icon: '📦',
                          gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                          meta: `我的语料包 · ${p.fragments.length} 条碎片`,
                          fragments: p.fragments,
                          importable: false,
                        })
                      }
                      className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      查看碎片
                    </button>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => handleExport(p)}
                        title="导出 JSON"
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRename(p)}
                        title="重命名"
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        title="删除"
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 占位：社区共建板块（第二步在线功能，暂无内容） */}
        <section className="mt-6">
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-10 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">社区语料分享（占位）</p>
            <p className="text-[10px] text-muted-foreground/70">
              用户系统上线后开放：上传分享 · 点赞收藏 · 社区排行榜
            </p>
          </div>
        </section>
      </main>

      {viewPack && <PackDetailDialog pack={viewPack} onClose={() => setViewPack(null)} />}
    </>
  );
}
