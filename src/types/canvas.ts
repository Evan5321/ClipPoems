export interface Position {
  x: number;
  y: number;
}

export interface CanvasFragmentStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  /** 碎片背景色 */
  backgroundColor?: string;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  direction: 'horizontal' | 'vertical';
}

export interface CanvasFragment {
  id: string;
  corpusFragmentId?: string;
  text: string;
  position: Position;
  rotation: number;
  scale: number;
  zIndex: number;
  style: CanvasFragmentStyle;
  locked: boolean;
  /** 撕裂边缘 clip-path polygon CSS 值 */
  clipPath?: string;
  /** 碎片宽高（由文本内容计算） */
  width?: number;
  height?: number;
  /** 是否被用户手动调整过尺寸（true 时字号/文字变化不再重算宽高） */
  userSized?: boolean;
}

export interface CanvasBackground {
  type: 'solid' | 'gradient' | 'image' | 'texture';
  value: string;
  opacity: number;
}

export interface CanvasGrid {
  enabled: boolean;
  spacing: number;
}

/** 全局文字默认样式（新建碎片的初始样式） */
export interface GlobalTextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  direction?: 'horizontal' | 'vertical';
}

/** 画布完整快照（用于保存/恢复/导出） */
export interface CanvasSnapshot {
  fragments: CanvasFragment[];
  background: CanvasBackground;
  grid: CanvasGrid;
  canvasSize: { width: number; height: number };
  globalTextStyle: GlobalTextStyle;
}

export interface Canvas {
  id: string;
  name: string;
  width: number;
  height: number;
  background: CanvasBackground;
  grid: CanvasGrid;
  fragments: CanvasFragment[];
  createdAt: string;
  updatedAt: string;
}
