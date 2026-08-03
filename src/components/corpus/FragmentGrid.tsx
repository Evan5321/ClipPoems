'use client';

import { useMemo, useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { Check, Plus, LayoutGrid, List, Shuffle } from 'lucide-react';

type FragmentLayout = 'grid' | 'list';

export default function FragmentGrid() {
  const [layout, setLayout] = useState<FragmentLayout>('list');

  const {
    currentCorpusId,
    fragmentsByCategory,
    searchResults,
    searchQuery,
    selectedFragments,
    addFragment,
    removeFragment,
    randomMode,
    randomFragments,
    randomScope,
    loadRandom,
    exitRandom,
  } = useCorpusStore();

  // Decide which fragments to display
  const displayFragments = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    if (randomMode) return randomFragments;
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  }, [searchQuery, searchResults, randomMode, randomFragments, currentCorpusId, fragmentsByCategory]);

  // Selected ID set (fast lookup)
  const selectedIds = useMemo(
    () => new Set(selectedFragments.map((f) => f.id)),
    [selectedFragments],
  );

  const isIdiomMode = currentCorpusId === 'idiom';

  // 随机语料工具栏（空状态与非空状态都显示）
  const randomToolbar = (
    <div className="mb-3 flex items-center gap-1.5">
      <button
        onClick={() => loadRandom(10, 'current')}
        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
          randomMode && randomScope === 'current'
            ? 'border-primary bg-primary/10 text-primary'
            : 'bg-card hover:border-primary/50 hover:bg-primary/5'
        }`}
        title="从当前分类随机抽取 10 个"
      >
        <Shuffle className="h-3.5 w-3.5" />
        随机10个
      </button>
      <button
        onClick={() => loadRandom(10, 'all')}
        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
          randomMode && randomScope === 'all'
            ? 'border-primary bg-primary/10 text-primary'
            : 'bg-card hover:border-primary/50 hover:bg-primary/5'
        }`}
        title="从全部分类随机抽取 10 个"
      >
        <Shuffle className="h-3.5 w-3.5" />
        全部随机
      </button>
      {randomMode && (
        <>
          <span className="text-[10px] text-muted-foreground">
            {randomScope === 'all' ? '全部范围' : '当前分类'} · 随机 {randomFragments.length} 个
          </span>
          <button
            onClick={exitRandom}
            className="ml-auto rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            退出随机
          </button>
        </>
      )}
    </div>
  );

  // Empty state
  if (!displayFragments || displayFragments.length === 0) {
    return (
      <div className="space-y-1">
        {randomToolbar}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg text-muted-foreground">
            {randomMode
              ? '该范围暂无语料数据'
              : searchQuery.trim()
                ? '没有找到匹配的结果'
                : '该分类暂无语料数据'}
          </p>
          {searchQuery.trim() && (
            <p className="mt-1 text-sm text-muted-foreground">
              试试其他关键词
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {randomToolbar}

      {/* Top bar: count + layout toggle */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {randomMode ? `随机 ${displayFragments.length} 个` : `共 ${displayFragments.length} 个碎片`}
        </p>
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <button
            onClick={() => setLayout('grid')}
            className={`rounded px-1.5 py-1 text-xs transition-colors ${
              layout === 'grid'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="网格视图"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={`rounded px-1.5 py-1 text-xs transition-colors ${
              layout === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="列表视图"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Fragments */}
      {layout === 'grid' ? (
        /* ---- Grid layout ---- */
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayFragments.map((fragment) => {
            const isSelected = selectedIds.has(fragment.id);

            return (
              <button
                key={fragment.id}
                onClick={() => {
                  if (isSelected) {
                    removeFragment(fragment.id);
                  } else {
                    addFragment(fragment);
                  }
                }}
                className={`group relative rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                {/* Fragment text */}
                <p
                  className={`break-all text-sm leading-relaxed ${
                    isSelected ? 'text-primary' : 'text-card-foreground'
                  }`}
                >
                  {fragment.text}
                </p>

                {/* Meta info */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {fragment.author && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fragment.author}
                      {fragment.dynasty && ` · ${fragment.dynasty}`}
                    </span>
                  )}
                  {fragment.posTag && !isIdiomMode && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {posTagLabel(fragment.posTag)}
                    </span>
                  )}
                  {fragment.wordCount > 4 && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fragment.wordCount}字
                    </span>
                  )}
                </div>

                {/* Add button (hover) */}
                {!isSelected && (
                  <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* ---- List layout ---- */
        <div className="space-y-1">
          {displayFragments.map((fragment) => {
            const isSelected = selectedIds.has(fragment.id);

            return (
              <button
                key={fragment.id}
                onClick={() => {
                  if (isSelected) {
                    removeFragment(fragment.id);
                  } else {
                    addFragment(fragment);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {/* Index number */}
                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground/50">
                  {displayFragments.indexOf(fragment) + 1}
                </span>

                {/* Fragment text */}
                <span
                  className={`flex-1 truncate text-sm ${
                    isSelected ? 'font-medium text-primary' : 'text-card-foreground'
                  }`}
                >
                  {fragment.text}
                </span>

                {/* Meta info */}
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {fragment.author && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fragment.author}
                    </span>
                  )}
                  {fragment.posTag && !isIdiomMode && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {posTagLabel(fragment.posTag)}
                    </span>
                  )}
                  {fragment.wordCount > 4 && (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fragment.wordCount}字
                    </span>
                  )}
                </div>

                {/* Selected badge / add button */}
                {isSelected ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/0 text-primary opacity-0 transition-all group-hover:bg-primary/10 group-hover:opacity-100">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** POS tag Chinese label */
function posTagLabel(tag: string): string {
  const map: Record<string, string> = {
    noun: '名词',
    verb: '动词',
    adj: '形容词',
    adv: '副词',
    location: '地点',
    time: '时间',
    emotion: '情感',
    nature: '自然',
    body: '身体',
    color: '颜色',
    number: '数字',
    name: '人名',
    other: '其他',
    char: '字',
  };
  return map[tag] || tag;
}