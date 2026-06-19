import { create } from 'zustand';
import type { CorpusFragment, Corpus } from '@/types/corpus';

interface CorpusState {
  corpora: Corpus[];
  selectedFragments: CorpusFragment[];
  searchQuery: string;
  currentCorpusId: string | null;
  setCorpora: (corpora: Corpus[]) => void;
  setCurrentCorpus: (id: string) => void;
  setSearchQuery: (query: string) => void;
  addFragment: (fragment: CorpusFragment) => void;
  removeFragment: (id: string) => void;
  clearSelection: () => void;
}

export const useCorpusStore = create<CorpusState>((set) => ({
  corpora: [],
  selectedFragments: [],
  searchQuery: '',
  currentCorpusId: null,
  setCorpora: () => {},
  setCurrentCorpus: () => {},
  setSearchQuery: () => {},
  addFragment: () => {},
  removeFragment: () => {},
  clearSelection: () => {},
}));
