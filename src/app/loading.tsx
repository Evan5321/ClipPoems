export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f5f0e8]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
      <p className="text-sm text-stone-500">正在准备你的工作台…</p>
    </main>
  );
}
