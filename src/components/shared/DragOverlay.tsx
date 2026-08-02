'use client';

import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';

/**
 * 拖拽覆盖层 — 在拖拽过程中显示浮动的碎片副本
 */
interface DragOverlayContentProps {
  /** 拖拽数据的类型 */
  type?: string;
  /** 显示的文本内容 */
  text?: string;
  /** 是否当前有拖拽 */
  isDragging: boolean;
}

export default function DragOverlayContent({ type, text, isDragging }: DragOverlayContentProps) {
  if (!isDragging) return null;

  return (
    <DndDragOverlay>
      <div
        className="flex items-center justify-center rounded-md border bg-card px-4 py-2 shadow-xl"
        style={{
          width: 'auto',
          minWidth: 80,
          maxWidth: 200,
          background: type === 'corpus-fragment' ? '#f5f0e8' : undefined,
          transform: 'rotate(-2deg)',
        }}
      >
        <span className="truncate text-sm font-medium">
          {text || '拖拽中...'}
        </span>
      </div>
    </DndDragOverlay>
  );
}