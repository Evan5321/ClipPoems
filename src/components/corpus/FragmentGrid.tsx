'use client';

import { useMemo } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { Check, Plus } from 'lucide-react';

export default function FragmentGrid() {
  const {
    currentCorpusId,
    fragmentsByCategory,
    searchResults,
    searchQuery,
    selectedFragments,
    addFragment,
    removeFragment,
  } = useCorpusStore();

  // 决定显示哪些碎片（直接依赖 currentCorpusId 和 fragmentsByCategory）
  const displayFragments = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    if (!currentCorpusId) return [];
    return fragmentsByCategory[currentCorpusId] || [];
  }, [searchQuery, searchResults, currentCorpusId, fragmentsByCategory]);

  // 已选 ID 集合（快速查询）
  const selectedIds = useMemo(
    () => new Set(selectedFragments.map((f) => f.id)),
    [selectedFragments],
  );

  // 判断当前分类
  const isIdiomMode = currentCorpusId === 'idiom';

  // 空状态
  if (!displayFragments || displayFragments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-muted-foreground">
          {searchQuery.trim()
            ? '没有找到匹配的结果'
            : '该分类暂无语料数据'}
        </p>
        {searchQuery.trim() && (
          <p className="mt-1 text-sm text-muted-foreground">
            试试其他关键词
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* 结果统计 */}
      <p className="mb-3 text-xs text-muted-foreground">
        共 {displayFragments.length} 个碎片
      </p>

      {/* 碎片网格 */}
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
              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* 碎片文字 */}
              <p
                className={`break-all text-sm leading-relaxed ${
                  isSelected ? 'text-primary' : 'text-card-foreground'
                }`}
              >
                {fragment.text}
              </p>

              {/* 元信息 */}
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

              {/* 添加按钮（hover 显示） */}
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
    </div>
  );
}

/** 词性标签中文显示 */
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
