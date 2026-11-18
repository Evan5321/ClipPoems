'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * 响应式断点：
 *  - desktop：>= 1200px（三栏）
 *  - tablet ：768px ~ 1199px（画布 + 浮动面板）
 *  - mobile ：< 768px（全屏画布 + 底部弹出面板）
 */
export function useBreakpoint(): Breakpoint {
  const get = (): Breakpoint => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop';
    if (window.matchMedia('(min-width: 768px)').matches) return 'tablet';
    return 'mobile';
  };

  // 首帧必须与服务端一致（'desktop'），挂载后再按真实窗口宽度校正，否则窄视口会触发 Hydration 错误
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBp(get());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}
