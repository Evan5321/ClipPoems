import type { CanvasFragment } from '@/types/canvas';

/** 轴对齐矩形边界 */
export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Size {
  width: number;
  height: number;
}

/** 默认内边距（与 CanvasFragment 的 8px 12px 内边距保持一致） */
const PADDING_X = 16;
const PADDING_Y = 16;

/**
 * 根据文本和字号估算碎片尺寸（中文近似等宽，默认单行显示）
 */
export function estimateFragmentSize(text: string, fontSize: number): Size {
  const charWidth = fontSize * 1.05;
  const lines = text.split('\n');
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  return {
    width: Math.max(24, Math.round(maxLineLen * charWidth + PADDING_X * 2)),
    height: Math.max(24, Math.round(lines.length * (fontSize * 1.4) + PADDING_Y * 2)),
  };
}

/** 获取碎片实际尺寸（优先使用持久化的 width/height） */
export function getFragmentSize(fragment: CanvasFragment): Size {
  const fontSize = fragment.style?.fontSize || 24;
  const estimated = estimateFragmentSize(fragment.text, fontSize);
  return {
    width: fragment.width || estimated.width,
    height: fragment.height || estimated.height,
  };
}

/** 获取碎片轴对齐边界（忽略旋转，用于对齐/吸附判断） */
export function getFragmentBounds(fragment: CanvasFragment): Bounds {
  const { width, height } = getFragmentSize(fragment);
  const left = fragment.position.x;
  const top = fragment.position.y;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

/** 将角度归一化到 (-180, 180] */
export function normalizeRotation(deg: number): number {
  let next = deg % 360;
  if (next > 180) next -= 360;
  if (next <= -180) next += 360;
  return Number(next.toFixed(2));
}

/** 判断点是否落在碎片边界内（忽略旋转） */
export function pointInFragment(point: { x: number; y: number }, fragment: CanvasFragment): boolean {
  const b = getFragmentBounds(fragment);
  return point.x >= b.left && point.x <= b.right && point.y >= b.top && point.y <= b.bottom;
}

/** 计算一组碎片的外接矩形 */
export function unionBounds(fragments: CanvasFragment[]): Bounds | null {
  if (fragments.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const f of fragments) {
    const b = getFragmentBounds(f);
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}
