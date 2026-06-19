export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'pdf' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  includeBackground: boolean;
  scale?: number;
}
