'use client';

import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
}

/**
 * 键盘快捷键系统
 */
export function useKeyboard(shortcuts?: KeyboardShortcut[]) {
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const removeFragment = useCanvasStore((s) => s.removeFragment);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const fragments = useCanvasStore((s) => s.fragments);

  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: 'Escape',
      handler: () => clearSelection(),
    },
    {
      key: 'Delete',
      handler: () => {
        selectedIds.forEach((id) => removeFragment(id));
      },
    },
    {
      key: 'Backspace',
      handler: () => {
        selectedIds.forEach((id) => removeFragment(id));
      },
    },
    {
      key: 'a',
      ctrl: true,
      handler: () => {
        // 全选 — 将 selectFragment 改为选中全部
        fragments.forEach((f) => {
          if (!selectedIds.includes(f.id)) {
            useCanvasStore.getState().selectFragment(f.id);
          }
        });
      },
    },
  ];

  const allShortcuts = [...defaultShortcuts, ...(shortcuts || [])];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const sc of allShortcuts) {
        const ctrlMatch = sc.ctrl ? e.ctrlKey || e.metaKey : true;
        const shiftMatch = sc.shift ? e.shiftKey : true;

        if (
          e.key === sc.key &&
          ctrlMatch &&
          shiftMatch
        ) {
          e.preventDefault();
          sc.handler();
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
