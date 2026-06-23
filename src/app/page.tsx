'use client';

import { useCorpusStore } from '@/store/corpusStore';
import { CORPUS_CATEGORIES } from '@/lib/corpus/loader';

export default function HomePage() {
  const { isLoaded, isLoading, fragmentsByCategory } = useCorpusStore();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <h1 className="text-5xl font-bold tracking-tight">ClipPoems</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          拼贴诗歌创作工具
        </p>
      </section>

      {/* 语料库状态 */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold">📚 语料库</h2>

        {isLoading && (
          <div className="flex items-center gap-3 rounded-lg border p-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">正在加载语料数据...</p>
          </div>
        )}

        {isLoaded && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CORPUS_CATEGORIES.map((cat) => {
              const fragments = fragmentsByCategory[cat.id];
              const count = fragments?.length || 0;
              return (
                <div
                  key={cat.id}
                  className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 text-2xl">{cat.icon}</div>
                  <h3 className="font-semibold">{cat.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cat.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {count > 0 ? `${count} 个碎片` : '暂无数据'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 快速入口 */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <h2 className="mb-6 text-2xl font-semibold">🚀 快速开始</h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="/corpus"
            className="rounded-lg border bg-card px-6 py-4 text-card-foreground shadow-sm transition hover:shadow-md"
          >
            <div className="font-medium">浏览语料库</div>
            <div className="mt-1 text-sm text-muted-foreground">
              浏览所有可用语料
            </div>
          </a>
          <a
            href="/editor/new"
            className="rounded-lg border bg-card px-6 py-4 text-card-foreground shadow-sm transition hover:shadow-md"
          >
            <div className="font-medium">新建作品</div>
            <div className="mt-1 text-sm text-muted-foreground">
              开始拼贴创作
            </div>
          </a>
          <a
            href="/gallery"
            className="rounded-lg border bg-card px-6 py-4 text-card-foreground shadow-sm transition hover:shadow-md"
          >
            <div className="font-medium">作品画廊</div>
            <div className="mt-1 text-sm text-muted-foreground">
              查看已保存作品
            </div>
          </a>
        </div>
      </section>
    </main>
  );
}