'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCorpusStore } from '@/store/corpusStore';
import {
  Undo2,
  Redo2,
  CopyPlus,
  ClipboardPaste,
  CheckSquare,
  XSquare,
  Scan,
  Grid3x3,
  Trash2,
} from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export default function CanvasContextMenu({ x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const paste = useCanvasStore((s) => s.pasteClipboard);
  const selectAll = useCanvasStore((s) => s.selectAll);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const requestFit = useCanvasStore((s) => s.requestFit);
  const grid = useCanvasStore((s) => s.grid);
  const setGrid = useCanvasStore((s) => s.setGrid);
  const resetCanvas = useCanvasStore((s) => s.resetCanvas);
  const addFragmentsFromCorpus = useCanvasStore((s) => s.addFragmentsFromCorpus);
  const selectedCorpus = useCorpusStore((s) => s.selectedFragments);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const items: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }[] = [
    {
      label: `发送 ${selectedCorpus.length} 个选中碎片到画布`,
      icon: <CopyPlus className="h-4 w-4" />,
      disabled: selectedCorpus.length === 0,
      onClick: () => {
        addFragmentsFromCorpus(selectedCorpus.map((f) => ({ text: f.text, source: f.source, author: f.author })));
        onClose();
      },
    },
    { label: '粘贴', icon: <ClipboardPaste className="h-4 w-4" />, onClick: () => { paste(); onClose(); } },
    { separator: true } as any,
    { label: '撤销', icon: <Undo2 className="h-4 w-4" />, onClick: () => { undo(); onClose(); } },
    { label: '重做', icon: <Redo2 className="h-4 w-4" />, onClick: () => { redo(); onClose(); } },
    { label: '全选', icon: <CheckSquare className="h-4 w-4" />, onClick: () => { selectAll(); onClose(); } },
    { label: '取消选择', icon: <XSquare className="h-4 w-4" />, onClick: () => { clearSelection(); onClose(); } },
    { label: '适配屏幕', icon: <Scan className="h-4 w-4" />, onClick: () => { requestFit(); onClose(); } },
    {
      label: grid.enabled ? '隐藏网格' : '显示网格',
      icon: <Grid3x3 className="h-4 w-4" />,
      onClick: () => { setGrid({ ...grid, enabled: !grid.enabled }); onClose(); },
    },
    {
      label: '清空画布',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        if (confirm('确定清空画布上的所有碎片吗？')) resetCanvas();
        onClose();
      },
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[90] w-56 rounded-md border bg-background p-1 shadow-xl"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ((item as any).separator) {
          return <div key={i} className="my-1 h-px bg-border" />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={item.onClick}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
