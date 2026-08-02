'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePanelResizeOptions {
  /** 拖拽方向：left = 拖拽左侧边缘（右侧面板用），right = 拖拽右侧边缘（左侧面板用） */
  direction: 'left' | 'right';
  /** 最小宽度 (px) */
  minWidth?: number;
  /** 最大宽度 (px) */
  maxWidth?: number;
  /** 当前面板宽度 (px) — 拖拽开始时读取 */
  currentWidth: number;
  /** 宽度变化回调 */
  onResize: (width: number) => void;
}

interface UsePanelResizeReturn {
  handleProps: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  isResizing: boolean;
}

/**
 * 面板拖拽调整宽度 hook
 *
 * direction 说明：
 * - 'right' — 手柄在面板右侧，向右拖拽放大（左面板用）
 * - 'left'  — 手柄在面板左侧，向左拖拽放大（右面板用）
 */
export function usePanelResize({
  direction,
  minWidth = 180,
  maxWidth = 500,
  currentWidth,
  onResize,
}: UsePanelResizeOptions): UsePanelResizeReturn {
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, width: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      startRef.current = { x: e.clientX, width: currentWidth };
      setIsResizing(true);
    },
    [currentWidth],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isResizing) return;
      const { x: startX, width: startWidth } = startRef.current;
      const dx = e.clientX - startX;

      // 'right' → 鼠标右移(dx>0) → 面板变宽
      // 'left'  → 鼠标右移(dx>0) → 面板变窄（handle 在面板左边缘）
      const delta = direction === 'right' ? dx : -dx;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));

      onResize(newWidth);
    },
    [isResizing, direction, minWidth, maxWidth, onResize],
  );

  const handlePointerUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 全局监听确保指针移出手柄不中断
  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, handlePointerMove, handlePointerUp]);

  return {
    handleProps: { onPointerDown: handlePointerDown },
    isResizing,
  };
}