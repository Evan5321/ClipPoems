import { create } from 'zustand';
import type { CorpusFragment, Corpus, CorpusEntry } from '@/types/corpus';
import {
  loadAllCorpusData,
  searchFragments,
  loadAllCorpusRawData,
  BUILTIN_CORPORA,
  type CorpusDataMap,
  type CorpusRawMap,
} from '@/lib/corpus/loader';
import { loadSelectedDraft, saveSelectedDraft } from '@/lib/corpus/fragmentGroups';

interface CorpusState {
  /** 语料库元数据列表 */
  corpora: Corpus[];
  /** 所有已加载的碎片（按分类ID索引） */
  fragmentsByCategory: CorpusDataMap;
  /** 所有原始语料条目（按分类ID索引，供文章划词使用） */
  rawEntriesByCategory: CorpusRawMap;
  /** 用户已经选中的碎片（待拖入画布） */
  selectedFragments: CorpusFragment[];
  /** 搜索关键词 */
  searchQuery: string;
  /** 当前选中的语料库分类 */
  currentCorpusId: string | null;
  /** 搜索结果 */
  searchResults: CorpusFragment[];
  /** 随机模式是否开启 */
  randomMode: boolean;
  /** 随机抽取的碎片列表 */
  randomFragments: CorpusFragment[];
  /** 随机范围 */
  randomScope: 'current' | 'all';
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
  /** 加载碎片组到选中列表（替换当前选中） */
  loadFragmentGroup: (fragments: CorpusFragment[]) => void;
  /** 随机抽取碎片（scope: 'current' 当前分类 | 'all' 全部分类） */
  loadRandom: (count: number, scope: 'current' | 'all') => void;
  /** 退出随机模式 */
  exitRandom: () => void;
  /** 获取当前语料库的所有碎片 */
  getCurrentFragments: () => CorpusFragment[];
  /** 获取指定分类的碎片 */
  getFragmentsByCategory: (categoryId: string) => CorpusFragment[];
  /** 获取当前分类的原始条目列表 */
  getCurrentRawEntries: () => CorpusEntry[];
}

export const useCorpusStore = create<CorpusState>((set, get) => ({
  corpora: [...BUILTIN_CORPORA],
  fragmentsByCategory: {},
  rawEntriesByCategory: {},
  selectedFragments: loadSelectedDraft(),
  searchQuery: '',
  currentCorpusId: 'recommend_corpus',
  searchResults: [],
  randomMode: false,
  randomFragments: [],
  randomScope: 'current',
  isLoading: false,
  isLoaded: false,

  loadAllCorpora: async () => {
    set({ isLoading: true });
    try {
      const [data, rawData] = await Promise.all([
        loadAllCorpusData(),
        Promise.resolve(loadAllCorpusRawData()),
      ]);
      set({
        fragmentsByCategory: data,
        rawEntriesByCategory: rawData,
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

  loadRandom: (count, scope) => {
    const { fragmentsByCategory, currentCorpusId } = get();
    let pool: CorpusFragment[] = [];
    if (scope === 'current') {
      pool = (currentCorpusId ? fragmentsByCategory[currentCorpusId] : []) || [];
    } else {
      pool = Object.values(fragmentsByCategory).flat();
    }
    // Fisher-Yates 洗牌
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

  exitRandom: () =>
    set({ randomMode: false, randomFragments: [], randomScope: 'current' }),

  getCurrentFragments: () => {
    const { currentCorpusId, fragmentsByCategory } = get();
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  },

  getFragmentsByCategory: (categoryId) => {
    return get().fragmentsByCategory[categoryId] || [];
  },

  getCurrentRawEntries: () => {
    const { currentCorpusId, rawEntriesByCategory } = get();
    if (!currentCorpusId) return [];
    return rawEntriesByCategory[currentCorpusId] || [];
  },
}));
