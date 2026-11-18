'use client';

import { create } from 'zustand';
import type {
  CanvasFragment,
  CanvasBackground,
  CanvasGrid,
  Position,
  GlobalTextStyle,
  CanvasSnapshot,
} from '@/types/canvas';
import { generateId } from '@/lib/utils/id';
import { generateTornEdgePercent } from '@/lib/canvas/clipPaths';
import {
  estimateFragmentSize,
  getFragmentBounds,
  unionBounds,
  normalizeRotation,
} from '@/lib/canvas/geometry';
import { snapToGrid, type AlignmentGuide } from '@/lib/canvas/alignment';

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

const MAX_HISTORY = 50;

/** 从文本与字号生成撕裂边缘（百分比） */
function makeClipPath(text: string, fontSize: number, seed: string): string {
  const { width, height } = estimateFragmentSize(text, fontSize);
  const hashCode = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return generateTornEdgePercent({ width, height, roughness: 0.08, segments: 4, seed: hashCode });
}

const DEFAULT_GLOBAL_STYLE: GlobalTextStyle = {
  fontFamily: 'serif',
  fontSize: 24,
  color: '#333333',
  letterSpacing: 2,
  lineHeight: 1.6,
  direction: 'horizontal',
};

const DEFAULT_BG: CanvasBackground = { type: 'solid', value: '#f5f0e8', opacity: 1 };
const DEFAULT_GRID: CanvasGrid = { enabled: false, spacing: 20, snap: false };

function cloneFragment(f: CanvasFragment): CanvasFragment {
  return JSON.parse(JSON.stringify(f)) as CanvasFragment;
}

/* ===== 历史记录（时间 + 动作键去重，把拖拽/滑块的连续更新合并为一个历史步） ===== */
let lastRecordKey: string | null = null;
let lastRecordAt = 0;

function snapshotOf(state: CanvasState): CanvasSnapshot {
  return {
    fragments: state.fragments,
    background: state.background,
    grid: state.grid,
    canvasSize: state.canvasSize,
    globalTextStyle: state.globalTextStyle,
  };
}

function pushPast(state: CanvasState, coalesceKey?: string): CanvasSnapshot[] {
  const now = Date.now();
  if (coalesceKey && coalesceKey === lastRecordKey && now - lastRecordAt < 600) {
    lastRecordAt = now;
    return state.historyPast;
  }
  lastRecordKey = coalesceKey ?? null;
  lastRecordAt = now;
  const past = [...state.historyPast, snapshotOf(state)];
  return past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past;
}

function resetHistoryTracking() {
  lastRecordKey = null;
  lastRecordAt = 0;
}

function zCounterFrom(fragments: CanvasFragment[]): number {
  return fragments.reduce((max, f) => Math.max(max, f.zIndex), 0) + 1;
}

interface CanvasState {
  fragments: CanvasFragment[];
  selectedIds: string[];
  canvasSize: { width: number; height: number };
  background: CanvasBackground;
  grid: CanvasGrid;
  zoom: number;
  panOffset: { x: number; y: number };
  _zCounter: number;
  fitSignal: number;
  globalTextStyle: GlobalTextStyle;
  title: string;
  dirty: boolean;
  /** 剪贴板（复制的碎片） */
  clipboard: CanvasFragment[];
  /** 撤销 / 重做历史 */
  historyPast: CanvasSnapshot[];
  historyFuture: CanvasSnapshot[];
  /** 拖动时显示的对齐辅助线 */
  alignmentGuides: AlignmentGuide[];

  addFragment: (fragment: Partial<CanvasFragment> & { text: string }) => string;
  removeFragment: (id: string) => void;
  removeFragments: (ids: string[]) => void;
  updateFragment: (id: string, updates: Partial<CanvasFragment>) => void;
  updateFragmentText: (id: string, text: string) => void;
  updateFragmentStyle: (id: string, style: Partial<CanvasFragment['style']>) => void;
  resizeFragment: (id: string, width: number, height: number) => void;
  selectFragment: (id: string, additive?: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setBackground: (background: CanvasBackground) => void;
  setGrid: (grid: CanvasGrid) => void;
  requestFit: () => void;
  setGlobalTextStyle: (style: GlobalTextStyle) => void;
  applyStyleToAll: () => void;
  setTitle: (title: string) => void;
  loadSnapshot: (snapshot: CanvasSnapshot) => void;
  getSnapshot: () => CanvasSnapshot;
  markSaved: () => void;
  resetCanvas: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  addFragmentsFromCorpus: (fragments: Array<{ text: string; source?: string; author?: string }>) => void;

  // ---- 高级编辑 ----
  copySelection: () => void;
  pasteClipboard: (offset?: number) => string[];
  duplicateSelection: () => void;
  undo: () => void;
  redo: () => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (axis: DistributeAxis) => void;
  rotateSelection: (delta: number) => void;
  nudgeSelection: (dx: number, dy: number) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  fragments: [],
  selectedIds: [],
  canvasSize: { width: 800, height: 600 },
  background: { ...DEFAULT_BG },
  grid: { ...DEFAULT_GRID },
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  _zCounter: 1,
  fitSignal: 0,
  globalTextStyle: { ...DEFAULT_GLOBAL_STYLE },
  title: '未命名作品',
  dirty: false,
  clipboard: [],
  historyPast: [],
  historyFuture: [],
  alignmentGuides: [],

  addFragment: (partial) => {
    const id = partial.id || generateId();
    const g = get().globalTextStyle;
    const fontSize = partial.style?.fontSize || g.fontSize || 24;
    const { width, height } = estimateFragmentSize(partial.text, fontSize);
    const z = get()._zCounter;

    const fragment: CanvasFragment = {
      id,
      text: partial.text,
      position: partial.position || { x: 40, y: 40 },
      rotation: partial.rotation !== undefined ? partial.rotation : (5 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1),
      scale: partial.scale || 1,
      zIndex: z,
      style: {
        fontFamily: partial.style?.fontFamily || g.fontFamily || 'serif',
        fontSize,
        color: partial.style?.color || g.color || '#333333',
        letterSpacing: partial.style?.letterSpacing ?? g.letterSpacing ?? 2,
        lineHeight: partial.style?.lineHeight ?? g.lineHeight ?? 1.6,
        opacity: partial.style?.opacity ?? 1,
        direction: partial.style?.direction || g.direction || 'horizontal',
      },
      locked: partial.locked || false,
      corpusFragmentId: partial.corpusFragmentId,
      width,
      height,
      userSized: false,
      clipPath: partial.clipPath || makeClipPath(partial.text, fontSize, id),
    };

    set((state) => ({
      fragments: [...state.fragments, fragment],
      _zCounter: state._zCounter + 1,
      dirty: true,
      historyPast: pushPast(state),
      historyFuture: [],
    }));

    return id;
  },

  removeFragment: (id) => {
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      dirty: true,
      historyPast: pushPast(state, `remove:${id}`),
      historyFuture: [],
    }));
  },

  removeFragments: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({
      fragments: state.fragments.filter((f) => !idSet.has(f.id)),
      selectedIds: state.selectedIds.filter((sid) => !idSet.has(sid)),
      dirty: true,
      historyPast: pushPast(state, ids.length === 1 ? `remove:${ids[0]}` : 'remove-many'),
      historyFuture: [],
    }));
  },

  updateFragment: (id, updates) => {
    set((state) => ({
      fragments: state.fragments.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      dirty: true,
      historyPast: pushPast(state, `update:${id}`),
      historyFuture: [],
    }));
  },

  updateFragmentText: (id, text) => {
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (f.id !== id) return f;
        if (f.userSized) return { ...f, text };
        const fontSize = f.style?.fontSize || 24;
        const { width, height } = estimateFragmentSize(text, fontSize);
        return { ...f, text, width, height, clipPath: makeClipPath(text, fontSize, id) };
      }),
      dirty: true,
      historyPast: pushPast(state, `text:${id}`),
      historyFuture: [],
    }));
  },

  updateFragmentStyle: (id, style) => {
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (f.id !== id) return f;
        const nextStyle = { ...f.style, ...style };
        if (style.fontSize !== undefined && style.fontSize !== f.style?.fontSize && !f.userSized) {
          const { width, height } = estimateFragmentSize(f.text, style.fontSize);
          return { ...f, style: nextStyle, width, height, clipPath: makeClipPath(f.text, style.fontSize, id) };
        }
        return { ...f, style: nextStyle };
      }),
      dirty: true,
      historyPast: pushPast(state, `style:${id}`),
      historyFuture: [],
    }));
  },

  resizeFragment: (id, width, height) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id
          ? { ...f, width: Math.max(40, Math.round(width)), height: Math.max(30, Math.round(height)), userSized: true }
          : f,
      ),
      dirty: true,
      historyPast: pushPast(state, `resize:${id}`),
      historyFuture: [],
    }));
  },

  selectFragment: (id, additive = true) => {
    set((state) => {
      if (!additive) return { selectedIds: [id] };
      return {
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  selectAll: () => set({ selectedIds: get().fragments.map((f) => f.id) }),

  clearSelection: () => set({ selectedIds: [] }),

  setZoom: (zoom) => set({ zoom }),
  setPanOffset: (offset) => set({ panOffset: offset }),

  setCanvasSize: (size) => {
    set((state) => ({
      canvasSize: { width: Math.max(100, Math.round(size.width)), height: Math.max(100, Math.round(size.height)) },
      dirty: true,
      historyPast: pushPast(state, 'canvas-size'),
      historyFuture: [],
    }));
  },

  setBackground: (background) => {
    set((state) => ({
      background,
      dirty: true,
      historyPast: pushPast(state, 'background'),
      historyFuture: [],
    }));
  },

  setGrid: (grid) => {
    set((state) => ({
      grid,
      dirty: true,
      historyPast: pushPast(state, 'grid'),
      historyFuture: [],
    }));
  },

  requestFit: () => set((s) => ({ fitSignal: s.fitSignal + 1 })),

  setGlobalTextStyle: (style) => {
    set((state) => ({
      globalTextStyle: { ...state.globalTextStyle, ...style },
      dirty: true,
      historyPast: pushPast(state, 'global-style'),
      historyFuture: [],
    }));
  },

  applyStyleToAll: () => {
    const g = get().globalTextStyle;
    set((state) => ({
      fragments: state.fragments.map((f) => ({
        ...f,
        style: {
          ...f.style,
          fontFamily: g.fontFamily || f.style.fontFamily,
          fontSize: g.fontSize || f.style.fontSize,
          color: g.color || f.style.color,
          letterSpacing: g.letterSpacing ?? f.style.letterSpacing,
          lineHeight: g.lineHeight ?? f.style.lineHeight,
          direction: g.direction || f.style.direction,
        },
      })),
      dirty: true,
      historyPast: pushPast(state, 'apply-all'),
      historyFuture: [],
    }));
  },

  setTitle: (title) => set({ title, dirty: true }),

  loadSnapshot: (snapshot) => {
    resetHistoryTracking();
    set({
      fragments: snapshot.fragments,
      background: snapshot.background,
      grid: snapshot.grid,
      canvasSize: snapshot.canvasSize,
      globalTextStyle: snapshot.globalTextStyle,
      selectedIds: [],
      _zCounter: zCounterFrom(snapshot.fragments),
      historyPast: [],
      historyFuture: [],
      alignmentGuides: [],
      dirty: false,
    });
  },

  getSnapshot: () => snapshotOf(get()),

  markSaved: () => set({ dirty: false }),

  resetCanvas: () => {
    resetHistoryTracking();
    set({
      fragments: [],
      selectedIds: [],
      canvasSize: { width: 800, height: 600 },
      background: { ...DEFAULT_BG },
      grid: { ...DEFAULT_GRID },
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      _zCounter: 1,
      fitSignal: 0,
      globalTextStyle: { ...DEFAULT_GLOBAL_STYLE },
      title: '未命名作品',
      dirty: false,
      historyPast: [],
      historyFuture: [],
      alignmentGuides: [],
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const maxZ = Math.max(...state.fragments.map((f) => f.zIndex), state._zCounter);
      return {
        _zCounter: maxZ + 1,
        fragments: state.fragments.map((f) => (f.id === id ? { ...f, zIndex: maxZ + 1 } : f)),
        dirty: true,
        historyPast: pushPast(state, `z:${id}`),
        historyFuture: [],
      };
    });
  },

  sendToBack: (id) => {
    set((state) => {
      const minZ = Math.min(...state.fragments.map((f) => f.zIndex), 1);
      return {
        _zCounter: state._zCounter + 1,
        fragments: state.fragments.map((f) => (f.id === id ? { ...f, zIndex: minZ - 1 } : f)),
        dirty: true,
        historyPast: pushPast(state, `z:${id}`),
        historyFuture: [],
      };
    });
  },

  bringForward: (id) => {
    set((state) => ({
      fragments: state.fragments.map((f) => (f.id === id ? { ...f, zIndex: f.zIndex + 1 } : f)),
      _zCounter: state._zCounter + 1,
      dirty: true,
      historyPast: pushPast(state, `z:${id}`),
      historyFuture: [],
    }));
  },

  sendBackward: (id) => {
    set((state) => ({
      fragments: state.fragments.map((f) => (f.id === id ? { ...f, zIndex: Math.max(0, f.zIndex - 1) } : f)),
      dirty: true,
      historyPast: pushPast(state, `z:${id}`),
      historyFuture: [],
    }));
  },

  addFragmentsFromCorpus: (corpusFragments) => {
    const state = get();
    const g = state.globalTextStyle;
    let z = state._zCounter;
    const newFragments: CanvasFragment[] = [];
    const startX = 40;
    const startY = 40;

    for (let i = 0; i < corpusFragments.length; i++) {
      const { text } = corpusFragments[i];
      const fontSize = g.fontSize || 24;
      const { width, height } = estimateFragmentSize(text, fontSize);
      const id = generateId();
      const fragment: CanvasFragment = {
        id,
        text,
        position: { x: startX + (i % 2) * 30, y: startY + i * (height + 16) },
        rotation: (i % 3) * 0.5 - 0.5,
        scale: 1,
        zIndex: z++,
        style: {
          fontFamily: g.fontFamily || 'serif',
          fontSize,
          color: g.color || '#333333',
          letterSpacing: g.letterSpacing ?? 2,
          lineHeight: g.lineHeight ?? 1.6,
          opacity: 1,
          direction: g.direction || 'horizontal',
        },
        locked: false,
        width,
        height,
        userSized: false,
        clipPath: makeClipPath(text, fontSize, id),
      };
      newFragments.push(fragment);
    }

    set((state) => ({
      fragments: [...state.fragments, ...newFragments],
      _zCounter: z,
      dirty: true,
      historyPast: pushPast(state, 'add-many'),
      historyFuture: [],
    }));
  },

  // ---- 高级编辑 ----

  copySelection: () => {
    const state = get();
    const items = state.fragments.filter((f) => state.selectedIds.includes(f.id)).map(cloneFragment);
    set({ clipboard: items });
  },

  pasteClipboard: (offset = 24) => {
    const state = get();
    if (state.clipboard.length === 0) return [];
    const newFragments: CanvasFragment[] = [];
    let z = state._zCounter;
    for (const src of state.clipboard) {
      const id = generateId();
      newFragments.push({
        ...cloneFragment(src),
        id,
        position: { x: Math.max(0, src.position.x + offset), y: Math.max(0, src.position.y + offset) },
        zIndex: z++,
      });
    }
    const newIds = newFragments.map((f) => f.id);
    set((state) => ({
      fragments: [...state.fragments, ...newFragments],
      selectedIds: newIds,
      _zCounter: z,
      dirty: true,
      historyPast: pushPast(state, 'paste'),
      historyFuture: [],
    }));
    return newIds;
  },

  duplicateSelection: () => {
    const state = get();
    if (state.selectedIds.length === 0) return;
    state.copySelection();
    state.pasteClipboard(24);
  },

  undo: () => {
    set((state) => {
      const prev = state.historyPast[state.historyPast.length - 1];
      if (!prev) return {};
      const future = [...state.historyFuture, snapshotOf(state)].slice(-MAX_HISTORY);
      return {
        ...prev,
        selectedIds: [],
        _zCounter: zCounterFrom(prev.fragments),
        dirty: true,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: future,
      };
    });
  },

  redo: () => {
    set((state) => {
      const next = state.historyFuture[state.historyFuture.length - 1];
      if (!next) return {};
      const past = [...state.historyPast, snapshotOf(state)].slice(-MAX_HISTORY);
      return {
        ...next,
        selectedIds: [],
        _zCounter: zCounterFrom(next.fragments),
        dirty: true,
        historyPast: past,
        historyFuture: state.historyFuture.slice(0, -1),
      };
    });
  },

  setAlignmentGuides: (guides) => set({ alignmentGuides: guides }),

  alignSelected: (mode) => {
    set((state) => {
      const selected = state.fragments.filter((f) => state.selectedIds.includes(f.id));
      if (selected.length === 0) return {};
      const ref =
        selected.length === 1
          ? {
              left: 0,
              top: 0,
              right: state.canvasSize.width,
              bottom: state.canvasSize.height,
              centerX: state.canvasSize.width / 2,
              centerY: state.canvasSize.height / 2,
            }
          : unionBounds(selected);
      if (!ref) return {};
      const next = state.fragments.map((f) => {
        if (!state.selectedIds.includes(f.id)) return f;
        const b = getFragmentBounds(f);
        let x = f.position.x;
        let y = f.position.y;
        if (mode === 'left') x = ref.left;
        else if (mode === 'centerX') x = ref.centerX - b.width / 2;
        else if (mode === 'right') x = ref.right - b.width;
        else if (mode === 'top') y = ref.top;
        else if (mode === 'centerY') y = ref.centerY - b.height / 2;
        else if (mode === 'bottom') y = ref.bottom - b.height;
        return { ...f, position: { x: Math.round(x), y: Math.round(y) } };
      });
      return {
        fragments: next,
        dirty: true,
        historyPast: pushPast(state, 'align'),
        historyFuture: [],
      };
    });
  },

  distributeSelected: (axis) => {
    set((state) => {
      const selected = state.fragments.filter((f) => state.selectedIds.includes(f.id));
      if (selected.length < 3) return {};
      if (axis === 'horizontal') {
        const sorted = [...selected].sort((a, b) => getFragmentBounds(a).left - getFragmentBounds(b).left);
        const first = getFragmentBounds(sorted[0]);
        const last = getFragmentBounds(sorted[sorted.length - 1]);
        const totalSize = sorted.reduce((sum, f) => sum + getFragmentBounds(f).width, 0);
        const span = last.right - first.left;
        const gap = (span - totalSize) / (sorted.length - 1);
        let cursor = first.left;
        return {
          fragments: state.fragments.map((f) => {
            const idx = sorted.findIndex((s) => s.id === f.id);
            if (idx === -1) return f;
            const b = getFragmentBounds(f);
            const next = { x: cursor, y: f.position.y };
            cursor = cursor + b.width + gap;
            return { ...f, position: next };
          }),
          dirty: true,
          historyPast: pushPast(state, 'distribute'),
          historyFuture: [],
        };
      }
      const sorted = [...selected].sort((a, b) => getFragmentBounds(a).top - getFragmentBounds(b).top);
      const first = getFragmentBounds(sorted[0]);
      const last = getFragmentBounds(sorted[sorted.length - 1]);
      const totalSize = sorted.reduce((sum, f) => sum + getFragmentBounds(f).height, 0);
      const span = last.bottom - first.top;
      const gap = (span - totalSize) / (sorted.length - 1);
      let cursor = first.top;
      return {
        fragments: state.fragments.map((f) => {
          const idx = sorted.findIndex((s) => s.id === f.id);
          if (idx === -1) return f;
          const b = getFragmentBounds(f);
          const next = { x: f.position.x, y: cursor };
          cursor = cursor + b.height + gap;
          return { ...f, position: next };
        }),
        dirty: true,
        historyPast: pushPast(state, 'distribute'),
        historyFuture: [],
      };
    });
  },

  rotateSelection: (delta) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        state.selectedIds.includes(f.id)
          ? { ...f, rotation: normalizeRotation(f.rotation + delta) }
          : f,
      ),
      dirty: true,
      historyPast: pushPast(state, 'rotate'),
      historyFuture: [],
    }));
  },

  nudgeSelection: (dx, dy) => {
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (!state.selectedIds.includes(f.id)) return f;
        const b = getFragmentBounds(f);
        return {
          ...f,
          position: {
            x: Math.max(-b.width + 20, f.position.x + dx),
            y: Math.max(-b.height + 20, f.position.y + dy),
          },
        };
      }),
      dirty: true,
      historyPast: pushPast(state, 'nudge'),
      historyFuture: [],
    }));
  },
}));
