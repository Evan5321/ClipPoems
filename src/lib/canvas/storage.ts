import type { CanvasSnapshot } from '@/types/canvas';
import { generateId } from '@/lib/utils/id';

const WORKS_KEY = 'clip-poems-works';

/** 作品记录 */
export interface Work {
  id: string;
  title: string;
  snapshot: CanvasSnapshot;
  /** 缩略图 dataURL（可选） */
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

/** 读取所有作品（按更新时间降序） */
export function listWorks(): Work[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Work[];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** 读取单个作品 */
export function getWork(id: string): Work | null {
  return listWorks().find((w) => w.id === id) || null;
}

/** 创建或更新作品（返回保存后的 Work） */
export function saveWork(work: Work): Work {
  const works = listWorks();
  const idx = works.findIndex((w) => w.id === work.id);
  const now = Date.now();
  const updated: Work = { ...work, updatedAt: now };
  if (idx >= 0) {
    works[idx] = { ...works[idx], ...updated, createdAt: works[idx].createdAt };
  } else {
    updated.createdAt = now;
    works.push(updated);
  }
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
  } catch {
    // localStorage 满（可能含大缩略图）— 尝试不带缩略图重存
    try {
      localStorage.setItem(
        WORKS_KEY,
        JSON.stringify(works.map((w) => ({ ...w, thumbnail: undefined }))),
      );
    } catch {
      // 放弃
    }
  }
  return updated;
}

/** 新建空作品并保存 */
export function createWork(title = '未命名作品'): Work {
  const work: Work = {
    id: generateId(),
    title,
    snapshot: emptySnapshot(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return saveWork(work);
}

/** 删除作品 */
export function deleteWork(id: string): void {
  const works = listWorks().filter((w) => w.id !== id);
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
  } catch {
    // ignore
  }
}

/** 重命名作品 */
export function renameWork(id: string, title: string): void {
  const works = listWorks();
  const idx = works.findIndex((w) => w.id === id);
  if (idx < 0) return;
  works[idx] = { ...works[idx], title, updatedAt: Date.now() };
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(works));
  } catch {
    // ignore
  }
}

/** 复制作品为新作品（另存为副本） */
export function duplicateWork(id: string, newTitle?: string): Work | null {
  const src = getWork(id);
  if (!src) return null;
  const work: Work = {
    id: generateId(),
    title: newTitle || `${src.title} 副本`,
    snapshot: src.snapshot,
    thumbnail: src.thumbnail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return saveWork(work);
}

function emptySnapshot(): CanvasSnapshot {
  return {
    fragments: [],
    background: { type: 'solid', value: '#f5f0e8', opacity: 1 },
    grid: { enabled: false, spacing: 20 },
    canvasSize: { width: 800, height: 600 },
    globalTextStyle: {
      fontFamily: 'serif',
      fontSize: 24,
      color: '#333333',
      letterSpacing: 2,
      lineHeight: 1.6,
      direction: 'horizontal',
    },
  };
}
