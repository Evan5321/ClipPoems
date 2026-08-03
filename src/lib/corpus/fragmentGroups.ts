import type { CorpusFragment } from '@/types/corpus';
import { generateId } from '@/lib/utils/id';

const GROUPS_KEY = 'clip-poems-fragment-groups';
const SELECTED_KEY = 'clip-poems-selected-fragments';

/** 碎片组（命名的碎片集合） */
export interface FragmentGroup {
  id: string;
  name: string;
  fragments: CorpusFragment[];
  createdAt: number;
  updatedAt: number;
}

/** 读取所有碎片组（按更新时间降序） */
export function listFragmentGroups(): FragmentGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as FragmentGroup[];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** 创建新碎片组 */
export function saveFragmentGroup(name: string, fragments: CorpusFragment[]): FragmentGroup {
  const groups = listFragmentGroups();
  const now = Date.now();
  const group: FragmentGroup = {
    id: generateId(),
    name: name.trim() || `碎片组 ${groups.length + 1}`,
    fragments,
    createdAt: now,
    updatedAt: now,
  };
  groups.push(group);
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // ignore
  }
  return group;
}

/** 重命名碎片组 */
export function renameFragmentGroup(id: string, name: string): void {
  const groups = listFragmentGroups();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx < 0) return;
  groups[idx] = { ...groups[idx], name: name.trim() || groups[idx].name, updatedAt: Date.now() };
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // ignore
  }
}

/** 删除单个碎片组 */
export function deleteFragmentGroup(id: string): void {
  const groups = listFragmentGroups().filter((g) => g.id !== id);
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // ignore
  }
}

/** 清空所有碎片组 */
export function clearAllFragmentGroups(): void {
  try {
    localStorage.removeItem(GROUPS_KEY);
  } catch {
    // ignore
  }
}

// ---- selectedFragments 自动持久化（防止刷新丢失） ----

/** 读取自动保存的已选碎片 */
export function loadSelectedDraft(): CorpusFragment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CorpusFragment[];
  } catch {
    return [];
  }
}

/** 自动保存已选碎片 */
export function saveSelectedDraft(fragments: CorpusFragment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(fragments));
  } catch {
    // ignore
  }
}

/** 清除自动保存的已选碎片 */
export function clearSelectedDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SELECTED_KEY);
  } catch {
    // ignore
  }
}
