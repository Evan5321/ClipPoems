import { create } from 'zustand';
import type { CorpusFragment, Corpus, CorpusCategory, CorpusEntry } from '@/types/corpus';
import {
  loadAllCorpusData,
  searchFragments,
  loadAllCorpusRawData,
  BUILTIN_CORPORA,
  ALL_CATEGORIES,
  type CorpusDataMap,
  type CorpusRawMap,
} from '@/lib/corpus/loader';
import { loadSelectedDraft, saveSelectedDraft } from '@/lib/corpus/fragmentGroups';
import {
  listCustomPacks,
  createCustomPack,
  renameCustomPack,
  deleteCustomPack,
  type CustomCorpusPack,
} from '@/lib/corpus/customCorpus';
import { loadFavorites, saveFavorites } from '@/lib/corpus/favorites';

/** 把自定义语料包 + 收藏合并进碎片索引 */
function buildUserData(
  base: CorpusDataMap,
  packs: CustomCorpusPack[],
  favorites: CorpusFragment[],
): CorpusDataMap {
  const custom = packs.flatMap((p) =>
    p.fragments.map((f) => ({ ...f, corpusId: 'custom_corpus', tags: [...f.tags, p.name] })),
  );
  return { ...base, custom_corpus: custom, favorites };
}

function categoriesWithCounts(data: CorpusDataMap): CorpusCategory[] {
  return ALL_CATEGORIES.map((c) => ({ ...c, count: (data[c.id] || []).length }));
}

interface CorpusState {
  corpora: Corpus[];
  categories: CorpusCategory[];
  fragmentsByCategory: CorpusDataMap;
  rawEntriesByCategory: CorpusRawMap;
  customPacks: CustomCorpusPack[];
  favorites: CorpusFragment[];
  selectedFragments: CorpusFragment[];
  searchQuery: string;
  currentCorpusId: string | null;
  searchResults: CorpusFragment[];
  randomMode: boolean;
  randomFragments: CorpusFragment[];
  randomScope: 'current' | 'all';
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  loadAllCorpora: () => Promise<void>;
  setCorpora: (corpora: Corpus[]) => void;
  setCurrentCorpus: (id: string) => void;
  setSearchQuery: (query: string) => void;
  addFragment: (fragment: CorpusFragment) => void;
  addFragments: (fragments: CorpusFragment[]) => void;
  removeFragment: (id: string) => void;
  clearSelection: () => void;
  loadFragmentGroup: (fragments: CorpusFragment[]) => void;
  /** 水合后从 localStorage 恢复自动保存的已选碎片（仅客户端挂载后调用） */
  restoreSelectedDraft: () => void;
  loadRandom: (count: number, scope: 'current' | 'all') => void;
  exitRandom: () => void;
  getCurrentFragments: () => CorpusFragment[];
  getFragmentsByCategory: (categoryId: string) => CorpusFragment[];
  getCurrentRawEntries: () => CorpusEntry[];
  /** 导入自定义语料包 */
  importCorpusPack: (name: string, fragments: CorpusFragment[], description?: string) => void;
  /** 重命名自定义语料包 */
  renameCorpusPack: (id: string, name: string) => void;
  /** 删除自定义语料包 */
  deleteCorpusPack: (id: string) => void;
  /** 收藏 / 取消收藏 */
  toggleFavorite: (fragment: CorpusFragment) => void;
  isFavorite: (id: string) => boolean;
}

export const useCorpusStore = create<CorpusState>((set, get) => ({
  corpora: [...BUILTIN_CORPORA],
  categories: ALL_CATEGORIES.map((c) => ({ ...c })),
  fragmentsByCategory: {},
  rawEntriesByCategory: {},
  customPacks: [],
  favorites: [],
  // 初始必须为空数组以保证 SSR 与客户端首次渲染一致（水合后再恢复本地草稿，避免 Hydration 错误）
  selectedFragments: [],
  searchQuery: '',
  currentCorpusId: 'recommend_corpus',
  searchResults: [],
  randomMode: false,
  randomFragments: [],
  randomScope: 'current',
  isLoading: false,
  isLoaded: false,
  error: null,

  loadAllCorpora: async () => {
    set({ isLoading: true, error: null });
    try {
      const [data, rawData] = await Promise.all([
        loadAllCorpusData(),
        Promise.resolve(loadAllCorpusRawData()),
      ]);
      const customPacks = listCustomPacks();
      const favorites = loadFavorites();
      const merged = buildUserData(data, customPacks, favorites);
      set({
        fragmentsByCategory: merged,
        rawEntriesByCategory: rawData,
        categories: categoriesWithCounts(merged),
        customPacks,
        favorites,
        corpora: [...BUILTIN_CORPORA],
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load corpus data:', error);
      set({
        isLoading: false,
        isLoaded: true,
        error: '语料库加载失败，请刷新重试',
      });
    }
  },

  setCorpora: (corpora) => set({ corpora }),

  setCurrentCorpus: (id) =>
    set({ currentCorpusId: id, randomMode: false, randomFragments: [], randomScope: 'current' }),

  setSearchQuery: (query) => {
    set({ searchQuery: query, randomMode: false, randomFragments: [] });
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const results = searchFragments(get().fragmentsByCategory, query);
    set({ searchResults: results });
  },

  addFragment: (fragment) =>
    set((state) => {
      const selectedFragments = state.selectedFragments.some((f) => f.id === fragment.id)
        ? state.selectedFragments
        : [...state.selectedFragments, fragment];
      saveSelectedDraft(selectedFragments);
      return { selectedFragments };
    }),

  addFragments: (fragments) =>
    set((state) => {
      const existingIds = new Set(state.selectedFragments.map((f) => f.id));
      const merged = [...state.selectedFragments, ...fragments.filter((f) => !existingIds.has(f.id))];
      saveSelectedDraft(merged);
      return { selectedFragments: merged };
    }),

  removeFragment: (id) =>
    set((state) => {
      const selectedFragments = state.selectedFragments.filter((f) => f.id !== id);
      saveSelectedDraft(selectedFragments);
      return { selectedFragments };
    }),

  clearSelection: () => {
    saveSelectedDraft([]);
    set({ selectedFragments: [] });
  },

  loadFragmentGroup: (fragments) => {
    saveSelectedDraft(fragments);
    set({ selectedFragments: fragments });
  },

  restoreSelectedDraft: () => {
    set({ selectedFragments: loadSelectedDraft() });
  },

  loadRandom: (count, scope) => {
    const { fragmentsByCategory, currentCorpusId } = get();
    let pool: CorpusFragment[] = [];
    if (scope === 'current') {
      pool = (currentCorpusId ? fragmentsByCategory[currentCorpusId] : []) || [];
    } else {
      pool = Object.values(fragmentsByCategory).flat();
    }
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    set({
      randomMode: true,
      randomFragments: shuffled.slice(0, count),
      randomScope: scope,
      searchQuery: '',
      searchResults: [],
    });
  },

  exitRandom: () => set({ randomMode: false, randomFragments: [], randomScope: 'current' }),

  getCurrentFragments: () => {
    const { currentCorpusId, fragmentsByCategory } = get();
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  },

  getFragmentsByCategory: (categoryId) => get().fragmentsByCategory[categoryId] || [],

  getCurrentRawEntries: () => {
    const { currentCorpusId, rawEntriesByCategory } = get();
    if (!currentCorpusId) return [];
    return rawEntriesByCategory[currentCorpusId] || [];
  },

  importCorpusPack: (name, fragments, description) => {
    const pack = createCustomPack(name, fragments, description);
    set((state) => {
      const customPacks = [pack, ...state.customPacks];
      const fragmentsByCategory = buildUserData(
        {
          classical_poetry: state.fragmentsByCategory.classical_poetry,
          idiom: state.fragmentsByCategory.idiom,
          modern_literature: state.fragmentsByCategory.modern_literature,
          daily_corpus: state.fragmentsByCategory.daily_corpus,
          recommend_corpus: state.fragmentsByCategory.recommend_corpus,
        },
        customPacks,
        state.favorites,
      );
      return {
        customPacks,
        fragmentsByCategory,
        categories: categoriesWithCounts(fragmentsByCategory),
        currentCorpusId: 'custom_corpus',
      };
    });
  },

  renameCorpusPack: (id, name) => {
    renameCustomPack(id, name);
    const customPacks = listCustomPacks();
    set((state) => ({
      customPacks,
      categories: categoriesWithCounts(state.fragmentsByCategory),
    }));
  },

  deleteCorpusPack: (id) => {
    deleteCustomPack(id);
    set((state) => {
      const customPacks = state.customPacks.filter((p) => p.id !== id);
      const fragmentsByCategory = buildUserData(
        {
          classical_poetry: state.fragmentsByCategory.classical_poetry,
          idiom: state.fragmentsByCategory.idiom,
          modern_literature: state.fragmentsByCategory.modern_literature,
          daily_corpus: state.fragmentsByCategory.daily_corpus,
          recommend_corpus: state.fragmentsByCategory.recommend_corpus,
        },
        customPacks,
        state.favorites,
      );
      return {
        customPacks,
        fragmentsByCategory,
        categories: categoriesWithCounts(fragmentsByCategory),
      };
    });
  },

  toggleFavorite: (fragment) => {
    const { favorites } = get();
    const exists = favorites.some((f) => f.id === fragment.id);
    const next = exists
      ? favorites.filter((f) => f.id !== fragment.id)
      : [...favorites, { ...fragment }];
    saveFavorites(next);
    set((state) => {
      const fragmentsByCategory = { ...state.fragmentsByCategory, favorites: next };
      return {
        favorites: next,
        fragmentsByCategory,
        categories: categoriesWithCounts(fragmentsByCategory),
      };
    });
  },

  isFavorite: (id) => get().favorites.some((f) => f.id === id),
}));
