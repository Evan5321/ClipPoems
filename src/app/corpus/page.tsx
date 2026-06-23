import CorpusPanel from '@/components/corpus/CorpusPanel';

export default function CorpusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 页面头部 */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">语料库管理</h1>
            <p className="text-xs text-muted-foreground">
              浏览、搜索和选取语料碎片，用于拼贴创作
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← 返回首页
          </a>
        </div>
      </header>

      {/* 主体：语料面板 */}
      <main className="flex-1">
        <CorpusPanel />
      </main>
    </div>
  );
}
