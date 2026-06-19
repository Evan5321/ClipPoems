import { create } from 'zustand';
import type { CanvasFragment, CanvasBackground, CanvasGrid } from '@/types/canvas';

interface CanvasState {
  fragments: CanvasFragment[];
  selectedIds: string[];
  background: CanvasBackground;
  grid: CanvasGrid;
  addFragment: (fragment: CanvasFragment) => void;
  removeFragment: (id: string) => void;
  updateFragment: (id: string, updates: Partial<CanvasFragment>) => void;
  selectFragment: (id: string) => void;
  clearSelection: () => void;
  setBackground: (background: CanvasBackground) => void;
  setGrid: (grid: CanvasGrid) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  fragments: [],
  selectedIds: [],
  background: { type: 'solid', value: '#ffffff', opacity: 1 },
  grid: { enabled: false, spacing: 20 },
  addFragment: () => {},
  removeFragment: () => {},
  updateFragment: () => {},
  selectFragment: () => {},
  clearSelection: () => {},
  setBackground: () => {},
  setGrid: () => {},
}));
