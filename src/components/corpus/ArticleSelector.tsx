'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { generateId } from '@/lib/utils/id';
import { Plus, ChevronDown, ChevronRight, MousePointer2 } from 'lucide-react';

export default function ArticleSelector() {
  const {
    currentCorpusId,
    rawEntriesByCategory,
    addFragment,
    selectedFragments,
  } = useCorpusStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    entryId: string;
    x: number;
    y: number;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // 获取当前分类的原始条目
  const entries = useMemo(() => {
    if (!currentCorpusId) return [];
    return rawEntriesByCategory[currentCorpusId] || [];
  }, [currentCorpusId, rawEntriesByCategory]);

  // 已选的 text 集合（用于标记）
  const selectedTextsSet = useMemo(
    () => new Set(selectedFragments.map((f) => f.text)),
    [selectedFragments],
  );

  // 处理鼠标选中文本
  const handleMouseUp = useCallback(() => {
    if (!selectionMode || !expandedId) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length === 0) {
      setSelectedText(null);
      return;
    }

    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();

    if (rect && containerRect) {
      setSelectedText({
        text,
        entryId: expandedId,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
      });
    }
  }, [selectionMode, expandedId]);

  // 添加选中文本为碎片
  const handleAddSelection = useCallback(() => {
    if (!selectedText) return;

    const entry = entries.find((e) => e.id === selectedText.entryId);
    const fragment = {
      id: generateId(),
      text: selectedText.text,
      source: entry?.title || entry?.source || '语料',
      author: entry?.author,
      dynasty: entry && 'dynasty' in entry ? (entry as any).dynasty : undefined,
      wordCount: selectedText.text.length,
      tags: entry?.tags || [],
      corpusId: currentCorpusId || 'unknown',
    };

    addFragment(fragment);
    setSelectedText(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, entries, currentCorpusId, addFragment]);

  // 点击文档其他区域取消选中浮窗
  useEffect(() => {
    const handler = () => {
      // 延迟检查，等待 handleMouseUp 先触发
      setTimeout(() => {
        if (!window.getSelection()?.toString().trim()) {
          setSelectedText(null);
        }
      }, 200);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">该分类暂无语料数据</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* 左侧：文章列表 */}
      <div className="w-64 shrink-0 space-y-1">
        <p className="mb-2 text-xs text-muted-foreground">
          共 {entries.length} 篇
        </p>
        <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
          {entries.map((entry) => {
            const title =
              entry.title || entry.text?.slice(0, 20) || '未命名';
            const label = entry.author
              ? `${title} — ${entry.author}`
              : title;
            const isExpanded = expandedId === entry.id;
            const hasSelected = selectedFragments.some(
              (f) => f.source.includes(title),
            );

            return (
              <button
                key={entry.id}
                onClick={() =>
                  setExpandedId(isExpanded ? null : entry.id)
                }
                className={`w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${
                  isExpanded
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                } ${hasSelected ? 'ring-1 ring-primary/40' : ''}`}
              >
                <div className="flex items-center gap-1">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{title}</span>
                </div>
                {entry.author && (
                  <p className="mt-0.5 truncate pl-4 text-[10px] text-muted-foreground/60">
                    {entry.author}
                    {'dynasty' in entry && (entry as any).dynasty
                      ? ` · ${(entry as any).dynasty}`
                      : ''}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧：文章内容 */}
      <div className="flex-1" ref={contentRef}>
        {!expandedId && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">请从左侧选择一篇文章</p>
          </div>
        )}

        {expandedId &&
          (() => {
            const entry = entries.find((e) => e.id === expandedId);
            if (!entry) return null;

            const content =
              entry.content || entry.text || entry.meaning || '';
            const showContent =
              typeof content === 'string' && content.length > 0;

            return (
              <div
                className="rounded-lg border bg-card"
                onMouseUp={handleMouseUp}
              >
                {/* 文章头部 */}
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {entry.title || '语料'}
                      </h3>
                      {entry.author && (
                        <p className="text-xs text-muted-foreground">
                          {entry.author}
                          {'dynasty' in entry && (entry as any).dynasty
                            ? ` · ${(entry as any).dynasty}`
                            : ''}
                        </p>
                      )}
                    </div>

                    {/* 划词模式开关 */}
                    <button
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        setSelectedText(null);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        selectionMode
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <MousePointer2 className="h-3.5 w-3.5" />
                      {selectionMode ? '划词中...' : '划词模式'}
                    </button>
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 文章内容 */}
                <div className="relative px-4 py-5">
                  {selectionMode && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      选中文字后点击出现的「+」添加到碎片
                    </p>
                  )}

                  {showContent && (
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {content}
                    </p>
                  )}

                  {/* 释义（成语模式） */}
                  {entry.meaning && entry.type === 'idiom' && (
                    <div className="mt-4 rounded-md bg-secondary/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        释义
                      </p>
                      <p className="mt-1 text-sm">{entry.meaning}</p>
                    </div>
                  )}

                  {/* 拼音 */}
                  {entry.pinyin && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {entry.pinyin}
                    </p>
                  )}

                  {/* 划词添加浮动按钮 */}
                  {selectedText &&
                    selectedText.entryId === expandedId && (
                      <button
                        onClick={handleAddSelection}
                        style={{
                          position: 'absolute',
                          left: selectedText.x,
                          top: selectedText.y,
                          transform: 'translate(-50%, -100%)',
                        }}
                        className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                        title={`添加「${selectedText.text}」`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
