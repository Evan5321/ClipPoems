'use client';

import { useEffect } from 'react';
import { useCorpusStore } from '@/store/corpusStore';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const loadAllCorpora = useCorpusStore((s) => s.loadAllCorpora);
  const isLoaded = useCorpusStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      loadAllCorpora();
    }
  }, [loadAllCorpora, isLoaded]);

  return <>{children}</>;
}