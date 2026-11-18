import type { CorpusFragment } from '@/types/corpus';

const FAVORITES_KEY = 'clip-poems-favorites';

export function loadFavorites(): CorpusFragment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CorpusFragment[];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: CorpusFragment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // ignore
  }
}
