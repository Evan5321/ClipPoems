'use client';

import { useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { CORPUS_CATEGORIES } from '@/lib/corpus/loader';
import CorpusSearch from './CorpusSearch';
import FragmentGrid from './FragmentGrid';
import ArticleSelector from './ArticleSelector';
import RecommendedWords from './RecommendedWords';
import WordSelector from './WordSelector';

type ViewMode = 'grid' | 'article' | 'recommended';

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'grid', label: '碎片网格' },
  { id: 'article', label: '文章划词' },
  { id: 'recommended', label: '推荐分词' },
];

export default function CorpusPanel() {
  const { currentCorpusId, setCurrentCorpus, isLoaded, isLoading } = useCorpusStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const isIdiom = currentCorpusId === 'idiom';

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col">
      {/* 顶部：分类标签 + 模式切换 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        {/* 分类标签 */}
        <div className="flex flex-wrap gap-1.5">
          {CORPUS_CATEGORIES.map((cat) => {
            const isActive = currentCorpusId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCurrentCorpus(cat.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`ml-0.5 text-[10px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 模式切换 */}
        <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
          {VIEW_MODES.map((mode) => {
            const isActive = viewMode === mode.id;
            const disabled = mode.id === 'article' && isIdiom;
            return (
              <button
                key={mode.id}
                onClick={() => !disabled && setViewMode(mode.id)}
                disabled={disabled}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
                title={disabled && mode.id === 'article' ? '成语分类不支持文章划词' : undefined}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索栏（只在 grid 模式显示） */}
      {viewMode === 'grid' && (
        <div className="border-b px-4 py-2.5">
          <CorpusSearch />
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">加载语料数据中...</p>
          </div>
        </div>
      )}

      {/* 未加载状态 */}
      {!isLoaded && !isLoading && (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">语料库未加载</p>
            <button
              onClick={() => useCorpusStore.getState().loadAllCorpora()}
              className="mt-2 text-xs text-primary hover:underline"
            >
              点击重新加载
            </button>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      {isLoaded && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {viewMode === 'grid' && <FragmentGrid />}
          {viewMode === 'article' && !isIdiom && <ArticleSelector />}
          {viewMode === 'recommended' && <RecommendedWords />}
        </div>
      )}

      {/* 底部：已选中碎片列表 */}
      <WordSelector />
    </div>
  );
}
