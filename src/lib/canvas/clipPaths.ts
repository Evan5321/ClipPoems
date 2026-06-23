/**
 * 撕裂边缘生成算法
 * 在矩形的四条边上随机采样生成不规则多边形，模拟纸张撕裂效果
 */

interface TornEdgeOptions {
  width: number;
  height: number;
  /** 不规则度 0~1，越大边缘越不规则 */
  roughness?: number;
  /** 每条边的分段数，越大越精细 */
  segments?: number;
  /** 随机种子（可选，用于可复现的结果） */
  seed?: number;
}

/** 简易伪随机数生成器（用于可复现结果） */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 生成一个随机偏移量 */
function randomOffset(maxOffset: number, rand: () => number): number {
  return (rand() - 0.5) * 2 * maxOffset;
}

/**
 * 生成撕裂边缘的 clip-path polygon 点集
 * 返回格式为 CSS polygon() 可用的字符串
 */
export function generateTornEdge(options: TornEdgeOptions): string {
  const {
    width,
    height,
    roughness = 0.12,
    segments = 6,
    seed,
  } = options;

  const rand = seed !== undefined ? seededRandom(seed) : Math.random;
  const maxOffsetX = width * roughness;
  const maxOffsetY = height * roughness;
  const points: [number, number][] = [];

  // 上边缘（从左到右）
  for (let i = 0; i <= segments; i++) {
    const x = (width * i) / segments;
    const y = randomOffset(maxOffsetY * 0.4, rand);
    // 避免开始的点偏移太大
    const finalY = (i === 0 || i === segments) ? 0 : y;
    points.push([x, finalY]);
  }

  // 右边缘（从上到下，不含起点）
  for (let i = 1; i <= segments; i++) {
    const y = (height * i) / segments;
    const x = width + randomOffset(maxOffsetX * 0.4, rand);
    points.push([x, y]);
  }

  // 下边缘（从右到左）
  for (let i = segments - 1; i >= 0; i--) {
    const x = (width * i) / segments;
    const y = height + randomOffset(maxOffsetY * 0.4, rand);
    const finalY = i === 0 ? height : y;
    points.push([x, finalY]);
  }

  // 左边缘（从下到上，不含起点和终点）
  for (let i = segments - 1; i >= 1; i--) {
    const y = (height * i) / segments;
    const x = randomOffset(maxOffsetX * 0.4, rand);
    points.push([x, y]);
  }

  return points.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ');
}

/**
 * 生成多个不同的撕裂边缘（用于批量生成）
 */
export function generateTornEdges(
  count: number,
  options: Omit<TornEdgeOptions, 'seed'>,
): string[] {
  return Array.from({ length: count }, (_, i) =>
    generateTornEdge({ ...options, seed: i + 1 }),
  );
}
