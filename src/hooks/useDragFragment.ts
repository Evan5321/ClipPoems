'use client';

import { useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasFragment } from '@/types/canvas';

interface UseDragFragmentOptions {
  /** 画布容器 ref */
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  /** 拖拽结束回调 */
  onDragEnd?: (fragmentId: string, position: { x: number; y: number }) => void;
}

/**
 * 碎片拖拽逻辑钩子
 */
export function useDragFragment({ canvasRef, onDragEnd }: UseDragFragmentOptions = {}) {
  const [addFragment, updateFragment] = useCanvasStore((s) => [s.addFragment, s.updateFragment]);
  const activeId = useRef<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 以上才触发拖拽，避免点击误触
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    activeId.current = event.active.id;
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active && over) {
        // 计算相对于画布的位置
        const canvasEl = canvasRef?.current;
        let x = 0;
        let y = 0;

        if (canvasEl) {
          const rect = canvasEl.getBoundingClientRect();
          const activeRect = active.rect.current;
          if (activeRect) {
            x = activeRect.initial?.left
              ? activeRect.initial.left - rect.left
              : 0;
            y = activeRect.initial?.top
              ? activeRect.initial.top - rect.top
              : 0;
          }
        }

        const fragmentId = String(active.id);

        if (onDragEnd) {
          onDragEnd(fragmentId, { x, y });
        }
      }

      activeId.current = null;
    },
    [canvasRef, onDragEnd],
  );

  const dndContextProps = {
    sensors,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  };

  return {
    dndContextProps,
    activeId: activeId.current,
    DragOverlay,
  };
}
