export interface CorpusFragment {
  id: string;
  text: string;
  source: string;
  author?: string;
  posTag?: string;
  wordCount: number;
  tags: string[];
  corpusId: string;
}

export interface Corpus {
  id: string;
  name: string;
  type: 'builtin' | 'imported' | 'crawled';
  description: string;
  language: 'zh' | 'en' | 'mixed';
  fragmentCount: number;
  tags: string[];
}
