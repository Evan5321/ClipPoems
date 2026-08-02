'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { CanvasFragment } from '@/types/canvas';
import { generateTornEdgePercent } from '@/lib/canvas/clipPaths';
import { useCanvasStore } from '@/store/canvasStore';

interface CanvasFragmentProps {
  fragment: CanvasFragment;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasFragment>) => void;
  /** 双击进入编辑模式（外部可监听） */
  onDoubleClick?: () => void;
  /** 画布缩放（用于手柄拖拽补偿） */
  canvasZoom?: number;
}

/** 估算文本尺寸（与 store 中一致，确保默认单行显示） */
function estimateTextSize(text: string, fontSize: number): { width: number; height: number } {
  const charWidth = fontSize * 1.05;
  const padding = 16;
  const lines = text.split('\n');
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  return {
    width: Math.round(maxLineLen * charWidth + padding * 2),
    height: Math.round(lines.length * (fontSize * 1.4) + padding * 2),
  };
}

/** 两点角度（度） */
function angleDeg(ax: number, ay: number, bx: number, by: number): number {
  return (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
}

/** 缩放手柄类型 */
type ResizeMode = 'corner' | 'right' | 'bottom';

export default function CanvasFragmentComponent({
  fragment,
  isSelected,
  onSelect,
  onUpdate,
  onDoubleClick,
  canvasZoom = 1,
}: CanvasFragmentProps) {
  const { text, position, rotation, scale, style, clipPath, locked } = fragment;
  const fontSize = style?.fontSize || 24;
  const { width: estWidth, height: estHeight } = useMemo(
    () => estimateTextSize(text, fontSize),
    [text, fontSize],
  );
  const fragmentWidth = fragment.width || estWidth;
  const fragmentHeight = fragment.height || estHeight;

  // 撕裂边缘（百分比格式，稳定）
  const tornClipPath = useMemo(() => {
    if (clipPath) return clipPath;
    const hash = fragment.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return generateTornEdgePercent({
      width: fragmentWidth,
      height: fragmentHeight,
      roughness: 0.12,
      segments: 5,
      seed: hash,
    });
  }, [clipPath, fragmentWidth, fragmentHeight, fragment.id]);

  // 文字编辑模式
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateFragmentText = useCanvasStore((s) => s.updateFragmentText);
  const resizeFragment = useCanvasStore((s) => s.resizeFragment);

  // 进入编辑时同步 draft 并聚焦
  useEffect(() => {
    if (isEditing) {
      setDraftText(text);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.select();
        }
      });
    }
  }, [isEditing, text]);

  // 文本变化时若不在编辑模式，同步 draft
  useEffect(() => {
    if (!isEditing) setDraftText(text);
  }, [text, isEditing]);

  const commitEdit = useCallback(() => {
    const trimmed = draftText.replace(/\s+$/g, '');
    if (trimmed.length > 0 && trimmed !== text) {
      updateFragmentText(fragment.id, trimmed);
    }
    setIsEditing(false);
  }, [draftText, text, fragment.id, updateFragmentText]);

  const enterEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (locked) return;
      setIsEditing(true);
      onDoubleClick?.();
    },
    [locked, onDoubleClick],
  );

  // dnd-kit 拖拽
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: fragment.id,
    data: {
      type: 'canvas-fragment',
      fragment: { text: fragment.text },
    },
    disabled: locked || isEditing,
  });

  // 视觉 transform
  const combinedTransform = transform
    ? `translate(${transform.x}px, ${transform.y}px) rotate(${rotation}deg) scale(${isDragging ? scale * 1.05 : scale})`
    : `rotate(${rotation}deg) scale(${scale})`;

  const boxShadow = isDragging
    ? '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)'
    : isSelected
      ? '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px rgba(59, 130, 246, 0.6)'
      : '0 1px 4px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)';

  // ----- 缩放手柄拖拽（调整 width / height，考虑旋转） -----
  const resizeDragRef = useRef<{
    mode: ResizeMode;
    startScreenX: number;
    startScreenY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const handleResizePointerDown = useCallback(
    (mode: ResizeMode) => (e: React.PointerEvent) => {
      if (locked) return;
      e.stopPropagation();
      e.preventDefault();
      resizeDragRef.current = {
        mode,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startWidth: fragmentWidth,
        startHeight: fragmentHeight,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [locked, fragmentWidth, fragmentHeight],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ref = resizeDragRef.current;
      if (!ref) return;
      // 屏幕位移 → 画布位移（除以 zoom）
      const dx = (e.clientX - ref.startScreenX) / canvasZoom;
      const dy = (e.clientY - ref.startScreenY) / canvasZoom;
      // 画布位移 → 碎片局部位移（反向旋转，因为碎片自身旋转了 rotation 度）
      const rad = (-rotation * Math.PI) / 180;
      const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

      let newWidth = ref.startWidth;
      let newHeight = ref.startHeight;
      if (ref.mode === 'corner' || ref.mode === 'right') {
        newWidth = ref.startWidth + localDx;
      }
      if (ref.mode === 'corner' || ref.mode === 'bottom') {
        newHeight = ref.startHeight + localDy;
      }
      resizeFragment(fragment.id, newWidth, newHeight);
    },
    [canvasZoom, rotation, fragment.id, resizeFragment],
  );

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (resizeDragRef.current) {
      resizeDragRef.current = null;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }, []);

  // ----- 旋转手柄拖拽 -----
  const rotateDragRef = useRef<{
    startRotation: number;
    startAngle: number;
  } | null>(null);

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (locked) return;
      e.stopPropagation();
      e.preventDefault();
      const node = e.currentTarget.parentElement as HTMLElement;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rotateDragRef.current = {
        startRotation: rotation,
        startAngle: angleDeg(cx, cy, e.clientX, e.clientY),
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [rotation, locked],
  );

  const handleRotatePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ref = rotateDragRef.current;
      if (!ref) return;
      const node = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const curAngle = angleDeg(cx, cy, e.clientX, e.clientY);
      const delta = curAngle - ref.startAngle;
      let next = ref.startRotation + delta;
      // Shift 吸附到 15° 倍数
      if (e.shiftKey) {
        next = Math.round(next / 15) * 15;
      }
      // 归一化到 [-180, 180]
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      onUpdate({ rotation: Number(next.toFixed(2)) });
    },
    [onUpdate],
  );

  const handleRotatePointerUp = useCallback((e: React.PointerEvent) => {
    if (rotateDragRef.current) {
      rotateDragRef.current = null;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }, []);

  // 文字样式：宽度足够时一行显示，拖窄后自动换行（PPT 文本框行为）
  const textSpanStyle: React.CSSProperties = {
    fontFamily: style?.fontFamily || 'serif',
    fontSize,
    color: style?.color || '#333333',
    letterSpacing: style?.letterSpacing ?? 2,
    lineHeight: style?.lineHeight || 1.6,
    writingMode: style?.direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
    textOrientation: style?.direction === 'vertical' ? 'mixed' : undefined,
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '8px 12px',
    opacity: style?.opacity ?? 1,
  };

  const showHandles = isSelected && !isEditing && !locked && !isDragging;
  // 手柄尺寸（随 zoom 反向缩放，保持视觉恒定）
  const handleSize = 10 / canvasZoom;
  const borderWidth = Math.max(1, 1.5 / canvasZoom);
  const rotateOffset = 26 / canvasZoom;

  // 通用手柄样式
  const handleBase: React.CSSProperties = {
    position: 'absolute',
    background: '#ffffff',
    border: `${borderWidth}px solid rgba(59,130,246,0.9)`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    touchAction: 'none',
    zIndex: 10,
  };

  return (
    <motion.div
      ref={setNodeRef}
      data-fragment-id={fragment.id}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 30, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: fragmentWidth,
        height: fragmentHeight,
        zIndex: isDragging ? 9999 : fragment.zIndex,
        cursor: locked ? 'default' : isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        clipPath: `polygon(${tornClipPath})`,
        WebkitClipPath: `polygon(${tornClipPath})`,
        background: '#ffffff',
        boxShadow,
        borderRadius: 0,
        transform: combinedTransform,
        transformOrigin: 'center center',
        willChange: isDragging ? 'transform' : 'auto',
        userSelect: isEditing ? 'text' : 'none',
        overflow: isEditing ? 'visible' : 'hidden',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) onSelect();
      }}
      onDoubleClick={enterEdit}
      {...(locked || isEditing ? {} : { ...attributes, ...listeners })}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              e.preventDefault();
              commitEdit();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              commitEdit();
            }
          }}
          style={{
            ...textSpanStyle,
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'rgba(255,255,255,0.95)',
            boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.5)',
            fontFamily: style?.fontFamily || 'serif',
            fontSize,
            color: style?.color || '#333333',
          }}
        />
      ) : (
        <span style={textSpanStyle}>{text}</span>
      )}

      {/* 旋转 + 缩放手柄（仅选中时显示） */}
      {showHandles && (
        <>
          {/* 旋转手柄：顶部上方圆点 + 连接线 */}
          <div
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handleRotatePointerMove}
            onPointerUp={handleRotatePointerUp}
            onPointerCancel={handleRotatePointerUp}
            style={{
              ...handleBase,
              left: '50%',
              top: -rotateOffset,
              width: handleSize,
              height: handleSize,
              marginLeft: -handleSize / 2,
              borderRadius: '50%',
              cursor: 'grab',
            }}
            title="拖拽旋转（按 Shift 吸附 15°）"
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: handleSize,
                width: borderWidth,
                height: rotateOffset - handleSize,
                marginLeft: -borderWidth / 2,
                background: 'rgba(59,130,246,0.7)',
              }}
            />
          </div>

          {/* 右下角手柄：自由调整宽高 */}
          <div
            onPointerDown={handleResizePointerDown('corner')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            style={{
              ...handleBase,
              right: -handleSize / 2,
              bottom: -handleSize / 2,
              width: handleSize,
              height: handleSize,
              borderRadius: 2 / canvasZoom,
              cursor: 'nwse-resize',
            }}
            title="拖拽调整宽高"
          />

          {/* 右中手柄：只调宽度 */}
          <div
            onPointerDown={handleResizePointerDown('right')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            style={{
              ...handleBase,
              right: -handleSize / 2,
              top: '50%',
              width: handleSize,
              height: handleSize,
              marginTop: -handleSize / 2,
              borderRadius: 2 / canvasZoom,
              cursor: 'ew-resize',
            }}
            title="拖拽调整宽度"
          />

          {/* 下中手柄：只调高度 */}
          <div
            onPointerDown={handleResizePointerDown('bottom')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            style={{
              ...handleBase,
              bottom: -handleSize / 2,
              left: '50%',
              width: handleSize,
              height: handleSize,
              marginLeft: -handleSize / 2,
              borderRadius: 2 / canvasZoom,
              cursor: 'ns-resize',
            }}
            title="拖拽调整高度"
          />
        </>
      )}
    </motion.div>
  );
}
