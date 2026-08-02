'use client';

import { useCallback, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useCanvasStore } from '@/store/canvasStore';
import CanvasFragmentComponent from './CanvasFragment';
import DeleteZone from './DeleteZone';
import { AnimatePresence } from 'framer-motion';

interface CanvasProps {
  id?: string;
  className?: string;
}

export default function Canvas({ id = 'canvas-main', className = '' }: CanvasProps) {
  const canvasContentRef = useRef<HTMLDivElement>(null);

  // Canvas droppable on the outer container for reliable collision detection
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-main',
    data: { type: 'canvas' },
  });

  // Zoom & pan state (synced with store for delta compensation)
  const storeZoom = useCanvasStore((s) => s.zoom);
  const setStoreZoom = useCanvasStore((s) => s.setZoom);
  const setStorePan = useCanvasStore((s) => s.setPanOffset);
  const [zoom, setZoom] = useState(storeZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Store state
  const fragments = useCanvasStore((s) => s.fragments);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const selectFragment = useCanvasStore((s) => s.selectFragment);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const updateFragment = useCanvasStore((s) => s.updateFragment);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Scroll zoom (Ctrl + wheel)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((prev) => {
        const z = Math.max(0.25, Math.min(3, prev + delta));
        setStoreZoom(z);
        return z;
      });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  // Panning with middle mouse or left click on canvas background only
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Only start panning if clicking directly on the canvas background,
    // NOT on a fragment (which has data-fragment-id) or any child of a fragment
    const isFragment = target.closest('[data-fragment-id]');
    if (isFragment) return; // Don't pan when clicking on a fragment

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

  // Grid SVG pattern
  const gridPattern = showGrid ? (
    <defs>
      <pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
      </pattern>
    </defs>
  ) : null;

  // Drop indicator when hovering from corpus drag
  const showDropIndicator = isOver;

  return (
    <div
      ref={setNodeRef}
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
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.25, z - 0.1)); }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="缩小"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(3, z + 0.1)); }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="放大"
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="ml-1 rounded px-1.5 py-0.5 text-xs hover:bg-secondary"
          title="重置视图"
        >
          ↺
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowGrid((g) => !g);
          }}
          className={`ml-1 rounded px-1.5 py-0.5 text-xs ${showGrid ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
          title="显示网格"
        >
          #
        </button>
      </div>

      {/* Canvas content (inner, with zoom/pan transform) */}
      <div
        ref={canvasContentRef}
        data-canvas-bg
        className="absolute"
        style={{
          left: `calc(50% + ${pan.x}px)`,
          top: `calc(50% + ${pan.y}px)`,
          transform: `translate(-50%, -50%) scale(${zoom})`,
          transformOrigin: 'center center',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#f5f0e8',
          boxShadow: '0 2px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
          cursor: 'default',
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <svg className="pointer-events-none absolute inset-0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
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