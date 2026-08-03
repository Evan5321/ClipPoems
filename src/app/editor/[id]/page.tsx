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
import TopNav from '@/components/layout/TopNav';
import LayerPanel from '@/components/canvas/LayerPanel';
import FragmentStylePanel from '@/components/settings/FragmentStylePanel';
import CanvasSettings from '@/components/settings/CanvasSettings';
import CorpusPanel from '@/components/corpus/CorpusPanel';
import ResizeHandle from '@/components/shared/ResizeHandle';
import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';
import { useUIStore } from '@/store/uiStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useRouter } from 'next/navigation';
import { saveWork, getWork } from '@/lib/canvas/storage';
import { exportAsImage, exportAsText, downloadBlob } from '@/lib/canvas/export';
import { generateId } from '@/lib/utils/id';
import { FileText, Copy } from 'lucide-react';

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
  const router = useRouter();

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
  const title = useCanvasStore((s) => s.title);
  const setTitle = useCanvasStore((s) => s.setTitle);
  const loadSnapshot = useCanvasStore((s) => s.loadSnapshot);
  const dirty = useCanvasStore((s) => s.dirty);
  const markSaved = useCanvasStore((s) => s.markSaved);

  // Load corpus data on mount
  const loadAllCorpora = useCorpusStore((s) => s.loadAllCorpora);
  const isLoaded = useCorpusStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      loadAllCorpora();
    }
  }, [isLoaded, loadAllCorpora]);

  // Auto-save
  const { saveNow, savedAt } = useAutoSave(canvasId);

  // 加载作品（mount 时）：优先作品库，其次自动保存槽
  useEffect(() => {
    if (canvasId === 'new') {
      // 新作品：尝试恢复草稿
      const raw = localStorage.getItem('clip-poems-auto-new');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.snapshot && data.snapshot.fragments?.length > 0) {
            loadSnapshot(data.snapshot);
            if (data.title) setTitle(data.title);
          }
        } catch {
          // ignore
        }
      }
      return;
    }
    const work = getWork(canvasId);
    if (work) {
      loadSnapshot(work.snapshot);
      setTitle(work.title);
      return;
    }
    // 作品库没有，尝试自动保存槽
    const raw = localStorage.getItem(`clip-poems-auto-${canvasId}`);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.snapshot) loadSnapshot(data.snapshot);
        if (data.title) setTitle(data.title);
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId]);

  // 浏览器关闭/刷新时提示未保存变更
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // 保存到作品库（同时写入自动保存槽）
  const handleSave = useCallback(() => {
    saveNow();
    const state = useCanvasStore.getState();
    const snapshot = state.getSnapshot();
    const workTitle = state.title;
    if (canvasId === 'new') {
      const newId = generateId();
      saveWork({ id: newId, title: workTitle, snapshot, createdAt: Date.now(), updatedAt: Date.now() });
      router.push(`/editor/${newId}`);
    } else {
      saveWork({ id: canvasId, title: workTitle, snapshot, createdAt: Date.now(), updatedAt: Date.now() });
    }
    markSaved();
  }, [canvasId, router, saveNow, markSaved]);

  // 导出 PNG（克隆到离屏容器渲染，避免画布 transform 导致空白偏移）
  const handleExportImage = useCallback(async () => {
    const store = useCanvasStore.getState();
    store.clearSelection();
    // 等一帧让 DOM 移除选中态手柄
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const sourceEl = document.querySelector('[data-canvas-export]') as HTMLElement | null;
    if (!sourceEl) return;

    // 克隆画布到离屏容器：移除画布整体的居中 transform，保留原始尺寸
    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-99999px';
    offscreen.style.top = '0';
    offscreen.style.width = sourceEl.style.width;
    offscreen.style.height = sourceEl.style.height;
    offscreen.style.background = '#ffffff';

    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    offscreen.appendChild(clone);
    document.body.appendChild(offscreen);

    try {
      const blob = await exportAsImage(clone, { format: 'png', scale: 2, includeBackground: true });
      if (blob) downloadBlob(blob, `${title || '剪贴诗'}.png`);
    } finally {
      document.body.removeChild(offscreen);
    }
  }, [title]);

  // 导出纯文本
  const handleExportText = useCallback(() => {
    const fragments = useCanvasStore.getState().fragments;
    const text = exportAsText(fragments);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${title || '剪贴诗'}.txt`);
  }, [title]);

  // 另存为副本
  const handleSaveAs = useCallback(() => {
    const state = useCanvasStore.getState();
    const snapshot = state.getSnapshot();
    const newId = generateId();
    saveWork({ id: newId, title: `${state.title} 副本`, snapshot, createdAt: Date.now(), updatedAt: Date.now() });
    markSaved();
    router.push(`/editor/${newId}`);
  }, [router, markSaved]);

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav />
        {/* Toolbar */}
        <Toolbar
          onSave={handleSave}
          onExport={handleExportImage}
          onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
        />

        {/* 标题栏 */}
        <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-background px-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-6 max-w-[240px] flex-1 rounded border-none bg-transparent px-1 text-sm outline-none focus:bg-secondary"
            placeholder="未命名作品"
          />
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={handleExportText}
              className="flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="导出为纯文本"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveAs}
              className="flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="另存为副本"
            >
              <Copy className="h-4 w-4" />
            </button>
            {savedAt && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                已保存 {new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

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
                {/* 画布设置 */}
                <div className="border-b">
                  <h2 className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
                    画布设置
                  </h2>
                  <CanvasSettings />
                </div>

                {/* 图层 */}
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