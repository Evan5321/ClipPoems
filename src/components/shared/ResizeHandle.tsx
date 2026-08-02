'use client';

import { usePanelResize } from '@/hooks/usePanelResize';

interface ResizeHandleProps {
  /**
   * 方向：
   * - 'right' — 放在面板右侧边缘（左侧面板用）
   * - 'left'  — 放在面板左侧边缘（右侧面板用）
   */
  edge: 'left' | 'right';
  /** 当前面板宽度 */
  currentWidth: number;
  /** 宽度调整回调 */
  onResize: (width: number) => void;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
}

/**
 * 面板边缘拖拽手柄
 *
 * 渲染一个 6px 宽的窄条，悬停时 `cursor-col-resize`，
 * 拖拽中高亮显示蓝色指示条。
 */
export default function ResizeHandle({
  edge,
  currentWidth,
  onResize,
  minWidth = 180,
  maxWidth = 500,
}: ResizeHandleProps) {
  // direction 与 edge 相反：
  //   面板右侧边缘 → 向右拖拽放大 → direction: 'right'
  //   面板左侧边缘 → 向左拖拽放大 → direction: 'left'
  const { handleProps, isResizing } = usePanelResize({
    direction: edge,
    minWidth,
    maxWidth,
    currentWidth,
    onResize,
  });

  return (
    <div
      className={`group absolute top-0 z-30 ${
        edge === 'right'
          ? 'right-0 translate-x-1/2'
          : 'left-0 -translate-x-1/2'
      }`}
      style={{
        // 可视条 6px，pointer 热区扩大到 14px
        width: 14,
        height: '100%',
        cursor: 'col-resize',
        // 居中放置可视条
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      {...handleProps}
    >
      {/* 可视窄条 */}
      <div
        className={`h-full w-[3px] rounded-full transition-all duration-150 ${
          isResizing
            ? 'bg-primary/60 w-[5px]'
            : 'bg-transparent group-hover:bg-border/80'
        }`}
      />
    </div>
  );
}