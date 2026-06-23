import type { CanvasFragment } from '@/types/canvas';

/**
 * 对齐辅助线检测
 * 当碎片边界间距小于 threshold 时，返回对齐线位置
 */

export interface AlignmentGuide {
  /** 对齐线方向 */
  orientation: 'horizontal' | 'vertical';
  /** 对齐线位置（px） */
  position: number;
  /** 对齐类型 */
  type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
}

interface FragmentBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function getBounds(fragment: CanvasFragment): FragmentBounds {
  const { position, style } = fragment;
  // 假设每字约 24px 宽
  const charWidth = style?.fontSize || 24;
  const textWidth = fragment.text.length * charWidth;
  const textHeight = (style?.fontSize || 24) * (style?.lineHeight || 1.5);

  return {
    id: fragment.id,
    left: position.x,
    right: position.x + textWidth,
    top: position.y,
    bottom: position.y + textHeight,
    centerX: position.x + textWidth / 2,
    centerY: position.y + textHeight / 2,
  };
}

const THRESHOLD = 6; // 对齐检测阈值（px）

/**
 * 检测活动碎片与其他碎片的对齐线
 */
export function detectAlignmentGuides(
  activeFragment: CanvasFragment,
  otherFragments: CanvasFragment[],
): AlignmentGuide[] {
  const active = getBounds(activeFragment);
  const guides: AlignmentGuide[] = [];

  for (const other of otherFragments) {
    if (other.id === activeFragment.id) continue;
    const target = getBounds(other);

    // 垂直对齐（左/中/右）
    checkAlignment(active.left, target.left, 'vertical', 'left', guides);
    checkAlignment(active.centerX, target.centerX, 'vertical', 'center', guides);
    checkAlignment(active.right, target.right, 'vertical', 'right', guides);

    // 水平对齐（上/中/下）
    checkAlignment(active.top, target.top, 'horizontal', 'top', guides);
    checkAlignment(active.centerY, target.centerY, 'horizontal', 'middle', guides);
    checkAlignment(active.bottom, target.bottom, 'horizontal', 'bottom', guides);
  }

  return guides;
}

function checkAlignment(
  a: number,
  b: number,
  orientation: 'horizontal' | 'vertical',
  type: AlignmentGuide['type'],
  guides: AlignmentGuide[],
) {
  if (Math.abs(a - b) <= THRESHOLD) {
    guides.push({ orientation, position: b, type });
  }
}

/**
 * 吸附到最近的对齐线
 */
export function snapToAlignment(
  fragment: CanvasFragment,
  otherFragments: CanvasFragment[],
  threshold: number = THRESHOLD,
): { x: number; y: number } {
  const bounds = getBounds(fragment);
  let snapX = bounds.left;
  let snapY = bounds.top;
  let minDistX = threshold;
  let minDistY = threshold;

  for (const other of otherFragments) {
    if (other.id === fragment.id) continue;
    const target = getBounds(other);

    // 垂直吸附点：左对齐、中对齐、右对齐
    const xTargets = [
      { pos: target.left, type: 'left' },
      { pos: target.centerX, type: 'center' },
      { pos: target.right, type: 'right' },
    ];
    for (const { pos } of xTargets) {
      const dist = Math.abs(bounds.left - pos);
      if (dist < minDistX) {
        minDistX = dist;
        snapX = pos;
      }
    }

    // 水平吸附点：上对齐、中对齐、下对齐
    const yTargets = [
      { pos: target.top, type: 'top' },
      { pos: target.centerY, type: 'middle' },
      { pos: target.bottom, type: 'bottom' },
    ];
    for (const { pos } of yTargets) {
      const dist = Math.abs(bounds.top - pos);
      if (dist < minDistY) {
        minDistY = dist;
        snapY = pos;
      }
    }
  }

  return {
    x: minDistX < threshold ? snapX : fragment.position.x,
    y: minDistY < threshold ? snapY : fragment.position.y,
  };
}
