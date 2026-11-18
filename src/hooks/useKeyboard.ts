'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
}

export interface KeyboardOptions {
  /** 保存回调（Ctrl+S） */
  onSave?: () => void;
  /** 复制回调（未选择时若指定） */
  onCopy?: () => void;
}

/**
 * 键盘快捷键系统
 */
export function useKeyboard(shortcuts?: KeyboardShortcut[], options?: KeyboardOptions) {
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const fragments = useCanvasStore((s) => s.fragments);

  const defaultShortcuts = useMemo<KeyboardShortcut[]>(() => [
    { key: 'Escape', handler: () => clearSelection() },
    {
      key: 'Delete',
      handler: () => useCanvasStore.getState().removeFragments(selectedIds),
    },
    {
      key: 'Backspace',
      handler: () => useCanvasStore.getState().removeFragments(selectedIds),
    },
    { key: 'a', ctrl: true, handler: () => useCanvasStore.getState().selectAll() },
    { key: 'z', ctrl: true, handler: () => useCanvasStore.getState().undo() },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      handler: () => useCanvasStore.getState().redo(),
    },
    { key: 'y', ctrl: true, handler: () => useCanvasStore.getState().redo() },
    { key: 'c', ctrl: true, handler: () => (options?.onCopy ? options.onCopy() : useCanvasStore.getState().copySelection()) },
    { key: 'v', ctrl: true, handler: () => useCanvasStore.getState().pasteClipboard() },
    { key: 'd', ctrl: true, handler: () => useCanvasStore.getState().duplicateSelection() },
    {
      key: 's',
      ctrl: true,
      handler: (e) => {
        e.preventDefault();
        options?.onSave?.();
      },
    },
    {
      key: '[',
      handler: () => useCanvasStore.getState().rotateSelection(-5),
    },
    {
      key: ']',
      handler: () => useCanvasStore.getState().rotateSelection(5),
    },
    {
      key: '[',
      ctrl: true,
      shift: true,
      handler: () => useCanvasStore.getState().sendBackward(selectedIds[0] || ''),
    },
    {
      key: ']',
      ctrl: true,
      shift: true,
      handler: () => useCanvasStore.getState().bringForward(selectedIds[0] || ''),
    },
    // 方向键微调
    { key: 'ArrowLeft', handler: () => useCanvasStore.getState().nudgeSelection(-1, 0) },
    { key: 'ArrowRight', handler: () => useCanvasStore.getState().nudgeSelection(1, 0) },
    { key: 'ArrowUp', handler: () => useCanvasStore.getState().nudgeSelection(0, -1) },
    { key: 'ArrowDown', handler: () => useCanvasStore.getState().nudgeSelection(0, 1) },
    {
      key: 'ArrowLeft',
      shift: true,
      handler: () => useCanvasStore.getState().nudgeSelection(-10, 0),
    },
    {
      key: 'ArrowRight',
      shift: true,
      handler: () => useCanvasStore.getState().nudgeSelection(10, 0),
    },
    {
      key: 'ArrowUp',
      shift: true,
      handler: () => useCanvasStore.getState().nudgeSelection(0, -10),
    },
    {
      key: 'ArrowDown',
      shift: true,
      handler: () => useCanvasStore.getState().nudgeSelection(0, 10),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [clearSelection, selectedIds, fragments, options]);

  const allShortcuts = useMemo(
    () => [...defaultShortcuts, ...(shortcuts || [])],
    [defaultShortcuts, shortcuts],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 输入框 / 文本域 / 可编辑元素中，除 Escape 与 Ctrl 组合外不拦截
      const target = e.target as HTMLElement | null;
      const isEditing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditing && e.key !== 'Escape' && !(e.ctrlKey || e.metaKey)) return;

      for (const sc of allShortcuts) {
        const ctrlMatch = sc.ctrl ? e.ctrlKey || e.metaKey : !(e.ctrlKey || e.metaKey);
        const shiftMatch = sc.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = sc.alt ? e.altKey : true;
        if (e.key === sc.key && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          sc.handler(e);
          return;
        }
      }
    },
    [allShortcuts],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
