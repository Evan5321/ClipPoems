'use client';

import { useMemo } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasFragmentStyle } from '@/types/canvas';

/** 字体选项 */
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: '衬线 (Serif)', value: 'serif' },
  { label: '宋体', value: '"SimSun", "宋体", serif' },
  { label: '楷体', value: '"KaiTi", "楷体", serif' },
  { label: '仿宋', value: '"FangSong", "仿宋", serif' },
  { label: '黑体', value: '"SimHei", "黑体", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '无衬线 (Sans)', value: 'sans-serif' },
];

/** 预设墨色 */
const PRESET_COLORS = [
  '#333333', '#1a1a1a', '#5b4636', '#8b5a2b',
  '#a93226', '#1e3a8a', '#6b21a8', '#166534',
  '#92400e', '#000000', '#6b7280', '#dc2626',
];

/** 通用 slider 行 */
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-foreground">
          {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  );
}

export default function FragmentStylePanel() {
  const fragments = useCanvasStore((s) => s.fragments);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateFragmentStyle = useCanvasStore((s) => s.updateFragmentStyle);

  const selectedFragments = useMemo(
    () => fragments.filter((f) => selectedIds.includes(f.id)),
    [fragments, selectedIds],
  );

  if (selectedFragments.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        选中一个碎片以编辑其样式
      </div>
    );
  }

  // 多选时以第一个为参考，应用样式到所有选中
  const reference = selectedFragments[0];
  const style: CanvasFragmentStyle = reference.style ?? {
    fontFamily: 'serif',
    fontSize: 24,
    color: '#333333',
    letterSpacing: 2,
    lineHeight: 1.6,
    opacity: 1,
    direction: 'horizontal',
  };

  /** 批量应用到所有选中碎片 */
  const apply = (patch: Partial<CanvasFragmentStyle>) => {
    selectedFragments.forEach((f) => updateFragmentStyle(f.id, patch));
  };

  return (
    <div className="space-y-3 p-3">
      {/* 字体 */}
      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">字体</span>
        <select
          value={style.fontFamily}
          onChange={(e) => apply({ fontFamily: e.target.value })}
          className="h-7 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          style={{ fontFamily: style.fontFamily }}
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 字号 */}
      <SliderRow
        label="字号"
        value={style.fontSize}
        min={12}
        max={72}
        step={1}
        unit="px"
        onChange={(v) => apply({ fontSize: v })}
      />

      {/* 字间距 */}
      <SliderRow
        label="字间距"
        value={style.letterSpacing}
        min={0}
        max={10}
        step={0.5}
        unit="px"
        onChange={(v) => apply({ letterSpacing: v })}
      />

      {/* 行高 */}
      <SliderRow
        label="行高"
        value={style.lineHeight}
        min={1}
        max={3}
        step={0.1}
        onChange={(v) => apply({ lineHeight: v })}
      />

      {/* 透明度 */}
      <SliderRow
        label="透明度"
        value={style.opacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => apply({ opacity: v })}
      />

      {/* 颜色 */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-muted-foreground">文字颜色</span>
        <div className="grid grid-cols-6 gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => apply({ color: c })}
              className={`h-6 w-full rounded-md border transition-transform hover:scale-110 ${
                style.color.toLowerCase() === c.toLowerCase()
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'border-border'
              }`}
              style={{ background: c }}
              title={c}
              aria-label={`选择颜色 ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="color"
            value={style.color}
            onChange={(e) => apply({ color: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
            aria-label="自定义颜色"
          />
          <input
            type="text"
            value={style.color}
            onChange={(e) => apply({ color: e.target.value })}
            className="h-6 flex-1 rounded-md border bg-background px-2 text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary"
            placeholder="#333333"
          />
        </div>
      </div>

      {/* 排版方向 */}
      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">排版方向</span>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => apply({ direction: 'horizontal' })}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              style.direction === 'horizontal'
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:bg-secondary'
            }`}
          >
            横排
          </button>
          <button
            onClick={() => apply({ direction: 'vertical' })}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              style.direction === 'vertical'
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:bg-secondary'
            }`}
          >
            竖排
          </button>
        </div>
      </div>

      {selectedFragments.length > 1 && (
        <p className="pt-1 text-[10px] text-muted-foreground">
          将应用到 {selectedFragments.length} 个选中碎片
        </p>
      )}
    </div>
  );
}
