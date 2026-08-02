'use client';

import { useCorpusStore } from '@/store/corpusStore';
import { useCanvasStore } from '@/store/canvasStore';
import { X, Trash2, Copy, Send } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

/** 单个可选中的碎片的可拖拽包装 */
function DraggableWordItem({ fragment }: { fragment: { id: string; text: string; author?: string } }) {
  const removeFragment = useCorpusStore((s) => s.removeFragment);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `corpus-${fragment.id}`,
    data: {
      type: 'corpus-fragment',
      fragment: {
        text: fragment.text,
        source: fragment.author || '',
        author: fragment.author,
      },
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group relative flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 pr-7 transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-sm'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="max-w-[160px] truncate text-xs">
        {fragment.text}
      </span>
      {fragment.author && (
        <span className="hidden text-[10px] text-muted-foreground group-hover:inline">
          {fragment.author}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFragment(fragment.id);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function WordSelector() {
  const { selectedFragments, clearSelection } = useCorpusStore();
  const addFragmentsFromCorpus = useCanvasStore((s) => s.addFragmentsFromCorpus);

  if (selectedFragments.length === 0) return null;

  const handleSendToCanvas = () => {
    addFragmentsFromCorpus(
      selectedFragments.map((f) => ({
        text: f.text,
        source: f.source,
        author: f.author,
      })),
    );
  };

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
            {/* 发送到画布按钮 */}
            <button
              onClick={handleSendToCanvas}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              title="发送选中碎片到画布"
            >
              <Send className="h-3 w-3" />
              发送到画布
            </button>
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

        {/* 碎片列表（横向滚动，可拖拽） */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {selectedFragments.map((fragment) => (
            <DraggableWordItem key={fragment.id} fragment={fragment} />
          ))}
        </div>
      </div>
    </div>
  );
}