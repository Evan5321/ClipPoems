'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import CanvasContextMenu from '@/components/canvas/CanvasContextMenu';
import FragmentStylePanel from '@/components/settings/FragmentStylePanel';
import CanvasSettings from '@/components/settings/CanvasSettings';
import CorpusPanel from '@/components/corpus/CorpusPanel';
import ResizeHandle from '@/components/shared/ResizeHandle';
import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';
import { useUIStore } from '@/store/uiStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { saveWork, getWork, saveVersion, listVersions, type WorkVersion } from '@/lib/canvas/storage';
import {
  exportAsImage,
  exportAsSvg,
  exportAsText,
  exportAsPdf,
  downloadBlob,
} from '@/lib/canvas/export';
import { detectAlignment, snapToGrid } from '@/lib/canvas/alignment';
import { getFragmentBounds } from '@/lib/canvas/geometry';
import { generateId } from '@/lib/utils/id';
import { toast } from '@/store/toastStore';
import {
  FileText,
  Copy,
  FileImage,
  FileCode2,
  FileType2,
  Printer,
  History,
  Download,
  X,
  ChevronDown,
  Library,
  SlidersHorizontal,
  Settings2,
  Layers,
} from 'lucide-react';

function customCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
}

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));

type MobileSheet = 'corpus' | 'style' | 'canvas' | 'layers' | null;

export default function EditorPage() {
  const params = useParams();
  const canvasId = typeof params.id === 'string' ? params.id : 'new';
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

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
  const guideSnapRef = useRef({ x: 0, y: 0 });
  const [activeDragData, setActiveDragData] = useState<{
    id: UniqueIdentifier;
    type?: string;
    text?: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versions, setVersions] = useState<WorkVersion[]>([]);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);

  const addFragment = useCanvasStore((s) => s.addFragment);
  const removeFragment = useCanvasStore((s) => s.removeFragment);
  const updateFragment = useCanvasStore((s) => s.updateFragment);
  const zoom = useCanvasStore((s) => s.zoom);
  const fragments = useCanvasStore((s) => s.fragments);
  const canvasSize = useCanvasStore((s) => s.canvasSize);
  const grid = useCanvasStore((s) => s.grid);
  const selectedCount = useCanvasStore((s) => s.selectedIds.length);
  const title = useCanvasStore((s) => s.title);
  const setTitle = useCanvasStore((s) => s.setTitle);
  const loadSnapshot = useCanvasStore((s) => s.loadSnapshot);
  const dirty = useCanvasStore((s) => s.dirty);
  const markSaved = useCanvasStore((s) => s.markSaved);

  const loadAllCorpora = useCorpusStore((s) => s.loadAllCorpora);
  const isLoaded = useCorpusStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) loadAllCorpora();
  }, [isLoaded, loadAllCorpora]);

  // 非桌面端默认收起两侧面板（用浮动抽屉）
  useEffect(() => {
    if (breakpoint !== 'desktop') {
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
    }
  }, [breakpoint, setLeftPanelOpen, setRightPanelOpen]);

  const { saveNow, savedAt } = useAutoSave(canvasId);

  // 加载作品：优先作品库，其次自动保存槽
  useEffect(() => {
    if (canvasId === 'new') {
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

  // 未保存提示
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // 关闭导出菜单
  useEffect(() => {
    if (!exportOpen) return;
    const close = () => setExportOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [exportOpen]);

  // 保存到作品库
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
      const existing = getWork(canvasId);
      if (existing) saveVersion(canvasId, { savedAt: Date.now(), snapshot: existing.snapshot });
      saveWork({ id: canvasId, title: workTitle, snapshot, createdAt: Date.now(), updatedAt: Date.now() });
    }
    markSaved();
    toast.success('已保存到作品库');
  }, [canvasId, router, saveNow, markSaved]);

  /** 克隆画布到离屏容器（避免 transform 造成偏移） */
  const createExportClone = useCallback((): { clone: HTMLElement; cleanup: () => void } | null => {
    const sourceEl = document.querySelector('[data-canvas-export]') as HTMLElement | null;
    if (!sourceEl) return null;
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
    return {
      clone,
      cleanup: () => {
        if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen);
      },
    };
  }, []);

  // 导出
  const handleExport = useCallback(
    async (format: 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'txt') => {
      setExportOpen(false);
      const state = useCanvasStore.getState();
      const safeTitle = (state.title || '剪贴诗').replace(/[\\/:*?"<>|]/g, '_');

      if (format === 'txt') {
        const blob = new Blob([exportAsText(state.fragments)], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `${safeTitle}.txt`);
        toast.success('已导出纯文本');
        return;
      }

      if (format === 'svg') {
        const snap = state.getSnapshot();
        const blob = exportAsSvg(snap.fragments, snap.canvasSize, snap.background, true);
        downloadBlob(blob, `${safeTitle}.svg`);
        toast.success('已导出 SVG');
        return;
      }

      if (format === 'pdf') {
        const made = createExportClone();
        if (!made) return;
        try {
          const ok = await exportAsPdf(made.clone, { format: 'png', scale: 2, includeBackground: true, quality: 0.95 });
          if (ok) toast.success('已打开打印窗口，可另存为 PDF');
          else toast.error('PDF 导出失败');
        } finally {
          made.cleanup();
        }
        return;
      }

      // 位图导出
      state.clearSelection();
      const made = createExportClone();
      if (!made) return;
      try {
        await nextFrame();
        const blob = await exportAsImage(made.clone, {
          format,
          scale: 2,
          includeBackground: true,
          quality: 0.95,
        });
        if (!blob) {
          toast.error('导出失败');
          return;
        }
        const ext = format === 'jpg' ? 'jpg' : format;
        downloadBlob(blob, `${safeTitle}.${ext}`);
        toast.success(`已导出 ${ext.toUpperCase()}`);
      } finally {
        made.cleanup();
      }
    },
    [createExportClone],
  );

  // 另存为副本
  const handleSaveAs = useCallback(() => {
    const state = useCanvasStore.getState();
    const newId = generateId();
    saveWork({
      id: newId,
      title: `${state.title} 副本`,
      snapshot: state.getSnapshot(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    markSaved();
    toast.success('已另存为副本');
    router.push(`/editor/${newId}`);
  }, [router, markSaved]);

  const openVersions = useCallback(() => {
    if (canvasId === 'new') {
      toast.info('保存后才会有历史版本');
      return;
    }
    setVersions(listVersions(canvasId).slice().reverse());
    setVersionOpen(true);
  }, [canvasId]);

  const restoreVersion = useCallback(
    (v: WorkVersion) => {
      loadSnapshot(v.snapshot);
      setVersionOpen(false);
      toast.success('已恢复历史版本（尚未保存）');
    },
    [loadSnapshot],
  );

  useKeyboard([], { onSave: handleSave });

  // Tauri 桌面端菜单事件
  useEffect(() => {
    const tauri = (window as any).__TAURI__;
    if (!tauri?.event?.listen) return;
    let unlisten: (() => void) | undefined;
    tauri.event
      .listen('menu', (event: { payload?: string }) => {
        switch (event.payload) {
          case 'new':
            router.push('/editor/new');
            break;
          case 'open':
            router.push('/gallery');
            break;
          case 'save':
            handleSave();
            break;
          case 'save-as':
            handleSaveAs();
            break;
          case 'export':
            setExportOpen(true);
            break;
          default:
            break;
        }
      })
      .then((fn: () => void) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, [handleSave, handleSaveAs, router]);

  /* ===== 拖拽 ===== */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const canvasEl = canvasContainerRef.current;
      if (!canvasEl) return { x: 60, y: 60 };
      const rect = canvasEl.getBoundingClientRect();
      const relX = screenX - rect.left;
      const relY = screenY - rect.top;
      const offsetFromCenterX = relX - rect.width / 2;
      const offsetFromCenterY = relY - rect.height / 2;
      const canvasX = canvasSize.width / 2 + offsetFromCenterX / zoom;
      const canvasY = canvasSize.height / 2 + offsetFromCenterY / zoom;
      return {
        x: Math.max(10, Math.min(canvasSize.width - 20, canvasX)),
        y: Math.max(10, Math.min(canvasSize.height - 20, canvasY)),
      };
    },
    [zoom, canvasSize],
  );

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active } = event;
    const rect = active.rect.current;
    if (rect && rect.translated) {
      dragPositionRef.current = { x: rect.translated.left, y: rect.translated.top };
    }

    if (active.data.current?.type === 'canvas-fragment') {
      const state = useCanvasStore.getState();
      const frag = state.fragments.find((f) => f.id === String(active.id));
      if (!frag) return;
      const tentative = {
        ...frag,
        position: {
          x: frag.position.x + event.delta.x / zoom,
          y: frag.position.y + event.delta.y / zoom,
        },
      };
      const others = state.fragments.filter((f) => f.id !== frag.id);
      const result = detectAlignment(getFragmentBounds(tentative), others, state.canvasSize, 6);
      guideSnapRef.current = { x: result.offsetX, y: result.offsetY };
      state.setAlignmentGuides(result.guides);
    }
  }, [zoom]);

  const clearDragState = useCallback(() => {
    const state = useCanvasStore.getState();
    state.setAlignmentGuides([]);
    guideSnapRef.current = { x: 0, y: 0 };
    setActiveDragData(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data) return;
    if (data.type === 'corpus-fragment' || data.type === 'canvas-fragment') {
      const fragment = data.fragment as { text: string };
      setActiveDragData({ id: event.active.id, type: data.type, text: fragment.text });
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event;
      const data = active.data.current;

      if (active && over) {
        const overData = over.data.current;

        if (overData?.type === 'delete-zone') {
          if (data?.type === 'canvas-fragment') removeFragment(String(active.id));
          clearDragState();
          return;
        }

        if (data?.type === 'canvas-fragment') {
          const fragmentId = String(active.id);
          const state = useCanvasStore.getState();
          const frag = state.fragments.find((f) => f.id === fragmentId);
          if (frag) {
            let x = frag.position.x + delta.x / zoom + guideSnapRef.current.x;
            let y = frag.position.y + delta.y / zoom + guideSnapRef.current.y;
            if (state.grid.enabled && state.grid.snap) {
              x = snapToGrid(x, state.grid.spacing);
              y = snapToGrid(y, state.grid.spacing);
            }
            x = Math.max(0, Math.min(state.canvasSize.width - 10, x));
            y = Math.max(0, Math.min(state.canvasSize.height - 10, y));
            updateFragment(fragmentId, { position: { x: Math.round(x), y: Math.round(y) } });
          }
          clearDragState();
          return;
        }

        if (data?.type === 'corpus-fragment' && (over.id === 'canvas-main' || overData?.type === 'canvas')) {
          const fragmentInfo = data.fragment as { text: string };
          const pos = screenToCanvas(dragPositionRef.current.x, dragPositionRef.current.y);
          addFragment({ text: fragmentInfo.text, position: pos });
        }
      }

      clearDragState();
    },
    [addFragment, removeFragment, updateFragment, zoom, screenToCanvas, clearDragState],
  );

  /* ===== 布局片段 ===== */
  const corpusPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-semibold text-muted-foreground">语料库</h2>
        <button
          onClick={() => {
            if (isDesktop) setLeftPanelOpen(false);
            else setMobileSheet(null);
          }}
          className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CorpusPanel />
      </div>
    </div>
  );

  const settingsPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-xs font-semibold text-muted-foreground">画布设置 / 图层 / 样式</h2>
        <button
          onClick={() => (isDesktop ? setRightPanelOpen(false) : setMobileSheet(null))}
          className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="border-b">
          <h3 className="border-b bg-secondary/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">画布设置</h3>
          <CanvasSettings />
        </div>
        <div className="border-b">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">图层</h3>
            <span className="text-[10px] text-muted-foreground">{fragments.length} 个碎片</span>
          </div>
          <LayerPanel />
        </div>
        <div>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-[11px] font-medium text-muted-foreground">碎片样式</h3>
            {selectedCount > 0 && <span className="text-[10px] text-muted-foreground">已选 {selectedCount}</span>}
          </div>
          <FragmentStylePanel />
        </div>
      </div>
    </div>
  );

  const canvasArea = (
    <div
      ref={canvasContainerRef}
      className="relative flex-1 overflow-hidden"
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-fragment-id]')) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <Canvas id={canvasId} />
    </div>
  );

  const exportMenu = (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExportOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-secondary"
        title="导出作品"
      >
        <Download className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {exportOpen && (
        <div
          className="absolute right-0 top-8 z-50 w-44 rounded-md border bg-background p-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { fmt: 'png' as const, label: 'PNG 图片', icon: <FileImage className="h-4 w-4" /> },
            { fmt: 'jpg' as const, label: 'JPG 图片', icon: <FileImage className="h-4 w-4" /> },
            { fmt: 'webp' as const, label: 'WebP 图片', icon: <FileImage className="h-4 w-4" /> },
            { fmt: 'svg' as const, label: 'SVG 矢量', icon: <FileCode2 className="h-4 w-4" /> },
            { fmt: 'pdf' as const, label: 'PDF 打印', icon: <Printer className="h-4 w-4" /> },
            { fmt: 'txt' as const, label: '纯文本', icon: <FileType2 className="h-4 w-4" /> },
          ].map((item) => (
            <button
              key={item.fmt}
              onClick={() => handleExport(item.fmt)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
        <Toolbar
          onSave={handleSave}
          onExport={() => setExportOpen((v) => !v)}
          onToggleLeftPanel={() => {
            if (isDesktop) setLeftPanelOpen(!leftPanelOpen);
            else {
              setLeftPanelOpen(!leftPanelOpen);
              if (!leftPanelOpen) setRightPanelOpen(false);
            }
          }}
          onToggleRightPanel={() => {
            if (isDesktop) setRightPanelOpen(!rightPanelOpen);
            else {
              setRightPanelOpen(!rightPanelOpen);
              if (!rightPanelOpen) setLeftPanelOpen(false);
            }
          }}
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
            {exportMenu}
            <button
              onClick={() => handleExport('txt')}
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
            <button
              onClick={openVersions}
              className="flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="历史版本"
            >
              <History className="h-4 w-4" />
            </button>
            {savedAt && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                已保存 {new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* 主体 */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* 桌面端左右栏 */}
          {isDesktop && leftPanelOpen && (
            <div className="relative flex shrink-0 flex-col border-r bg-background" style={{ width: leftPanelWidth }}>
              {corpusPanel}
              <ResizeHandle edge="right" currentWidth={leftPanelWidth} onResize={setLeftPanelWidth} />
            </div>
          )}

          {canvasArea}

          {isDesktop && rightPanelOpen && (
            <div className="relative flex shrink-0 flex-col border-l bg-background" style={{ width: rightPanelWidth }}>
              <ResizeHandle edge="left" currentWidth={rightPanelWidth} onResize={setRightPanelWidth} />
              {settingsPanel}
            </div>
          )}

          {/* 平板/移动端：浮动抽屉 */}
          {!isDesktop && (leftPanelOpen || rightPanelOpen) && (
            <div
              className="absolute inset-0 z-40 bg-black/20"
              onClick={() => {
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-[85vw] max-w-sm border-r bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{ display: leftPanelOpen ? 'block' : 'none' }}
              >
                {corpusPanel}
              </div>
              <div
                className="absolute inset-y-0 right-0 w-[85vw] max-w-sm border-l bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{ display: rightPanelOpen ? 'block' : 'none' }}
              >
                {settingsPanel}
              </div>
            </div>
          )}

          {/* 移动端底部工具条 */}
          {breakpoint === 'mobile' && (
            <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-background/95 px-1 py-1 backdrop-blur">
              {[
                { key: 'corpus' as const, label: '语料', icon: Library },
                { key: 'style' as const, label: '样式', icon: SlidersHorizontal },
                { key: 'canvas' as const, label: '画布', icon: Settings2 },
                { key: 'layers' as const, label: '图层', icon: Layers },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMobileSheet(mobileSheet === key ? null : key)}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded py-1 text-[10px] ${
                    mobileSheet === key ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 移动端底部弹出面板 */}
          {breakpoint === 'mobile' && mobileSheet && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={() => setMobileSheet(null)}>
              <div
                className="flex max-h-[70vh] flex-col overflow-hidden rounded-t-2xl border-t bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-sm font-medium">
                    {mobileSheet === 'corpus' && '语料库'}
                    {mobileSheet === 'style' && '碎片样式'}
                    {mobileSheet === 'canvas' && '画布设置'}
                    {mobileSheet === 'layers' && '图层'}
                  </span>
                  <button onClick={() => setMobileSheet(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pb-[56px]">
                  {mobileSheet === 'corpus' && <CorpusPanel />}
                  {mobileSheet === 'style' && <FragmentStylePanel />}
                  {mobileSheet === 'canvas' && <CanvasSettings />}
                  {mobileSheet === 'layers' && <LayerPanel />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右键菜单 */}
        {contextMenu && (
          <CanvasContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
        )}

        {/* 历史版本 */}
        {versionOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setVersionOpen(false)}>
            <div className="w-full max-w-md rounded-lg border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold">历史版本</h3>
                <button onClick={() => setVersionOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {versions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">暂无历史版本，手动保存后会自动记录</p>
                ) : (
                  versions.map((v, i) => (
                    <div key={i} className="flex items-center justify-between rounded px-2 py-2 text-sm hover:bg-secondary">
                      <span className="text-muted-foreground">
                        {new Date(v.savedAt).toLocaleString('zh-CN')} · {v.snapshot.fragments.length} 个碎片
                      </span>
                      <button
                        onClick={() => restoreVersion(v)}
                        className="rounded border px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
                      >
                        恢复
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 拖拽浮层 */}
        <DndDragOverlay>
          {activeDragData ? (
            <div
              className="flex items-center justify-center rounded-md border px-4 py-2 shadow-xl"
              style={{
                minWidth: 80,
                maxWidth: 200,
                background: activeDragData.type === 'corpus-fragment' ? '#f5f0e8' : '#fff',
                transform: 'rotate(-2deg)',
              }}
            >
              <span className="truncate text-sm font-medium">{activeDragData.text || '拖拽中...'}</span>
            </div>
          ) : null}
        </DndDragOverlay>
      </div>
    </DndContext>
  );
}
