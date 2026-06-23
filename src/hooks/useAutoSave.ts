'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

const SAVE_INTERVAL = 30000; // 30s

/**
 * 自动保存画布状态到 localStorage
 */
export function useAutoSave(canvasId?: string) {
  const fragments = useCanvasStore((s) => s.fragments);
  const background = useCanvasStore((s) => s.background);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRef = useRef('');

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const snapshot = JSON.stringify({ fragments, background });
      if (snapshot === prevRef.current) return; // 无变化跳过

      prevRef.current = snapshot;
      const key = canvasId
        ? `clip-poems-auto-save-${canvasId}`
        : 'clip-poems-auto-save';

      try {
        localStorage.setItem(key, snapshot);
      } catch {
        // localStorage 满时静默失败
      }
    }, SAVE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fragments, background, canvasId]);

  /**
   * 手动保存
   */
  const saveNow = () => {
    const snapshot = JSON.stringify({ fragments, background });
    const key = canvasId
      ? `clip-poems-auto-save-${canvasId}`
      : 'clip-poems-auto-save';
    localStorage.setItem(key, snapshot);
  };

  /**
   * 从 localStorage 加载自动保存的数据
   */
  const loadSaved = () => {
    const key = canvasId
      ? `clip-poems-auto-save-${canvasId}`
      : 'clip-poems-auto-save';
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  return { saveNow, loadSaved };
}
