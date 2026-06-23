'use client';

import { useCorpusStore } from '@/store/corpusStore';
import { X, Trash2, Copy } from 'lucide-react';

export default function WordSelector() {
  const { selectedFragments, removeFragment, clearSelection } = useCorpusStore();

  if (selectedFragments.length === 0) return null;

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 py-2">
        {/* 顶栏：标题 + 操作按钮 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              已选中碎片
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {selectedFragments.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const text = selectedFragments.map((f) => f.text).join(' ');
                navigator.clipboard.writeText(text);
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
              title="复制所有文本"
            >
              <Copy className="h-3 w-3" />
              复制
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
              title="清空全部"
            >
              <Trash2 className="h-3 w-3" />
              清空
            </button>
          </div>
        </div>

        {/* 碎片列表（横向滚动） */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {selectedFragments.map((fragment) => (
            <div
              key={fragment.id}
              className="group relative flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 pr-7"
            >
              <span className="max-w-[160px] truncate text-xs">
                {fragment.text}
              </span>
              {/* 来源（hover 显示） */}
              {fragment.author && (
                <span className="hidden text-[10px] text-muted-foreground group-hover:inline">
                  {fragment.author}
                </span>
              )}
              {/* 删除按钮 */}
              <button
                onClick={() => removeFragment(fragment.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
