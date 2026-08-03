'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasBackground } from '@/types/canvas';
import CanvasFragmentComponent from './CanvasFragment';
import DeleteZone from './DeleteZone';
import { AnimatePresence } from 'framer-motion';

interface CanvasProps {
  id?: string;
  className?: string;
}

/** 根据背景配置生成背景层样式 */
function getBackgroundStyle(bg: CanvasBackground): React.CSSProperties {
  switch (bg.type) {
    case 'solid':
      return { backgroundColor: bg.value };
    case 'gradient':
      return { backgroundImage: bg.value };
    case 'image':
      return {
        backgroundImage: `url("${bg.value}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    case 'texture':
      return {
        backgroundImage: `url("${bg.value}")`,
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
      };
    default:
      return { backgroundColor: '#f5f0e8' };
  }
}

export default function Canvas({ id = 'canvas-main', className = '' }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);

  // Canvas droppable on the outer container for reliable collision detection
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-main',
    data: { type: 'canvas' },
  });

  // Store state
  const storeZoom = useCanvasStore((s) => s.zoom);
  const setStoreZoom = useCanvasStore((s) => s.setZoom);
  const canvasSize = useCanvasStore((s) => s.canvasSize);
  const background = useCanvasStore((s) => s.background);
  const grid = useCanvasStore((s) => s.grid);
  const fitSignal = useCanvasStore((s) => s.fitSignal);
  const fragments = useCanvasStore((s) => s.fragments);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const selectFragment = useCanvasStore((s) => s.selectFragment);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const updateFragment = useCanvasStore((s) => s.updateFragment);

  // Zoom & pan state (synced with store for delta compensation)
  const [zoom, setZoom] = useState(storeZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 同步 store zoom → 本地（供面板等外部设置缩放）
  useEffect(() => {
    setZoom((prev) => (Math.abs(prev - storeZoom) > 0.001 ? storeZoom : prev));
  }, [storeZoom]);

  /** 适配屏幕：根据容器尺寸计算缩放，留 10% 边距 */
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;
    const padding = 0.9; // 留 10% 边距
    const scaleX = (cw * padding) / canvasSize.width;
    const scaleY = (ch * padding) / canvasSize.height;
    const z = Math.min(scaleX, scaleY);
    const clamped = Math.max(0.1, Math.min(3, z));
    setZoom(clamped);
    setStoreZoom(clamped);
    setPan({ x: 0, y: 0 });
  }, [canvasSize.width, canvasSize.height, setStoreZoom]);

  // 监听 fitSignal 触发适配
  useEffect(() => {
    if (fitSignal > 0) {
      // 下一帧确保容器尺寸已更新
      requestAnimationFrame(fitToScreen);
    }
  }, [fitSignal, fitToScreen]);

  // 首次挂载自动适配一次
  useEffect(() => {
    requestAnimationFrame(fitToScreen);
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll zoom (Ctrl + wheel)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((prev) => {
          const z = Math.max(0.1, Math.min(3, prev + delta));
          setStoreZoom(z);
          return z;
        });
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    },
    [setStoreZoom],
  );

  // Panning with middle mouse or left click on canvas background only
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isFragment = target.closest('[data-fragment-id]');
    if (isFragment) return;

    const isCanvasBg = target === canvasContentRef.current || target.closest('[data-canvas-bg]');
    if (e.button === 1 || (e.button === 0 && isCanvasBg)) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Click on canvas background clears selection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === canvasContentRef.current || target.closest('[data-canvas-bg]')) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // 缩放预设快捷设置
  const applyZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(0.1, Math.min(3, z));
      setZoom(clamped);
      setStoreZoom(clamped);
      setPan({ x: 0, y: 0 });
    },
    [setStoreZoom],
  );

  // 合并 containerRef 与 dnd-kit setNodeRef（稳定引用，避免每次渲染重置 ref）
  const setMergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  // Grid SVG pattern
  const gridPattern = grid.enabled ? (
    <defs>
      <pattern
        id="canvas-grid"
        width={grid.spacing}
        height={grid.spacing}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${grid.spacing} 0 L 0 0 0 ${grid.spacing}`}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
  ) : null;

  const showDropIndicator = isOver;

  return (
    <div
      ref={setMergedRef}
      className={`relative h-full w-full overflow-hidden bg-[#e8e0d5] ${className}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1 rounded-lg border bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => { const nz = Math.max(0.1, z - 0.1); setStoreZoom(nz); return nz; }); }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="缩小"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => { const nz = Math.min(3, z + 0.1); setStoreZoom(nz); return nz; }); }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="放大"
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); applyZoom(1); }}
          className="ml-1 rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="100% 实际大小"
        >
          1:1
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); fitToScreen(); }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="适配屏幕"
        >
          ⤢
        </button>
      </div>

      {/* Canvas content (inner, with zoom/pan transform) */}
      <div
        ref={canvasContentRef}
        data-canvas-bg
        data-canvas-export
        className="absolute"
        style={{
          left: `calc(50% + ${pan.x}px)`,
          top: `calc(50% + ${pan.y}px)`,
          transform: `translate(-50%, -50%) scale(${zoom})`,
          transformOrigin: 'center center',
          width: canvasSize.width,
          height: canvasSize.height,
          boxShadow: '0 2px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
          cursor: 'default',
          overflow: 'hidden',
        }}
      >
        {/* 背景层（独立 opacity，不影响碎片） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            ...getBackgroundStyle(background),
            opacity: background.opacity,
          }}
        />

        {/* Grid overlay */}
        {grid.enabled && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            {gridPattern}
            <rect width="100%" height="100%" fill="url(#canvas-grid)" />
          </svg>
        )}

        {/* Drop zone hint */}
        {showDropIndicator && (
          <div
            className="pointer-events-none absolute inset-0 z-40 rounded-sm"
            style={{
              border: '2px dashed rgba(59, 130, 246, 0.4)',
              backgroundColor: 'rgba(59, 130, 246, 0.04)',
            }}
          />
        )}

        {/* Render fragments sorted by zIndex */}
        <AnimatePresence>
          {[...fragments]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((fragment) => (
              <CanvasFragmentComponent
                key={fragment.id}
                fragment={fragment}
                isSelected={selectedIds.includes(fragment.id)}
                onSelect={() => selectFragment(fragment.id)}
                onUpdate={(updates) => updateFragment(fragment.id, updates)}
                canvasZoom={zoom}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* Delete zone at bottom */}
      <DeleteZone />
    </div>
  );
}
