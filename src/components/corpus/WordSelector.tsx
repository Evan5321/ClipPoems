'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { useCanvasStore } from '@/store/canvasStore';
import { X, Trash2, Copy, Send, Save, FolderOpen, Pencil, Check, FolderInput } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import {
  listFragmentGroups,
  saveFragmentGroup,
  renameFragmentGroup,
  deleteFragmentGroup,
  clearAllFragmentGroups,
  type FragmentGroup,
} from '@/lib/corpus/fragmentGroups';

/** 单个可选中的碎片的可拖拽包装 */
function DraggableWordItem({ fragment }: { fragment: { id: string; text: string; author?: string } }) {
  const removeFragment = useCorpusStore((s) => s.removeFragment);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `corpus-${fragment.id}`,
    data: {
      type: 'corpus-fragment',
      fragment: {
        text: fragment.text,
        source: fragment.author || '',
        author: fragment.author,
      },
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group relative flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 pr-7 transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-sm'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="max-w-[160px] truncate text-xs">
        {fragment.text}
      </span>
      {fragment.author && (
        <span className="hidden text-[10px] text-muted-foreground group-hover:inline">
          {fragment.author}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFragment(fragment.id);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function WordSelector() {
  const selectedFragments = useCorpusStore((s) => s.selectedFragments);
  const clearSelection = useCorpusStore((s) => s.clearSelection);
  const loadFragmentGroup = useCorpusStore((s) => s.loadFragmentGroup);
  const addFragmentsFromCorpus = useCanvasStore((s) => s.addFragmentsFromCorpus);

  const [showGroups, setShowGroups] = useState(false);
  const [groups, setGroups] = useState<FragmentGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 初始化时读取已保存的碎片组
  useEffect(() => {
    setGroups(listFragmentGroups());
  }, []);

  const refreshGroups = useCallback(() => {
    setGroups(listFragmentGroups());
  }, []);

  const handleToggleGroups = () => {
    const next = !showGroups;
    setShowGroups(next);
    if (next) refreshGroups();
  };

  const handleSaveGroup = () => {
    if (selectedFragments.length === 0) return;
    const name = prompt('请输入碎片组名称', `碎片组 ${groups.length + 1}`);
    if (!name) return;
    saveFragmentGroup(name, selectedFragments);
    refreshGroups();
    setShowGroups(true);
  };

  const handleLoadGroup = (group: FragmentGroup) => {
    loadFragmentGroup(group.fragments);
  };

  const handleStartRename = (group: FragmentGroup) => {
    setEditingId(group.id);
    setEditingName(group.name);
  };

  const handleConfirmRename = (id: string) => {
    renameFragmentGroup(id, editingName);
    setEditingId(null);
    refreshGroups();
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (confirm(`确定删除碎片组「${name}」吗？`)) {
      deleteFragmentGroup(id);
      refreshGroups();
    }
  };

  const handleClearAllGroups = () => {
    if (confirm('确定清空所有碎片组吗？此操作不可撤销。')) {
      clearAllFragmentGroups();
      refreshGroups();
    }
  };

  const handleSendToCanvas = () => {
    addFragmentsFromCorpus(
      selectedFragments.map((f) => ({
        text: f.text,
        source: f.source,
        author: f.author,
      })),
    );
  };

  // 无选中碎片、未展开组面板、且无已保存组时不显示
  if (selectedFragments.length === 0 && !showGroups && groups.length === 0) return null;

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 py-2">
        {/* 顶栏：标题 + 操作按钮 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              已选中碎片
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {selectedFragments.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 发送到画布按钮 */}
            {selectedFragments.length > 0 && (
              <button
                onClick={handleSendToCanvas}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                title="发送选中碎片到画布"
              >
                <Send className="h-3 w-3" />
                发送到画布
              </button>
            )}
            {selectedFragments.length > 0 && (
              <button
                onClick={() => {
                  const text = selectedFragments.map((f) => f.text).join(' ');
                  navigator.clipboard.writeText(text);
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                title="复制所有文本"
              >
                <Copy className="h-3 w-3" />
                复制
              </button>
            )}
            {/* 保存碎片组 */}
            {selectedFragments.length > 0 && (
              <button
                onClick={handleSaveGroup}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                title="保存当前选中碎片为命名组"
              >
                <Save className="h-3 w-3" />
                保存组
              </button>
            )}
            {/* 我的碎片组 */}
            <button
              onClick={handleToggleGroups}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                showGroups
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
              title="查看和管理已保存的碎片组"
            >
              <FolderOpen className="h-3 w-3" />
              我的组
              {groups.length > 0 && (
                <span className="ml-0.5 text-[10px] text-muted-foreground">{groups.length}</span>
              )}
            </button>
            {/* 清空选中 */}
            {selectedFragments.length > 0 && (
              <button
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
                title="清空全部选中"
              >
                <Trash2 className="h-3 w-3" />
                清空
              </button>
            )}
          </div>
        </div>

        {/* 碎片组管理面板 */}
        {showGroups && (
          <div className="mb-2 rounded-md border bg-secondary/30 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                已保存的碎片组（{groups.length}）
              </span>
              {groups.length > 0 && (
                <button
                  onClick={handleClearAllGroups}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  清空全部
                </button>
              )}
            </div>
            {groups.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                还没有保存的碎片组，选中碎片后点击「保存组」
              </p>
            ) : (
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-1.5 rounded px-2 py-1.5 hover:bg-secondary"
                  >
                    {editingId === group.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename(group.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-5 flex-1 rounded border bg-background px-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() => handleConfirmRename(group.id)}
                          className="rounded p-0.5 text-primary hover:bg-primary/10"
                          title="确认"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
                          title="取消"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-xs font-medium">{group.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {group.fragments.length} 片
                        </span>
                        <button
                          onClick={() => handleLoadGroup(group)}
                          className="rounded p-0.5 text-primary hover:bg-primary/10"
                          title="加载此碎片组"
                        >
                          <FolderInput className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleStartRename(group)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="重命名"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 碎片列表（多行排列，可拖拽，限制高度约为视口三分之一，超出部分可竖向滚动） */}
        {selectedFragments.length > 0 && (
          <div className="flex max-h-[33vh] flex-wrap gap-2 overflow-y-auto pb-2">
            {selectedFragments.map((fragment) => (
              <DraggableWordItem key={fragment.id} fragment={fragment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
