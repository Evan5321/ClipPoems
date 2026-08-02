'use client';

/**
 * 撕裂边缘渲染组件
 * 使用 SVG clipPath 渲染不规则边缘
 */

interface FragmentTornEdgeProps {
  /** Fragment width */
  width: number;
  /** Fragment height */
  height: number;
  /** CSS clip-path polygon value (from generateTornEdge) */
  clipPath?: string;
  /** Unique ID for the clipPath reference */
  clipPathId: string;
  /** Children to clip */
  children: React.ReactNode;
}

export default function FragmentTornEdge({
  width,
  height,
  clipPath,
  clipPathId,
  children,
}: FragmentTornEdgeProps) {
  // If no clipPath provided, render children directly
  if (!clipPath) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        width,
        height,
        clipPath: `polygon(${clipPath})`,
        WebkitClipPath: `polygon(${clipPath})`,
      }}
    >
      {children}
    </div>
  );
}