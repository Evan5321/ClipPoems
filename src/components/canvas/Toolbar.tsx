'use client';

import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';
import {
  Save,
  Download,
  Undo2,
  Redo2,
  Trash2,
  BringToFront,
  SendToBack,
  MoveUp,
  MoveDown,
  PanelLeftOpen,
  PanelRightOpen,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ToolbarProps {
  /** 保存回调 */
  onSave?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 左侧面板切换 */
  onToggleLeftPanel?: () => void;
  /** 右侧面板切换 */
  onToggleRightPanel?: () => void;
  /** 左侧面板是否打开 */
  leftPanelOpen?: boolean;
  /** 右侧面板是否打开 */
  rightPanelOpen?: boolean;
}

export default function Toolbar({
  onSave,
  onExport,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen = true,
  rightPanelOpen = true,
}: ToolbarProps) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const fragments = useCanvasStore((s) => s.fragments);
  const removeFragment = useCanvasStore((s) => s.removeFragment);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);
  const bringForward = useCanvasStore((s) => s.bringForward);
  const sendBackward = useCanvasStore((s) => s.sendBackward);
  const hasSelection = selectedIds.length > 0;
  const hasMultipleSelected = selectedIds.length > 1;

  const handleDelete = () => {
    selectedIds.forEach((id) => removeFragment(id));
    clearSelection();
  };

  return (
    <div className="flex h-12 items-center justify-between border-b bg-background px-3">
      {/* Left: Panel toggles + file ops */}
      <div className="flex items-center gap-0.5">
        {/* Toggle left panel */}
        <button
          onClick={onToggleLeftPanel}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          title={leftPanelOpen ? '隐藏语料面板' : '显示语料面板'}
        >
          <PanelLeftOpen className={`h-4 w-4 transition-transform ${leftPanelOpen ? '' : 'rotate-180'}`} />
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Save */}
        <button
          onClick={onSave}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          title="保存 (Ctrl+S)"
        >
          <Save className="h-4 w-4" />
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          title="导出 (PNG)"
        >
          <Download className="h-4 w-4" />
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Undo/Redo (placeholder) */}
        <button
          className="rounded p-1.5 text-muted-foreground/40 hover:bg-secondary"
          title="撤销 — 即将实现"
          disabled
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          className="rounded p-1.5 text-muted-foreground/40 hover:bg-secondary"
          title="重做 — 即将实现"
          disabled
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Center: Canvas info */}
      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <span>{fragments.length} 个碎片</span>
        {hasSelection && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            已选 {selectedIds.length}
          </span>
        )}
      </div>

      {/* Right: Ordering + delete */}
      <div className="flex items-center gap-0.5">
        {hasSelection && (
          <>
            {/* Z-order operations */}
            <button
              onClick={() => selectedIds.forEach((id) => bringToFront(id))}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="置顶"
            >
              <BringToFront className="h-4 w-4" />
            </button>
            <button
              onClick={() => selectedIds.forEach((id) => sendToBack(id))}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="置底"
            >
              <SendToBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => selectedIds.forEach((id) => bringForward(id))}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="上移一层"
            >
              <MoveUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => selectedIds.forEach((id) => sendBackward(id))}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
              title="下移一层"
            >
              <MoveDown className="h-4 w-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              title="删除 (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Toggle right panel */}
        <div className="mx-2 h-6 w-px bg-border" />
        <button
          onClick={onToggleRightPanel}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          title={rightPanelOpen ? '隐藏设置面板' : '显示设置面板'}
        >
          <PanelRightOpen className={`h-4 w-4 transition-transform ${rightPanelOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </div>
  );
}