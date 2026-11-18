'use client';

import { useMemo, useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { Check, Plus, LayoutGrid, List, Shuffle, Star } from 'lucide-react';
import ThemePacks from './ThemePacks';

type FragmentLayout = 'grid' | 'list';

export default function FragmentGrid() {
  const [layout, setLayout] = useState<FragmentLayout>('list');

  const {
    currentCorpusId,
    fragmentsByCategory,
    searchResults,
    searchQuery,
    selectedFragments,
    favorites,
    addFragment,
    removeFragment,
    toggleFavorite,
    randomMode,
    randomFragments,
    randomScope,
    loadRandom,
    exitRandom,
    isLoading,
  } = useCorpusStore();

  const displayFragments = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    if (randomMode) return randomFragments;
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  }, [searchQuery, searchResults, randomMode, randomFragments, currentCorpusId, fragmentsByCategory]);

  const selectedIds = useMemo(() => new Set(selectedFragments.map((f) => f.id)), [selectedFragments]);
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const isIdiomMode = currentCorpusId === 'idiom';
  const isFavorites = currentCorpusId === 'favorites';
  const isCustom = currentCorpusId === 'custom_corpus';

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

  if (isLoading) {
    return (
      <div className="space-y-1">
        {randomToolbar}
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

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
                : isFavorites
                  ? '还没有收藏任何碎片'
                  : isCustom
                    ? '还没有导入自定义语料'
                    : '该分类暂无语料数据'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFavorites
              ? '点击任意碎片右上角的 ⭐ 即可收藏'
              : isCustom
                ? '点击上方「导入」按钮，支持 TXT / Markdown / CSV'
                : searchQuery.trim()
                  ? '试试其他关键词'
                  : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {randomToolbar}
      <ThemePacks />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {randomMode ? `随机 ${displayFragments.length} 个` : `共 ${displayFragments.length} 个碎片`}
        </p>
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <button
            onClick={() => setLayout('grid')}
            className={`rounded px-1.5 py-1 text-xs transition-colors ${
              layout === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="网格视图"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={`rounded px-1.5 py-1 text-xs transition-colors ${
              layout === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="列表视图"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayFragments.map((fragment) => {
            const isSelected = selectedIds.has(fragment.id);
            return (
              <div
                key={fragment.id}
                role="button"
                tabIndex={0}
                onClick={() => (isSelected ? removeFragment(fragment.id) : addFragment(fragment))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') isSelected ? removeFragment(fragment.id) : addFragment(fragment);
                }}
                className={`group relative cursor-pointer rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(fragment);
                  }}
                  className={`absolute right-2 top-2 rounded p-0.5 transition-colors ${
                    favoriteIds.has(fragment.id)
                      ? 'text-amber-500'
                      : 'text-muted-foreground/40 opacity-0 hover:text-amber-500 group-hover:opacity-100'
                  }`}
                  title={favoriteIds.has(fragment.id) ? '取消收藏' : '收藏'}
                >
                  <Star className={`h-3.5 w-3.5 ${favoriteIds.has(fragment.id) ? 'fill-current' : ''}`} />
                </button>

                {isSelected && (
                  <div className="absolute right-8 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                <p className={`break-all pr-6 text-sm leading-relaxed ${isSelected ? 'text-primary' : 'text-card-foreground'}`}>
                  {fragment.text}
                </p>

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

                {!isSelected && (
                  <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {displayFragments.map((fragment, index) => {
            const isSelected = selectedIds.has(fragment.id);
            return (
              <div
                key={fragment.id}
                role="button"
                tabIndex={0}
                onClick={() => (isSelected ? removeFragment(fragment.id) : addFragment(fragment))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') isSelected ? removeFragment(fragment.id) : addFragment(fragment);
                }}
                className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground/50">{index + 1}</span>
                <span className={`flex-1 truncate text-sm ${isSelected ? 'font-medium text-primary' : 'text-card-foreground'}`}>
                  {fragment.text}
                </span>

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

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(fragment);
                  }}
                  className={`shrink-0 rounded p-0.5 transition-colors ${
                    favoriteIds.has(fragment.id)
                      ? 'text-amber-500'
                      : 'text-muted-foreground/40 opacity-0 hover:text-amber-500 group-hover:opacity-100'
                  }`}
                  title={favoriteIds.has(fragment.id) ? '取消收藏' : '收藏'}
                >
                  <Star className={`h-3.5 w-3.5 ${favoriteIds.has(fragment.id) ? 'fill-current' : ''}`} />
                </button>

                {isSelected ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary opacity-0 transition-all group-hover:bg-primary/10 group-hover:opacity-100">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
