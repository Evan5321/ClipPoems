import { create } from 'zustand';
import type { CorpusFragment, Corpus } from '@/types/corpus';
import {
  loadAllCorpusData,
  searchFragments,
  BUILTIN_CORPORA,
  type CorpusDataMap,
} from '@/lib/corpus/loader';

interface CorpusState {
  /** 语料库元数据列表 */
  corpora: Corpus[];
  /** 所有已加载的碎片（按分类ID索引） */
  fragmentsByCategory: CorpusDataMap;
  /** 用户已经选中的碎片（待拖入画布） */
  selectedFragments: CorpusFragment[];
  /** 搜索关键词 */
  searchQuery: string;
  /** 当前选中的语料库分类 */
  currentCorpusId: string | null;
  /** 搜索结果 */
  searchResults: CorpusFragment[];
  /** 加载状态 */
  isLoading: boolean;
  /** 是否已初始化 */
  isLoaded: boolean;

  /** 初始化加载所有语料 */
  loadAllCorpora: () => Promise<void>;
  /** 设置语料库列表 */
  setCorpora: (corpora: Corpus[]) => void;
  /** 切换当前语料库 */
  setCurrentCorpus: (id: string) => void;
  /** 设置搜索关键词并执行搜索 */
  setSearchQuery: (query: string) => void;
  /** 添加碎片到选中列表 */
  addFragment: (fragment: CorpusFragment) => void;
  /** 从选中列表移除碎片 */
  removeFragment: (id: string) => void;
  /** 清空选中列表 */
  clearSelection: () => void;
  /** 获取当前语料库的所有碎片 */
  getCurrentFragments: () => CorpusFragment[];
  /** 获取指定分类的碎片 */
  getFragmentsByCategory: (categoryId: string) => CorpusFragment[];
}

export const useCorpusStore = create<CorpusState>((set, get) => ({
  corpora: [...BUILTIN_CORPORA],
  fragmentsByCategory: {},
  selectedFragments: [],
  searchQuery: '',
  currentCorpusId: 'classical_poetry',
  searchResults: [],
  isLoading: false,
  isLoaded: false,

  loadAllCorpora: async () => {
    set({ isLoading: true });
    try {
      const data = await loadAllCorpusData();
      set({
        fragmentsByCategory: data,
        corpora: [...BUILTIN_CORPORA],
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load corpus data:', error);
      set({ isLoading: false, isLoaded: true });
    }
  },

  setCorpora: (corpora) => set({ corpora }),

  setCurrentCorpus: (id) => set({ currentCorpusId: id }),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const results = searchFragments(get().fragmentsByCategory, query);
    set({ searchResults: results });
  },

  addFragment: (fragment) =>
    set((state) => ({
      selectedFragments: state.selectedFragments.some((f) => f.id === fragment.id)
        ? state.selectedFragments
        : [...state.selectedFragments, fragment],
    })),

  removeFragment: (id) =>
    set((state) => ({
      selectedFragments: state.selectedFragments.filter((f) => f.id !== id),
    })),

  clearSelection: () => set({ selectedFragments: [] }),

  getCurrentFragments: () => {
    const { currentCorpusId, fragmentsByCategory } = get();
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  },

  getFragmentsByCategory: (categoryId) => {
    return get().fragmentsByCategory[categoryId] || [];
  },
}));