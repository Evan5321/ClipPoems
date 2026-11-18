'use client';

import { useCanvasStore } from '@/store/canvasStore';
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
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';

interface ToolbarProps {
  onSave?: () => void;
  onExport?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  leftPanelOpen?: boolean;
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
  const historyPastLen = useCanvasStore((s) => s.historyPast.length);
  const historyFutureLen = useCanvasStore((s) => s.historyFuture.length);

  const removeFragments = useCanvasStore((s) => s.removeFragments);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);
  const bringForward = useCanvasStore((s) => s.bringForward);
  const sendBackward = useCanvasStore((s) => s.sendBackward);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const alignSelected = useCanvasStore((s) => s.alignSelected);
  const distributeSelected = useCanvasStore((s) => s.distributeSelected);

  const hasSelection = selectedIds.length > 0;
  const canUndo = historyPastLen > 0;
  const canRedo = historyFutureLen > 0;

  const handleDelete = () => {
    removeFragments(selectedIds);
    clearSelection();
  };

  const iconBtn =
    'rounded p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="flex h-12 items-center justify-between border-b bg-background px-3">
      {/* Left: panel toggles + file ops */}
      <div className="flex items-center gap-0.5">
        <button onClick={onToggleLeftPanel} className={iconBtn} title={leftPanelOpen ? '隐藏语料面板' : '显示语料面板'}>
          <PanelLeftOpen className={`h-4 w-4 transition-transform ${leftPanelOpen ? '' : 'rotate-180'}`} />
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        <button onClick={onSave} className={iconBtn} title="保存 (Ctrl+S)">
          <Save className="h-4 w-4" />
        </button>
        <button onClick={onExport} className={iconBtn} title="导出">
          <Download className="h-4 w-4" />
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        <button onClick={undo} disabled={!canUndo} className={iconBtn} title="撤销 (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={!canRedo} className={iconBtn} title="重做 (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Center: align/distribute (仅多选时) */}
      <div className="hidden items-center gap-0.5 md:flex">
        {hasSelection && (
          <>
            <button onClick={() => alignSelected('left')} className={iconBtn} title="左对齐">
              <AlignLeft className="h-4 w-4" />
            </button>
            <button onClick={() => alignSelected('centerX')} className={iconBtn} title="水平居中对齐">
              <AlignCenterHorizontal className="h-4 w-4" />
            </button>
            <button onClick={() => alignSelected('right')} className={iconBtn} title="右对齐">
              <AlignRight className="h-4 w-4" />
            </button>
            <button onClick={() => alignSelected('top')} className={iconBtn} title="顶部对齐">
              <AlignStartVertical className="h-4 w-4" />
            </button>
            <button onClick={() => alignSelected('centerY')} className={iconBtn} title="垂直居中对齐">
              <AlignCenterVertical className="h-4 w-4" />
            </button>
            <button onClick={() => alignSelected('bottom')} className={iconBtn} title="底部对齐">
              <AlignEndVertical className="h-4 w-4" />
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <button onClick={() => distributeSelected('horizontal')} className={iconBtn} title="水平均匀分布">
              <AlignHorizontalSpaceAround className="h-4 w-4" />
            </button>
            <button onClick={() => distributeSelected('vertical')} className={iconBtn} title="垂直均匀分布">
              <AlignVerticalSpaceAround className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Center info */}
      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <span>{fragments.length} 个碎片</span>
        {hasSelection && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">已选 {selectedIds.length}</span>}
      </div>

      {/* Right: ordering + delete */}
      <div className="flex items-center gap-0.5">
        {hasSelection && (
          <>
            <button onClick={() => selectedIds.forEach((id) => bringToFront(id))} className={iconBtn} title="置顶">
              <BringToFront className="h-4 w-4" />
            </button>
            <button onClick={() => selectedIds.forEach((id) => sendToBack(id))} className={iconBtn} title="置底">
              <SendToBack className="h-4 w-4" />
            </button>
            <button onClick={() => selectedIds.forEach((id) => bringForward(id))} className={iconBtn} title="上移一层">
              <MoveUp className="h-4 w-4" />
            </button>
            <button onClick={() => selectedIds.forEach((id) => sendBackward(id))} className={iconBtn} title="下移一层">
              <MoveDown className="h-4 w-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-border" />

            <button
              onClick={handleDelete}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              title="删除 (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="mx-2 h-6 w-px bg-border" />
        <button
          onClick={onToggleRightPanel}
          className={iconBtn}
          title={rightPanelOpen ? '隐藏设置面板' : '显示设置面板'}
        >
          <PanelRightOpen className={`h-4 w-4 transition-transform ${rightPanelOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </div>
  );
}
