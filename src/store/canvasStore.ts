import { create } from 'zustand';
import type { CanvasFragment, CanvasBackground, CanvasGrid } from '@/types/canvas';
import { generateId } from '@/lib/utils/id';

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

  addFragment: (fragment) =>
    set((state) => ({
      fragments: [
        ...state.fragments,
        { ...fragment, id: fragment.id || generateId() },
      ],
    })),

  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),

  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    })),

  selectFragment: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  setBackground: (background) => set({ background }),

  setGrid: (grid) => set({ grid }),
}));