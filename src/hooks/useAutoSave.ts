'use client';

import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasSnapshot } from '@/types/canvas';

const SAVE_INTERVAL = 30000; // 30s

interface AutoSaveData {
  title: string;
  snapshot: CanvasSnapshot;
}

/**
 * 自动保存画布状态到 localStorage（完整快照，30s 间隔，无变化跳过）
 */
export function useAutoSave(canvasId?: string) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRef = useRef('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const state = useCanvasStore.getState();
      const data: AutoSaveData = { title: state.title, snapshot: state.getSnapshot() };
      const snap = JSON.stringify(data);
      if (snap === prevRef.current) return; // 无变化跳过
      prevRef.current = snap;
      const key = canvasId ? `clip-poems-auto-${canvasId}` : 'clip-poems-auto';
      try {
        localStorage.setItem(key, snap);
        setSavedAt(Date.now());
      } catch {
        // localStorage 满时静默失败
      }
    }, SAVE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [canvasId]);

  /** 手动保存（写入自动保存槽） */
  const saveNow = () => {
    const state = useCanvasStore.getState();
    const data: AutoSaveData = { title: state.title, snapshot: state.getSnapshot() };
    prevRef.current = JSON.stringify(data);
    const key = canvasId ? `clip-poems-auto-${canvasId}` : 'clip-poems-auto';
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setSavedAt(Date.now());
    } catch {
      // ignore
    }
  };

  /** 从 localStorage 加载自动保存的数据 */
  const loadSaved = (): AutoSaveData | null => {
    const key = canvasId ? `clip-poems-auto-${canvasId}` : 'clip-poems-auto';
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as AutoSaveData;
    } catch {
      return null;
    }
  };

  return { saveNow, loadSaved, savedAt };
}
