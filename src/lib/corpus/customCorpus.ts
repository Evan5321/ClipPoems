import type { CorpusFragment } from '@/types/corpus';
import { generateId } from '@/lib/utils/id';

const PACKS_KEY = 'clip-poems-custom-corpora';

/** 用户导入的语料包 */
export interface CustomCorpusPack {
  id: string;
  name: string;
  description?: string;
  fragments: CorpusFragment[];
  createdAt: number;
  updatedAt: number;
}

export function listCustomPacks(): CustomCorpusPack[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CustomCorpusPack[];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function persist(packs: CustomCorpusPack[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  } catch {
    // ignore quota errors
  }
}

export function createCustomPack(
  name: string,
  fragments: CorpusFragment[],
  description?: string,
): CustomCorpusPack {
  const packs = listCustomPacks();
  const now = Date.now();
  const pack: CustomCorpusPack = {
    id: generateId(),
    name: name.trim() || `自定义语料 ${packs.length + 1}`,
    description,
    fragments: fragments.map((f) => ({ ...f, corpusId: 'custom_corpus' })),
    createdAt: now,
    updatedAt: now,
  };
  packs.push(pack);
  persist(packs);
  return pack;
}

export function renameCustomPack(id: string, name: string): void {
  const packs = listCustomPacks();
  const idx = packs.findIndex((p) => p.id === id);
  if (idx < 0) return;
  packs[idx] = { ...packs[idx], name: name.trim() || packs[idx].name, updatedAt: Date.now() };
  persist(packs);
}

export function deleteCustomPack(id: string): void {
  persist(listCustomPacks().filter((p) => p.id !== id));
}

export function clearCustomPacks(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PACKS_KEY);
  } catch {
    // ignore
  }
}
