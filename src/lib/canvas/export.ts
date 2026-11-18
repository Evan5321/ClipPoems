import type { ExportOptions } from '@/types/export';
import type { CanvasFragment, CanvasBackground } from '@/types/canvas';
import { estimateFragmentSize } from '@/lib/canvas/geometry';

/**
 * 使用 html2canvas 导出画布为位图（PNG/JPG/WebP）
 */
export async function exportAsImage(
  element: HTMLElement,
  options: ExportOptions,
): Promise<Blob | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvasEl = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: options.includeBackground ? undefined : null,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => {
      canvasEl.toBlob(
        (blob) => resolve(blob),
        `image/${options.format === 'jpg' ? 'jpeg' : options.format}`,
        options.quality || 0.95,
      );
    });
  } catch (error) {
    console.error('Export failed:', error);
    return null;
  }
}

/** 解析百分比 clip-path 为 objectBoundingBox 分数点 */
function clipPercentToPoints(clipPath: string, width: number, height: number): string {
  const matches = clipPath.match(/([\d.]+)%\s+([\d.]+)%/g);
  if (!matches) return '';
  return matches
    .map((m) => {
      const [x, y] = m.match(/([\d.]+)%\s+([\d.]+)%/)!.slice(1, 3);
      return `${(parseFloat(x) / 100).toFixed(3)} ${(parseFloat(y) / 100).toFixed(3)}`;
    })
    .join(' ');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 解析简单的 linear-gradient(deg, c1, c2) 为 SVG 渐变 */
function parseGradient(css: string) {
  const m = css.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\)/);
  if (!m) return null;
  const angle = parseFloat(m[1]);
  return {
    x1: angle >= 180 ? 1 : 0,
    y1: (Math.sin(((-(angle - 90) * Math.PI) / 180)) + 1) / 2,
    x2: angle >= 180 ? 0 : 1,
    y2: (Math.sin((-(angle - 90) * Math.PI) / 180) + 1) / 2,
    color1: m[2],
    color2: m[3],
  };
}

/**
 * 导出为 SVG（矢量，文字可编辑）
 */
export function exportAsSvg(
  fragments: CanvasFragment[],
  canvasSize: { width: number; height: number },
  background: CanvasBackground,
  includeBackground = true,
): Blob {
  const W = Math.round(canvasSize.width);
  const H = Math.round(canvasSize.height);

  // 背景
  let bgMarkup = '';
  if (includeBackground) {
    if (background.type === 'solid') {
      bgMarkup = `<rect width="${W}" height="${H}" fill="${background.value}" opacity="${background.opacity ?? 1}"/>`;
    } else if (background.type === 'gradient') {
      const g = parseGradient(background.value);
      if (g) {
        bgMarkup = `<defs><linearGradient id="bg" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"><stop offset="0%" stop-color="${g.color1}"/><stop offset="100%" stop-color="${g.color2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#bg)" opacity="${background.opacity ?? 1}"/>`;
      } else {
        bgMarkup = `<rect width="${W}" height="${H}" fill="#f5f0e8"/>`;
      }
    }
  }

  // 碎片
  const fragmentMarkup = [...fragments]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((f, i) => {
      const fontSize = f.style?.fontSize || 24;
      const { width, height } = f.width && f.height ? { width: f.width, height: f.height } : estimateFragmentSize(f.text, fontSize);
      const style = f.style || {};
      const opacity = style.opacity ?? 1;
      if (opacity <= 0.05) return '';
      const points = f.clipPath ? clipPercentToPoints(f.clipPath, width, height) : '';
      const hasClip = points.length > 0;
      const clipId = `clip-${i}`;
      const clipAttr = hasClip ? ` clip-path="url(#${clipId})"` : '';
      const clipDef = hasClip
        ? `<defs><clipPath id="${clipId}" clipPathUnits="objectBoundingBox"><polygon points="${points}"/></clipPath></defs>`
        : '';
      const direction = style.direction === 'vertical' ? 'writing-mode: vertical-rl' : '';
      const lines = f.text.split('\n');
      const lineHeightPx = fontSize * f.scale * (style.lineHeight || 1.6);
      const tspans = lines
        .map(
          (line, idx) =>
            `<tspan x="${(width / 2).toFixed(1)}" dy="${idx === 0 ? 0 : lineHeightPx.toFixed(1)}">${escapeXml(line)}</tspan>`,
        )
        .join('');
      const fontSizePx = fontSize * f.scale;
      return `
  <g transform="translate(${f.position.x.toFixed(1)} ${f.position.y.toFixed(1)}) rotate(${f.rotation.toFixed(2)})">
    ${clipDef}
    <rect x="0" y="0" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="${style.backgroundColor || '#ffffff'}"${clipAttr} opacity="${opacity}"/>
    <text x="${(width / 2).toFixed(1)}" y="${(height / 2 - ((lines.length - 1) * lineHeightPx) / 2).toFixed(1)}" font-family="${style.fontFamily || 'serif'}" font-size="${fontSizePx.toFixed(1)}" fill="${style.color || '#333'}" letter-spacing="${style.letterSpacing ?? 0}px" text-anchor="middle" dominant-baseline="middle" style="${direction}" opacity="${opacity}"${clipAttr}>${tspans}</text>
  </g>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bgMarkup}${fragmentMarkup}</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

/**
 * 导出为纯文本（按画布位置顺序排列）
 */
export function exportAsText(fragments: CanvasFragment[]): string {
  const sorted = [...fragments].sort((a, b) => {
    const rowDiff = a.position.y - b.position.y;
    if (Math.abs(rowDiff) > 30) return rowDiff;
    return a.position.x - b.position.x;
  });
  return sorted
    .filter((f) => !f.style?.opacity || f.style.opacity > 0.1)
    .map((f) => f.text)
    .join(' ');
}

/**
 * 导出为 PDF：将画布渲染成图片后放入打印窗口，用户可选择「另存为 PDF」
 */
export async function exportAsPdf(element: HTMLElement, options: ExportOptions): Promise<boolean> {
  const blob = await exportAsImage(element, { ...options, format: 'png', includeBackground: true });
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  try {
    const win = window.open('', '_blank');
    if (!win) return false;
    win.document.write(
      `<html><head><title>导出 PDF</title><style>body{margin:0;text-align:center} img{max-width:100%;height:auto}</style></head><body><img src="${url}" onload="window.print()"><script>window.onafterprint = function(){setTimeout(function(){window.close()},100)}</script></body></html>`,
    );
    win.document.close();
    return true;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

/**
 * 下载 Blob 为文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Tauri 桌面端：使用原生保存对话框
  const tauri = (window as any).__TAURI__;
  if (tauri?.dialog?.save && tauri?.fs?.writeFile) {
    void (async () => {
      try {
        const path = await tauri.dialog.save({ defaultPath: filename });
        if (!path) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await tauri.fs.writeFile(path, bytes);
      } catch {
        // 回退到浏览器下载
        fallbackDownload(blob, filename);
      }
    })();
    return;
  }
  fallbackDownload(blob, filename);
}

function fallbackDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 生成默认导出选项 */
export function getDefaultExportOptions(): ExportOptions {
  return { format: 'png', quality: 0.95, includeBackground: true, scale: 2 };
}
