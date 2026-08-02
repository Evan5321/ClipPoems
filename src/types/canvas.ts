export interface Position {
  x: number;
  y: number;
}

export interface CanvasFragmentStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
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
