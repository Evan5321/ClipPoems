import type { Metadata } from 'next';
import './globals.css';
import AppProvider from '@/components/AppProvider';

export const metadata: Metadata = {
  title: 'ClipPoems - 剪贴诗',
  description: '拼贴诗歌创作工具 - Collage Poetry Creator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
