'use client';

import { create } from 'zustand';
import type { CanvasFragment, CanvasBackground, CanvasGrid, Position, GlobalTextStyle, CanvasSnapshot } from '@/types/canvas';
import { generateId } from '@/lib/utils/id';
import { generateTornEdgePercent } from '@/lib/canvas/clipPaths';

/** 根据文本和字号估算碎片尺寸（中文等宽，确保默认单行显示） */
function estimateFragmentSize(text: string, fontSize: number): { width: number; height: number } {
  // 中文一字宽度 ≈ fontSize；用 1.05 系数留出余量，避免边缘字符换行
  const charWidth = fontSize * 1.05;
  const padding = 16;
  const lines = text.split('\n');
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  return {
    width: Math.round(maxLineLen * charWidth + padding * 2),
    height: Math.round(lines.length * (fontSize * 1.4) + padding * 2),
  };
}

/** 从文本生成撕裂边缘 clip-path（百分比格式） */
function makeClipPath(text: string, fontSize: number, seed: string): string {
  const { width, height } = estimateFragmentSize(text, fontSize);
  const hashCode = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return generateTornEdgePercent({
    width,
    height,
    roughness: 0.08,
    segments: 4,
    seed: hashCode,
  });
}

interface CanvasState {
  fragments: CanvasFragment[];
  selectedIds: string[];
  /** 画布尺寸（像素） */
  canvasSize: { width: number; height: number };
  background: CanvasBackground;
  grid: CanvasGrid;
  /** 画布缩放级别 */
  zoom: number;
  /** 画布平移偏移 */
  panOffset: { x: number; y: number };
  /** 全局自增 zIndex 计数器 */
  _zCounter: number;
  /** 适配屏幕信号（递增触发 Canvas 执行 fitToScreen） */
  fitSignal: number;
  /** 全局文字默认样式（新建碎片继承） */
  globalTextStyle: GlobalTextStyle;
  /** 作品标题 */
  title: string;
  /** 是否有未保存的变更 */
  dirty: boolean;

  addFragment: (fragment: Partial<CanvasFragment> & { text: string }) => string;
  removeFragment: (id: string) => void;
  updateFragment: (id: string, updates: Partial<CanvasFragment>) => void;
  /** 更新碎片文本并重算尺寸/撕裂边缘 clipPath */
  updateFragmentText: (id: string, text: string) => void;
  /** 批量更新单个碎片的 style 字段（局部合并） */
  updateFragmentStyle: (id: string, style: Partial<CanvasFragment['style']>) => void;
  /** 手动调整碎片宽高（标记 userSized，后续字号/文字变化不再重算） */
  resizeFragment: (id: string, width: number, height: number) => void;
  selectFragment: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setBackground: (background: CanvasBackground) => void;
  setGrid: (grid: CanvasGrid) => void;
  /** 请求画布适配屏幕（递增 fitSignal） */
  requestFit: () => void;
  /** 设置全局文字默认样式 */
  setGlobalTextStyle: (style: GlobalTextStyle) => void;
  /** 将全局样式应用到所有现有碎片 */
  applyStyleToAll: () => void;
  /** 设置作品标题 */
  setTitle: (title: string) => void;
  /** 从快照恢复画布 */
  loadSnapshot: (snapshot: CanvasSnapshot) => void;
  /** 导出当前画布快照 */
  getSnapshot: () => CanvasSnapshot;
  /** 标记为已保存（清除 dirty） */
  markSaved: () => void;
  /** 重置画布到初始空状态（清空所有内容） */
  resetCanvas: () => void;
  /** 将碎片移到最上层 */
  bringToFront: (id: string) => void;
  /** 将碎片移到最下层 */
  sendToBack: (id: string) => void;
  /** zIndex 上移一层 */
  bringForward: (id: string) => void;
  /** zIndex 下移一层 */
  sendBackward: (id: string) => void;
  /** 从语料碎片批量添加到画布 */
  addFragmentsFromCorpus: (fragments: Array<{ text: string; source?: string; author?: string }>) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  fragments: [],
  selectedIds: [],
  canvasSize: { width: 800, height: 600 },
  background: { type: 'solid', value: '#f5f0e8', opacity: 1 },
  grid: { enabled: false, spacing: 20 },
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  _zCounter: 1,
  fitSignal: 0,
  globalTextStyle: {
    fontFamily: 'serif',
    fontSize: 24,
    color: '#333333',
    letterSpacing: 2,
    lineHeight: 1.6,
    direction: 'horizontal',
  },
  title: '未命名作品',
  dirty: false,

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
      rotation: partial.rotation !== undefined
        ? partial.rotation
        : (5 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1),
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
    }));

    return id;
  },

  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      dirty: true,
    })),

  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
      dirty: true,
    })),

  updateFragmentText: (id, text) =>
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (f.id !== id) return f;
        // 用户已手动调整过尺寸 → 仅更新文本，文字在新尺寸下自适应换行
        if (f.userSized) {
          return { ...f, text };
        }
        const fontSize = f.style?.fontSize || 24;
        const { width, height } = estimateFragmentSize(text, fontSize);
        return {
          ...f,
          text,
          width,
          height,
          clipPath: makeClipPath(text, fontSize, id),
        };
      }),
      dirty: true,
    })),

  updateFragmentStyle: (id, style) =>
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (f.id !== id) return f;
        const nextStyle = { ...f.style, ...style };
        // 字号变化时：若用户未手动调整过尺寸，则同步重算尺寸与撕裂边缘
        if (
          style.fontSize !== undefined &&
          style.fontSize !== f.style?.fontSize &&
          !f.userSized
        ) {
          const { width, height } = estimateFragmentSize(f.text, style.fontSize);
          return {
            ...f,
            style: nextStyle,
            width,
            height,
            clipPath: makeClipPath(f.text, style.fontSize, id),
          };
        }
        return { ...f, style: nextStyle };
      }),
      dirty: true,
    })),

  resizeFragment: (id, width, height) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id
          ? {
              ...f,
              width: Math.max(40, Math.round(width)),
              height: Math.max(30, Math.round(height)),
              userSized: true,
            }
          : f,
      ),
      dirty: true,
    })),

  selectFragment: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    })),

  selectAll: () =>
    set((state) => ({
      selectedIds: state.fragments.map((f) => f.id),
    })),

  clearSelection: () => set({ selectedIds: [] }),

  setBackground: (background) => set({ background, dirty: true }),

  setGrid: (grid) => set({ grid, dirty: true }),

  setCanvasSize: (size) =>
    set({
      canvasSize: {
        width: Math.max(100, Math.round(size.width)),
        height: Math.max(100, Math.round(size.height)),
      },
      dirty: true,
    }),

  requestFit: () => set((s) => ({ fitSignal: s.fitSignal + 1 })),

  setGlobalTextStyle: (style) => set({ globalTextStyle: { ...get().globalTextStyle, ...style }, dirty: true }),

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
    }));
  },

  setTitle: (title) => set({ title, dirty: true }),

  loadSnapshot: (snapshot) =>
    set({
      fragments: snapshot.fragments,
      background: snapshot.background,
      grid: snapshot.grid,
      canvasSize: snapshot.canvasSize,
      globalTextStyle: snapshot.globalTextStyle,
      selectedIds: [],
      _zCounter: snapshot.fragments.reduce((max, f) => Math.max(max, f.zIndex), 0) + 1,
      dirty: false,
    }),

  markSaved: () => set({ dirty: false }),

  resetCanvas: () =>
    set({
      fragments: [],
      selectedIds: [],
      canvasSize: { width: 800, height: 600 },
      background: { type: 'solid', value: '#f5f0e8', opacity: 1 },
      grid: { enabled: false, spacing: 20 },
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      _zCounter: 1,
      fitSignal: 0,
      globalTextStyle: {
        fontFamily: 'serif',
        fontSize: 24,
        color: '#333333',
        letterSpacing: 2,
        lineHeight: 1.6,
        direction: 'horizontal',
      },
      title: '未命名作品',
      dirty: false,
    }),

  getSnapshot: () => {
    const s = get();
    return {
      fragments: s.fragments,
      background: s.background,
      grid: s.grid,
      canvasSize: s.canvasSize,
      globalTextStyle: s.globalTextStyle,
    };
  },

  setZoom: (zoom) => set({ zoom }),

  setPanOffset: (offset) => set({ panOffset: offset }),

  bringToFront: (id) => {
    const maxZ = Math.max(...get().fragments.map((f) => f.zIndex), get()._zCounter);
    set((state) => ({
      _zCounter: maxZ + 1,
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, zIndex: maxZ + 1 } : f,
      ),
      dirty: true,
    }));
  },

  sendToBack: (id) => {
    const minZ = Math.min(...get().fragments.map((f) => f.zIndex), 1);
    set((state) => ({
      _zCounter: state._zCounter + 1,
      fragments: state.fragments.map((f) => {
        if (f.id === id) return { ...f, zIndex: minZ - 1 };
        return f;
      }),
      dirty: true,
    }));
  },

  bringForward: (id) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, zIndex: f.zIndex + 1 } : f,
      ),
      _zCounter: state._zCounter + 1,
      dirty: true,
    })),

  sendBackward: (id) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, zIndex: Math.max(0, f.zIndex - 1) } : f,
      ),
      dirty: true,
    })),

  addFragmentsFromCorpus: (corpusFragments) => {
    const state = get();
    let z = state._zCounter;
    const newFragments: CanvasFragment[] = [];
    const startX = 40;
    const startY = 40;

    for (let i = 0; i < corpusFragments.length; i++) {
      const { text } = corpusFragments[i];
      const fontSize = 24;
      const { width, height } = estimateFragmentSize(text, fontSize);
      const id = generateId();

      const fragment: CanvasFragment = {
        id,
        text,
        position: {
          x: startX + (i % 2) * 30, // 略微左右错开，有层次感
          y: startY + i * (height + 16), // 垂直排列，每个碎片一行
        },
        rotation: (i % 3) * 0.5 - 0.5, // 少许随机旋转，有拼贴感
        scale: 1,
        zIndex: z++,
        style: {
          fontFamily: 'serif',
          fontSize,
          color: '#333333',
          letterSpacing: 2,
          lineHeight: 1.6,
          opacity: 1,
          direction: 'horizontal',
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
    }));
  },
}));