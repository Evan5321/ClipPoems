'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay as DndDragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import Canvas from '@/components/canvas/Canvas';
import Toolbar from '@/components/canvas/Toolbar';
import LayerPanel from '@/components/canvas/LayerPanel';
import FragmentStylePanel from '@/components/settings/FragmentStylePanel';
import CorpusPanel from '@/components/corpus/CorpusPanel';
import ResizeHandle from '@/components/shared/ResizeHandle';
import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';
import { useUIStore } from '@/store/uiStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useAutoSave } from '@/hooks/useAutoSave';

/**
 * Custom collision detection: pointerWithin first for accurate drop detection,
 * fall back to rectIntersection for canvas fragment movement
 */
function customCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
}

export default function EditorPage() {
  const params = useParams();
  const canvasId = typeof params.id === 'string' ? params.id : 'new';

  // Panels state
  const {
    leftPanelOpen,
    rightPanelOpen,
    leftPanelWidth,
    rightPanelWidth,
    setLeftPanelOpen,
    setRightPanelOpen,
    setLeftPanelWidth,
    setRightPanelWidth,
  } = useUIStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const [activeDragData, setActiveDragData] = useState<{
    id: UniqueIdentifier;
    type?: string;
    text?: string;
  } | null>(null);

  // Store actions — read latest state on each call to avoid stale closures
  const addFragment = useCanvasStore((s) => s.addFragment);
  const removeFragment = useCanvasStore((s) => s.removeFragment);
  const updateFragment = useCanvasStore((s) => s.updateFragment);
  const zoom = useCanvasStore((s) => s.zoom);
  // 响应式计数（图层 / 选中）
  const fragmentCount = useCanvasStore((s) => s.fragments.length);
  const selectedCount = useCanvasStore((s) => s.selectedIds.length);

  // Load corpus data on mount
  const loadAllCorpora = useCorpusStore((s) => s.loadAllCorpora);
  const isLoaded = useCorpusStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      loadAllCorpora();
    }
  }, [isLoaded, loadAllCorpora]);

  // Auto-save
  const { saveNow } = useAutoSave(canvasId);

  // Keyboard shortcuts
  useKeyboard();

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Calculate canvas-relative drop position from screen coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const canvasEl = canvasContainerRef.current;
      if (!canvasEl) return { x: 60, y: 60 };

      const rect = canvasEl.getBoundingClientRect();

      // Position relative to canvas container (screen coordinates)
      const relX = screenX - rect.left;
      const relY = screenY - rect.top;

      // The canvas inner area is 800x600, centered in the container
      // Convert screen coords to canvas coords accounting for centering and zoom
      const containerCenterX = rect.width / 2;
      const containerCenterY = rect.height / 2;

      const canvasCenterX = 400; // CANVAS_WIDTH / 2
      const canvasCenterY = 300; // CANVAS_HEIGHT / 2

      // Offset from container center (in screen pixels)
      const offsetFromCenterX = relX - containerCenterX;
      const offsetFromCenterY = relY - containerCenterY;

      // Convert to canvas coordinates (divide by zoom)
      const canvasX = canvasCenterX + offsetFromCenterX / zoom;
      const canvasY = canvasCenterY + offsetFromCenterY / zoom;

      return {
        x: Math.max(10, Math.min(780, canvasX)),
        y: Math.max(10, Math.min(580, canvasY)),
      };
    },
    [zoom],
  );

  // Track the drag position on move
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active } = event;
    const rect = active.rect.current;
    if (rect && rect.translated) {
      dragPositionRef.current = {
        x: rect.translated.left,
        y: rect.translated.top,
      };
    }
  }, []);

  // Drag start handler
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (!data) return;

    if (data.type === 'corpus-fragment') {
      const fragment = data.fragment as { text: string };
      setActiveDragData({
        id: active.id,
        type: 'corpus-fragment',
        text: fragment.text,
      });
    } else if (data.type === 'canvas-fragment') {
      const fragment = data.fragment as { text: string };
      setActiveDragData({
        id: active.id,
        type: 'canvas-fragment',
        text: fragment.text,
      });
    }
  }, []);

  // Drag end handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event;
      const data = active.data.current;

      if (active && over) {
        const overData = over.data.current;

        // --- Case 1: Dropped on delete zone ---
        if (overData?.type === 'delete-zone') {
          if (data?.type === 'canvas-fragment') {
            // Remove canvas fragment
            removeFragment(String(active.id));
          }
          // For corpus-fragment dropped on delete zone: just cancel (don't add to canvas)
          setActiveDragData(null);
          return;
        }

        // --- Case 2: Canvas fragment moved on canvas ---
        if (data?.type === 'canvas-fragment') {
          const fragmentId = String(active.id);
          // Read latest fragments from store directly
          const frags = useCanvasStore.getState().fragments;
          const frag = frags.find((f) => f.id === fragmentId);
          if (frag) {
            updateFragment(fragmentId, {
              position: {
                x: Math.max(0, frag.position.x + delta.x / zoom),
                y: Math.max(0, frag.position.y + delta.y / zoom),
              },
            });
          }
          setActiveDragData(null);
          return;
        }

        // --- Case 3: Corpus fragment dropped on canvas ---
        if (
          data?.type === 'corpus-fragment' &&
          (over.id === 'canvas-main' || overData?.type === 'canvas')
        ) {
          const fragmentInfo = data.fragment as {
            text: string;
            source?: string;
            author?: string;
          };

          // Calculate drop position from the drag overlay's current position
          const screenX = dragPositionRef.current.x;
          const screenY = dragPositionRef.current.y;
          const pos = screenToCanvas(screenX, screenY);

          addFragment({
            text: fragmentInfo.text,
            position: pos,
          });
        }
      }

      setActiveDragData(null);
    },
    [addFragment, removeFragment, updateFragment, zoom, screenToCanvas],
  );

  // Handle save
  const handleSave = useCallback(() => {
    saveNow();
  }, [saveNow]);

  // Handle export (placeholder)
  const handleExport = useCallback(() => {
    console.log('Export triggered');
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Toolbar */}
        <Toolbar
          onSave={handleSave}
          onExport={handleExport}
          onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
        />

        {/* Main editor area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Corpus (resizable) */}
          {leftPanelOpen && (
            <div
              className="relative flex shrink-0 flex-col border-r bg-background"
              style={{ width: leftPanelWidth }}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h2 className="text-xs font-semibold text-muted-foreground">语料库</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <CorpusPanel />
              </div>
              {/* Resize handle on right edge */}
              <ResizeHandle
                edge="right"
                currentWidth={leftPanelWidth}
                onResize={setLeftPanelWidth}
              />
            </div>
          )}

          {/* Center: Canvas */}
          <div ref={canvasContainerRef} className="flex-1 overflow-hidden">
            <Canvas id={canvasId} />
          </div>

          {/* Right panel: Layers + Settings (resizable) */}
          {rightPanelOpen && (
            <div
              className="relative flex shrink-0 flex-col border-l bg-background"
              style={{ width: rightPanelWidth }}
            >
              {/* Resize handle on left edge */}
              <ResizeHandle
                edge="left"
                currentWidth={rightPanelWidth}
                onResize={setRightPanelWidth}
              />
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <h2 className="text-xs font-semibold text-muted-foreground">图层</h2>
                  <span className="text-[10px] text-muted-foreground">
                    {fragmentCount} 个碎片
                  </span>
                </div>
                <LayerPanel />
              </div>

              {/* 碎片样式编辑 */}
              <div className="border-t">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <h2 className="text-xs font-semibold text-muted-foreground">碎片样式</h2>
                  {selectedCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      已选 {selectedCount}
                    </span>
                  )}
                </div>
                <FragmentStylePanel />
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DndDragOverlay>
          {activeDragData ? (
            <div
              className="flex items-center justify-center rounded-md border px-4 py-2 shadow-xl"
              style={{
                minWidth: 80,
                maxWidth: 200,
                background:
                  activeDragData.type === 'corpus-fragment' ? '#f5f0e8' : '#fff',
                transform: 'rotate(-2deg)',
              }}
            >
              <span className="truncate text-sm font-medium">
                {activeDragData.text || '拖拽中...'}
              </span>
            </div>
          ) : null}
        </DndDragOverlay>
      </div>
    </DndContext>
  );
}