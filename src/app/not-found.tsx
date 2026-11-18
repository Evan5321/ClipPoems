import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f0e8] px-6 text-center">
      <div className="text-4xl">🍂</div>
      <h1 className="text-xl font-semibold">这一页像纸片一样飘走了</h1>
      <p className="text-sm text-muted-foreground">你访问的页面不存在，或者已经被删除。</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        回到首页
      </Link>
    </main>
  );
}
