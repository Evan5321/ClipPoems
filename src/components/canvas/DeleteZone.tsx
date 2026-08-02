'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

/**
 * 拖拽删除区 — 将碎片拖到这里删除
 */
export default function DeleteZone() {
  const [isOver, setIsOver] = useState(false);

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: 'delete-zone',
    data: {
      type: 'delete-zone',
      accept: ['corpus-fragment', 'canvas-fragment'],
    },
  });

  // Track hover state visual
  const active = isDroppableOver;

  return (
    <div
      ref={setNodeRef}
      className={`absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 border-t transition-all duration-200 ${
        active
          ? 'h-20 border-destructive/30 bg-destructive/10'
          : 'h-12 border-transparent bg-transparent'
      }`}
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
    >
      <Trash2
        className={`transition-all duration-200 ${
          active
            ? 'h-6 w-6 text-destructive scale-110'
            : 'h-4 w-4 text-muted-foreground/40'
        }`}
      />
      <span
        className={`text-sm transition-all duration-200 ${
          active
            ? 'text-destructive font-medium'
            : 'text-muted-foreground/40'
        }`}
      >
        {active ? '松开删除' : '拖拽到此处删除'}
      </span>
    </div>
  );
}