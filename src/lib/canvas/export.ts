import type { ExportOptions } from '@/types/export';
import type { CanvasFragment, CanvasBackground } from '@/types/canvas';

/**
 * 使用 html2canvas 导出画布为图片
 */
export async function exportAsImage(
  element: HTMLElement,
  options: ExportOptions,
): Promise<Blob | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: options.includeBackground ? undefined : null,
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob(
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

/**
 * 导出为纯文本（按画布位置顺序排列）
 */
export function exportAsText(fragments: CanvasFragment[]): string {
  // 按 y 坐标（行）分组，然后按 x 坐标（列）排序
  const sorted = [...fragments].sort((a, b) => {
    const rowDiff = a.position.y - b.position.y;
    if (Math.abs(rowDiff) > 30) return rowDiff; // 不同行
    return a.position.x - b.position.x; // 同行按 x 排序
  });

  return sorted
    .filter((f) => !f.style?.opacity || f.style.opacity > 0.1)
    .map((f) => f.text)
    .join(' ');
}

/**
 * 下载 Blob 为文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成默认导出选项
 */
export function getDefaultExportOptions(): ExportOptions {
  return {
    format: 'png',
    quality: 0.95,
    includeBackground: true,
    scale: 2,
  };
}
