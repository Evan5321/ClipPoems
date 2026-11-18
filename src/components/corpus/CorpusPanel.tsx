'use client';

import { useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import CorpusSearch from './CorpusSearch';
import FragmentGrid from './FragmentGrid';
import ArticleSelector from './ArticleSelector';
import RecommendedWords from './RecommendedWords';
import WordSelector from './WordSelector';
import CustomCorpusManager from './CustomCorpusManager';
import CorpusImportDialog from './CorpusImportDialog';
import { Upload, RotateCw } from 'lucide-react';

type ViewMode = 'grid' | 'article' | 'recommended';

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'grid', label: '碎片网格' },
  { id: 'article', label: '文章划词' },
  { id: 'recommended', label: '推荐分词' },
];

/** 仅内置的、有原文的分类支持文章划词 */
const ARTICLE_CATEGORIES = ['classical_poetry', 'modern_literature', 'daily_corpus', 'recommend_corpus'];

export default function CorpusPanel() {
  const { currentCorpusId, setCurrentCorpus, isLoaded, isLoading, categories, error } = useCorpusStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [importOpen, setImportOpen] = useState(false);

  const canUseArticle = !!currentCorpusId && ARTICLE_CATEGORIES.includes(currentCorpusId);
  const isUserCategory = currentCorpusId === 'custom_corpus' || currentCorpusId === 'favorites';

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col">
      {/* 顶部：语料分类下拉 + 导入语料（单行，节省纵向空间） */}
      <div className="border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <select
            value={currentCorpusId ?? ''}
            onChange={(e) => setCurrentCorpus(e.target.value)}
            aria-label="语料分类"
            className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} title={cat.description}>
                {cat.icon} {cat.label}（{cat.count}）
              </option>
            ))}
          </select>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            <Upload className="h-3 w-3" />
            导入语料
          </button>
        </div>
      </div>

      {/* 模式切换 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
          {VIEW_MODES.map((mode) => {
            const disabled = mode.id === 'article' && !canUseArticle;
            return (
              <button
                key={mode.id}
                onClick={() => !disabled && setViewMode(mode.id)}
                disabled={disabled}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActiveClass(mode.id, viewMode)
                    ? 'bg-background text-foreground shadow-sm'
                    : disabled
                      ? 'cursor-not-allowed text-muted-foreground/40'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
                title={disabled && mode.id === 'article' ? '该分类不支持文章划词' : undefined}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        {isUserCategory && (
          <span className="text-[10px] text-muted-foreground">
            {currentCorpusId === 'custom_corpus' ? '导入的语料' : '点击碎片上的 ⭐ 收藏'}
          </span>
        )}
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

      {/* 错误状态 */}
      {!isLoading && error && (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => useCorpusStore.getState().loadAllCorpora()}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RotateCw className="h-3 w-3" />
              重新加载
            </button>
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
      {isLoaded && !error && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {currentCorpusId === 'custom_corpus' && (
            <CustomCorpusManager onImport={() => setImportOpen(true)} />
          )}
          {viewMode === 'grid' && <FragmentGrid />}
          {viewMode === 'article' && canUseArticle && <ArticleSelector />}
          {viewMode === 'recommended' && <RecommendedWords />}
        </div>
      )}

      {/* 底部：已选中碎片列表 */}
      <WordSelector />

      <CorpusImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function isActiveClass(mode: ViewMode, current: ViewMode) {
  return mode === current;
}
