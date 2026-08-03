'use client';

import { useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasBackground } from '@/types/canvas';

/** 尺寸预设 */
const SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: '方形 1:1', width: 800, height: 800 },
  { label: 'A4 竖', width: 794, height: 1123 },
  { label: 'A4 横', width: 1123, height: 794 },
  { label: '16:9 横', width: 960, height: 540 },
  { label: '9:16 竖', width: 540, height: 960 },
  { label: '3:4 竖', width: 600, height: 800 },
];

/** 纯色预设 */
const SOLID_PRESETS = [
  '#f5f0e8', '#ffffff', '#fff8e7', '#fef3c7',
  '#e8e8e8', '#d6c9b3', '#1a1a1a', '#2c3e50',
];

/** 渐变预设（CSS gradient 字符串） */
const GRADIENT_PRESETS: { label: string; value: string }[] = [
  { label: '米黄纸', value: 'linear-gradient(135deg, #f5f0e8, #ede4d3)' },
  { label: '暖橙', value: 'linear-gradient(135deg, #ffecd2, #fcb69f)' },
  { label: '冷蓝', value: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)' },
  { label: '暮紫', value: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
  { label: '青草', value: 'linear-gradient(135deg, #d4fc79, #96e6a1)' },
  { label: '粉樱', value: 'linear-gradient(135deg, #ffdde1, #ee9ca7)' },
  { label: '深夜', value: 'linear-gradient(135deg, #2c3e50, #4ca1af)' },
  { label: '落日', value: 'linear-gradient(135deg, #ff9a9e, #fad0c4)' },
];

/** 缩放预设 */
const ZOOM_PRESETS: { label: string; value: number }[] = [
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
];

/** 中文字体预设 */
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: '宋体', value: 'serif' },
  { label: '楷体', value: "'KaiTi', '楷体', serif" },
  { label: '行楷', value: "'STXingkai', '华文行楷', serif" },
  { label: '仿宋', value: "'FangSong', '仿宋', serif" },
  { label: '黑体', value: 'sans-serif' },
  { label: '隶书', value: "'LiSu', '隶书', serif" },
  { label: '新魏', value: "'STXinwei', '华文新魏', serif" },
];

/** 文字颜色预设 */
const TEXT_COLOR_PRESETS = [
  '#333333', '#1a1a1a', '#ffffff', '#8b5e3c',
  '#c0392b', '#d97706', '#2563eb', '#7c3aed',
  '#059669', '#be185d', '#6b7280', '#000000',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

export default function CanvasSettings() {
  const canvasSize = useCanvasStore((s) => s.canvasSize);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
  const background = useCanvasStore((s) => s.background);
  const setBackground = useCanvasStore((s) => s.setBackground);
  const grid = useCanvasStore((s) => s.grid);
  const setGrid = useCanvasStore((s) => s.setGrid);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const requestFit = useCanvasStore((s) => s.requestFit);
  const globalTextStyle = useCanvasStore((s) => s.globalTextStyle);
  const setGlobalTextStyle = useCanvasStore((s) => s.setGlobalTextStyle);
  const applyStyleToAll = useCanvasStore((s) => s.applyStyleToAll);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateGlobal = (patch: Partial<typeof globalTextStyle>) =>
    setGlobalTextStyle({ ...globalTextStyle, ...patch });

  const updateBg = (patch: Partial<CanvasBackground>) => {
    setBackground({ ...background, ...patch });
  };

  /** 图片上传 → dataURL */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateBg({ type: 'image', value: reader.result as string });
    };
    reader.readAsDataURL(file);
    // 清空 input 允许重复选同一文件
    e.target.value = '';
  };

  return (
    <div className="space-y-4 p-3">
      {/* 画布尺寸 */}
      <Section title="画布尺寸">
        <div className="grid grid-cols-2 gap-1">
          {SIZE_PRESETS.map((p) => {
            const active = canvasSize.width === p.width && canvasSize.height === p.height;
            return (
              <button
                key={p.label}
                onClick={() => setCanvasSize({ width: p.width, height: p.height })}
                className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-secondary'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            宽
            <input
              type="number"
              min={100}
              max={4000}
              value={canvasSize.width}
              onChange={(e) => setCanvasSize({ width: Number(e.target.value), height: canvasSize.height })}
              className="h-6 w-16 rounded-md border bg-background px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <span className="text-[11px] text-muted-foreground">×</span>
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            高
            <input
              type="number"
              min={100}
              max={4000}
              value={canvasSize.height}
              onChange={(e) => setCanvasSize({ width: canvasSize.width, height: Number(e.target.value) })}
              className="h-6 w-16 rounded-md border bg-background px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
      </Section>

      {/* 背景类型 */}
      <Section title="背景">
        <div className="grid grid-cols-4 gap-1">
          {(['solid', 'gradient', 'image', 'texture'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === 'solid') updateBg({ type: 'solid', value: background.value || '#f5f0e8' });
                else if (t === 'gradient') updateBg({ type: 'gradient', value: GRADIENT_PRESETS[0].value });
                else if (t === 'image') updateBg({ type: 'image', value: background.value || '' });
                else updateBg({ type: 'texture', value: background.value || '' });
              }}
              className={`rounded-md border px-1 py-1 text-[10px] transition-colors ${
                background.type === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-secondary'
              }`}
            >
              {t === 'solid' ? '纯色' : t === 'gradient' ? '渐变' : t === 'image' ? '图片' : '纹理'}
            </button>
          ))}
        </div>

        {/* 纯色 */}
        {background.type === 'solid' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-8 gap-1">
              {SOLID_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateBg({ value: c })}
                  className={`h-5 w-full rounded border transition-transform hover:scale-110 ${
                    background.value.toLowerCase() === c.toLowerCase()
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'border-border'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={background.value}
                onChange={(e) => updateBg({ value: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
              />
              <input
                type="text"
                value={background.value}
                onChange={(e) => updateBg({ value: e.target.value })}
                className="h-6 flex-1 rounded-md border bg-background px-2 text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* 渐变 */}
        {background.type === 'gradient' && (
          <div className="grid grid-cols-4 gap-1">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.label}
                onClick={() => updateBg({ value: g.value })}
                className={`h-8 rounded-md border text-[9px] text-white/90 transition-transform hover:scale-105 ${
                  background.value === g.value ? 'ring-2 ring-primary ring-offset-1' : 'border-border'
                }`}
                style={{ backgroundImage: g.value }}
                title={g.label}
              >
                <span className="drop-shadow">{g.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 图片 / 纹理 */}
        {(background.type === 'image' || background.type === 'texture') && (
          <div className="space-y-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-md border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground hover:bg-secondary"
            >
              {background.value ? '更换图片' : '点击上传图片'}
            </button>
            {background.value && (
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-12 rounded border border-border bg-cover bg-center"
                  style={{ backgroundImage: `url("${background.value}")` }}
                />
                <span className="flex-1 truncate text-[10px] text-muted-foreground">
                  {background.type === 'texture' ? '平铺纹理' : '覆盖填充'}
                </span>
                <button
                  onClick={() => updateBg({ value: '' })}
                  className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary"
                >
                  清除
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 背景透明度 */}
      <Section title={`背景透明度 ${Math.round(background.opacity * 100)}%`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={background.opacity}
          onChange={(e) => updateBg({ opacity: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
      </Section>

      {/* 网格 */}
      <Section title="网格">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">显示网格</span>
          <button
            onClick={() => setGrid({ ...grid, enabled: !grid.enabled })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              grid.enabled ? 'bg-primary' : 'bg-secondary'
            }`}
            aria-label="切换网格"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                grid.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {grid.enabled && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">间距</span>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={5}
                max={80}
                step={1}
                value={grid.spacing}
                onChange={(e) => setGrid({ ...grid, spacing: Number(e.target.value) })}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <span className="w-8 text-[11px] tabular-nums text-muted-foreground">{grid.spacing}px</span>
            </div>
          </div>
        )}
      </Section>

      {/* 全局文字样式 */}
      <Section title="全局文字样式">
        {/* 字体 */}
        <select
          value={globalTextStyle.fontFamily}
          onChange={(e) => updateGlobal({ fontFamily: e.target.value })}
          className="h-7 w-full rounded-md border bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-primary"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* 字号 + 方向 */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            字号
            <input
              type="number"
              min={8}
              max={120}
              value={globalTextStyle.fontSize}
              onChange={(e) => updateGlobal({ fontSize: Number(e.target.value) })}
              className="h-6 w-14 rounded-md border bg-background px-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <div className="ml-auto flex items-center gap-0.5 rounded-md border p-0.5">
            <button
              onClick={() => updateGlobal({ direction: 'horizontal' })}
              className={`rounded px-2 py-0.5 text-[10px] ${
                globalTextStyle.direction !== 'vertical'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              横排
            </button>
            <button
              onClick={() => updateGlobal({ direction: 'vertical' })}
              className={`rounded px-2 py-0.5 text-[10px] ${
                globalTextStyle.direction === 'vertical'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              竖排
            </button>
          </div>
        </div>

        {/* 默认颜色 */}
        <div className="grid grid-cols-6 gap-1">
          {TEXT_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => updateGlobal({ color: c })}
              className={`h-5 rounded border transition-transform hover:scale-110 ${
                globalTextStyle.color?.toLowerCase() === c.toLowerCase()
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'border-border'
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={globalTextStyle.color}
            onChange={(e) => updateGlobal({ color: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
          />
          <input
            type="text"
            value={globalTextStyle.color}
            onChange={(e) => updateGlobal({ color: e.target.value })}
            className="h-6 flex-1 rounded-md border bg-background px-2 text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* 字间距 + 行高 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">字间距</span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={globalTextStyle.letterSpacing}
              onChange={(e) => updateGlobal({ letterSpacing: Number(e.target.value) })}
              className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            />
            <span className="w-7 text-[11px] tabular-nums text-muted-foreground">{globalTextStyle.letterSpacing}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">行高</span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={globalTextStyle.lineHeight}
              onChange={(e) => updateGlobal({ lineHeight: Number(e.target.value) })}
              className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            />
            <span className="w-7 text-[11px] tabular-nums text-muted-foreground">{globalTextStyle.lineHeight}</span>
          </div>
        </div>

        {/* 应用到所有碎片 */}
        <button
          onClick={applyStyleToAll}
          className="w-full rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[11px] text-primary hover:bg-primary/10"
        >
          应用到所有碎片
        </button>
      </Section>

      {/* 缩放 */}
      <Section title="缩放">
        <div className="grid grid-cols-5 gap-1">
          {ZOOM_PRESETS.map((z) => (
            <button
              key={z.label}
              onClick={() => setZoom(z.value)}
              className="rounded-md border px-1 py-1 text-[10px] hover:bg-secondary"
            >
              {z.label}
            </button>
          ))}
          <button
            onClick={() => requestFit()}
            className="rounded-md border px-1 py-1 text-[10px] hover:bg-secondary"
            title="适配屏幕"
          >
            适配
          </button>
        </div>
      </Section>
    </div>
  );
}
