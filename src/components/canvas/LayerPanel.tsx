'use client';

import { useCanvasStore } from '@/store/canvasStore';
import { Eye, EyeOff, Lock, Unlock, BringToFront, SendToBack, Trash2 } from 'lucide-react';

/**
 * 图层管理面板 — 显示画布上的碎片列表，支持选择、隐藏、锁定、层级操作
 */
export default function LayerPanel() {
  const fragments = useCanvasStore((s) => s.fragments);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const selectFragment = useCanvasStore((s) => s.selectFragment);
  const removeFragment = useCanvasStore((s) => s.removeFragment);
  const updateFragment = useCanvasStore((s) => s.updateFragment);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);

  // Sort by zIndex descending (top layer first)
  const sorted = [...fragments].sort((a, b) => b.zIndex - a.zIndex);

  if (fragments.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        画布为空，添加碎片以管理图层
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {sorted.map((fragment, index) => {
        const isSelected = selectedIds.includes(fragment.id);
        const preview = fragment.text.length > 20
          ? fragment.text.slice(0, 20) + '...'
          : fragment.text;

        return (
          <div
            key={fragment.id}
            className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer ${
              isSelected
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'hover:bg-secondary/60 text-secondary-foreground'
            }`}
            onClick={() => selectFragment(fragment.id)}
          >
            {/* Layer index */}
            <span className="w-4 text-[10px] tabular-nums text-muted-foreground/60">
              {sorted.length - index}
            </span>

            {/* Preview text */}
            <span className="flex-1 truncate">{preview}</span>

            {/* Actions (shown on hover or when selected) */}
            <div className="hidden items-center gap-0.5 group-hover:flex">
              {/* Lock toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateFragment(fragment.id, { locked: !fragment.locked });
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                title={fragment.locked ? '解锁' : '锁定'}
              >
                {fragment.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </button>

              {/* Bring to front */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  bringToFront(fragment.id);
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                title="置顶"
              >
                <BringToFront className="h-3 w-3" />
              </button>

              {/* Send to back */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendToBack(fragment.id);
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                title="置底"
              >
                <SendToBack className="h-3 w-3" />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFragment(fragment.id);
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                title="删除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}