import type { CanvasFragment } from '@/types/canvas';
import { getFragmentBounds, type Bounds } from '@/lib/canvas/geometry';

/**
 * 对齐辅助线检测
 *
 * 当活动碎片的左/中/右（上/中/下）边界与其他碎片或画布边界的距离
 * 小于 threshold 时，返回对齐线位置与吸附偏移量。
 */

export interface AlignmentGuide {
  /** 对齐线方向：vertical 表示一条竖线，horizontal 表示一条横线 */
  orientation: 'horizontal' | 'vertical';
  /** 对齐线位置（画布坐标 px） */
  position: number;
  /** 对齐类型 */
  type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  /** 对齐对象：其他碎片或画布 */
  source: 'fragment' | 'canvas';
}

export interface AlignmentResult {
  guides: AlignmentGuide[];
  /** 让活动碎片的边界吸附到对齐线所需的偏移量 */
  offsetX: number;
  offsetY: number;
}

const THRESHOLD = 6; // 对齐检测阈值（px）

interface Candidate {
  position: number;
  type: AlignmentGuide['type'];
  source: AlignmentGuide['source'];
}

/**
 * 检测活动碎片与其他碎片 / 画布的对齐关系
 */
export function detectAlignment(
  active: Bounds,
  others: CanvasFragment[],
  canvasSize?: { width: number; height: number },
  threshold: number = THRESHOLD,
): AlignmentResult {
  const verticalCandidates: Candidate[] = [];
  const horizontalCandidates: Candidate[] = [];

  for (const other of others) {
    const b = getFragmentBounds(other);
    verticalCandidates.push(
      { position: b.left, type: 'left', source: 'fragment' },
      { position: b.centerX, type: 'center', source: 'fragment' },
      { position: b.right, type: 'right', source: 'fragment' },
    );
    horizontalCandidates.push(
      { position: b.top, type: 'top', source: 'fragment' },
      { position: b.centerY, type: 'middle', source: 'fragment' },
      { position: b.bottom, type: 'bottom', source: 'fragment' },
    );
  }

  if (canvasSize) {
    verticalCandidates.push(
      { position: 0, type: 'left', source: 'canvas' },
      { position: canvasSize.width / 2, type: 'center', source: 'canvas' },
      { position: canvasSize.width, type: 'right', source: 'canvas' },
    );
    horizontalCandidates.push(
      { position: 0, type: 'top', source: 'canvas' },
      { position: canvasSize.height / 2, type: 'middle', source: 'canvas' },
      { position: canvasSize.height, type: 'bottom', source: 'canvas' },
    );
  }

  const activeX: { value: number; type: AlignmentGuide['type'] }[] = [
    { value: active.left, type: 'left' },
    { value: active.centerX, type: 'center' },
    { value: active.right, type: 'right' },
  ];
  const activeY: { value: number; type: AlignmentGuide['type'] }[] = [
    { value: active.top, type: 'top' },
    { value: active.centerY, type: 'middle' },
    { value: active.bottom, type: 'bottom' },
  ];

  const guides: AlignmentGuide[] = [];
  let bestX = threshold + 1;
  let offsetX = 0;
  let bestY = threshold + 1;
  let offsetY = 0;
  const seenVertical = new Set<number>();
  const seenHorizontal = new Set<number>();

  for (const anchor of activeX) {
    for (const candidate of verticalCandidates) {
      const delta = candidate.position - anchor.value;
      if (Math.abs(delta) <= threshold) {
        if (Math.abs(delta) < bestX) {
          bestX = Math.abs(delta);
          offsetX = delta;
        }
        const key = Math.round(candidate.position * 2) / 2;
        if (!seenVertical.has(key)) {
          seenVertical.add(key);
          guides.push({
            orientation: 'vertical',
            position: candidate.position,
            type: candidate.type,
            source: candidate.source,
          });
        }
      }
    }
  }

  for (const anchor of activeY) {
    for (const candidate of horizontalCandidates) {
      const delta = candidate.position - anchor.value;
      if (Math.abs(delta) <= threshold) {
        if (Math.abs(delta) < bestY) {
          bestY = Math.abs(delta);
          offsetY = delta;
        }
        const key = Math.round(candidate.position * 2) / 2;
        if (!seenHorizontal.has(key)) {
          seenHorizontal.add(key);
          guides.push({
            orientation: 'horizontal',
            position: candidate.position,
            type: candidate.type,
            source: candidate.source,
          });
        }
      }
    }
  }

  return {
    guides,
    offsetX: bestX <= threshold ? offsetX : 0,
    offsetY: bestY <= threshold ? offsetY : 0,
  };
}

/**
 * 兼容旧接口：仅返回对齐线
 */
export function detectAlignmentGuides(
  activeFragment: CanvasFragment,
  otherFragments: CanvasFragment[],
): AlignmentGuide[] {
  return detectAlignment(
    getFragmentBounds(activeFragment),
    otherFragments.filter((f) => f.id !== activeFragment.id),
  ).guides;
}

/**
 * 兼容旧接口：返回吸附后的位置
 */
export function snapToAlignment(
  fragment: CanvasFragment,
  otherFragments: CanvasFragment[],
  threshold: number = THRESHOLD,
): { x: number; y: number } {
  const result = detectAlignment(
    getFragmentBounds(fragment),
    otherFragments.filter((f) => f.id !== fragment.id),
    undefined,
    threshold,
  );
  return {
    x: Math.round(fragment.position.x + result.offsetX),
    y: Math.round(fragment.position.y + result.offsetY),
  };
}

/** 将坐标吸附到网格 */
export function snapToGrid(value: number, spacing: number): number {
  if (!spacing || spacing <= 0) return value;
  return Math.round(value / spacing) * spacing;
}
