'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { RotateCw } from 'lucide-react';
import type { CanvasFragment } from '@/types/canvas';
import { generateTornEdgePercent } from '@/lib/canvas/clipPaths';
import { useCanvasStore } from '@/store/canvasStore';

interface CanvasFragmentProps {
  fragment: CanvasFragment;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasFragment>) => void;
  onDoubleClick?: () => void;
  canvasZoom?: number;
}

/** 估算文本尺寸 */
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
  const backgroundColor = style?.backgroundColor || '#ffffff';
  const { width: estWidth, height: estHeight } = useMemo(
    () => estimateTextSize(text, fontSize),
    [text, fontSize],
  );
  const fragmentWidth = fragment.width || estWidth;
  const fragmentHeight = fragment.height || estHeight;

  // 撕裂边缘（百分比，稳定）
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

  useEffect(() => {
    if (isEditing) {
      setDraftText(text);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) { ta.focus(); ta.select(); }
      });
    }
  }, [isEditing, text]);

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

  const enterEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (locked) return;
    setIsEditing(true);
    onDoubleClick?.();
  }, [locked, onDoubleClick]);

  // dnd-kit draggable — only drag listeners, NOT attributes (to avoid conflict)
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: fragment.id,
    data: {
      type: 'canvas-fragment',
      fragment: { text: fragment.text },
    },
    disabled: locked || isEditing,
  });

  // 手动计算 transform，避免 framer-motion 覆盖
  const posTransform = transform
    ? `translate(${transform.x}px, ${transform.y}px)`
    : '';

  const boxShadow = isDragging
    ? '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)'
    : isSelected
      ? '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px rgba(59, 130, 246, 0.6)'
      : '0 1px 4px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)';

  // ----- 缩放手柄 -----
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
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [locked, fragmentWidth, fragmentHeight],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ref = resizeDragRef.current;
      if (!ref) return;
      const dx = (e.clientX - ref.startScreenX) / canvasZoom;
      const dy = (e.clientY - ref.startScreenY) / canvasZoom;

      let newWidth = ref.startWidth;
      let newHeight = ref.startHeight;
      if (ref.mode === 'corner' || ref.mode === 'right') {
        newWidth = ref.startWidth + dx;
      }
      if (ref.mode === 'corner' || ref.mode === 'bottom') {
        newHeight = ref.startHeight + dy;
      }
      resizeFragment(fragment.id, newWidth, newHeight);
    },
    [canvasZoom, fragment.id, resizeFragment],
  );

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (resizeDragRef.current) {
      resizeDragRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }, []);

  // ----- 旋转手柄 -----
  const rotateDragRef = useRef<{
    startRotation: number;
    startAngle: number;
  } | null>(null);

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (locked) return;
      e.stopPropagation();
      e.preventDefault();
      const node = (e.currentTarget as HTMLElement)
        .closest('[data-fragment-id]') as HTMLElement;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rotateDragRef.current = {
        startRotation: rotation,
        startAngle: angleDeg(cx, cy, e.clientX, e.clientY),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [rotation, locked],
  );

  const handleRotatePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ref = rotateDragRef.current;
      if (!ref) return;
      const node = (e.currentTarget as HTMLElement)
        .closest('[data-fragment-id]') as HTMLElement;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const curAngle = angleDeg(cx, cy, e.clientX, e.clientY);
      const delta = curAngle - ref.startAngle;
      let next = ref.startRotation + delta;
      if (e.shiftKey) {
        next = Math.round(next / 15) * 15;
      }
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      onUpdate({ rotation: Number(next.toFixed(2)) });
    },
    [onUpdate],
  );

  const handleRotatePointerUp = useCallback((e: React.PointerEvent) => {
    if (rotateDragRef.current) {
      rotateDragRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }, []);

  // 文字样式
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
  const handleSize = 10 / canvasZoom;
  const rotateHandleSize = 16 / canvasZoom;
  const borderWidth = Math.max(1, 1.5 / canvasZoom);
  const rotateOffset = 32 / canvasZoom;

  const handleBase: React.CSSProperties = {
    position: 'absolute',
    background: '#ffffff',
    border: `${borderWidth}px solid rgba(59,130,246,0.9)`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    touchAction: 'none',
    zIndex: 10,
  };

  // 构建 transform 字符串（避免 framer-motion 覆盖）
  // 只用 style.transform，不用 motion 的 animate
  const finalTransform = [
    posTransform,
    `rotate(${rotation}deg)`,
    `scale(${isDragging ? scale * 1.05 : scale})`,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      data-fragment-id={fragment.id}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: fragmentWidth,
        height: fragmentHeight,
        zIndex: isDragging ? 9999 : fragment.zIndex,
        cursor: locked ? 'default' : isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        boxShadow,
        transform: finalTransform,
        transformOrigin: 'center center',
        willChange: isDragging ? 'transform' : 'auto',
        userSelect: isEditing ? 'text' : 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) onSelect();
      }}
      onDoubleClick={enterEdit}
    >
      {/* 内容层：listenrs 绑在这里防止手柄触发 drag */}
      <div
        {...(locked || isEditing ? {} : listeners || {})}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          clipPath: `polygon(${tornClipPath})`,
          WebkitClipPath: `polygon(${tornClipPath})`,
          background: backgroundColor,
          overflow: isEditing ? 'visible' : 'hidden',
          borderRadius: 0,
          pointerEvents: 'auto',
        }}
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
              background: backgroundColor,
              boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.5)',
              fontFamily: style?.fontFamily || 'serif',
              fontSize,
              color: style?.color || '#333333',
            }}
          />
        ) : (
          <span style={textSpanStyle}>{text}</span>
        )}
      </div>

      {/* 手柄层 */}
      {showHandles && (
        <>
          {/* 旋转手柄 */}
          <div
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handleRotatePointerMove}
            onPointerUp={handleRotatePointerUp}
            onPointerCancel={handleRotatePointerUp}
            style={{
              ...handleBase,
              left: '50%',
              top: -rotateOffset,
              width: rotateHandleSize,
              height: rotateHandleSize,
              marginLeft: -rotateHandleSize / 2,
              borderRadius: '50%',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="拖拽旋转（按 Shift 吸附 15°）"
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: rotateHandleSize,
                width: borderWidth,
                height: rotateOffset - rotateHandleSize,
                marginLeft: -borderWidth / 2,
                background: 'rgba(59,130,246,0.7)',
              }}
            />
            <RotateCw
              style={{
                width: rotateHandleSize * 0.6,
                height: rotateHandleSize * 0.6,
                color: 'rgba(59,130,246,0.9)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* 右下角缩放手柄 */}
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
            title="拖拽调整大小"
          />
        </>
      )}
    </div>
  );
}