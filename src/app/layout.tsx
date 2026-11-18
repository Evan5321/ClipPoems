import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppProvider from '@/components/AppProvider';

export const metadata: Metadata = {
  title: {
    default: 'ClipPoems · 剪贴诗',
    template: '%s · ClipPoems',
  },
  description: '从语料库拾取文字碎片，在画布上自由拼贴成诗。',
  applicationName: 'ClipPoems',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '剪贴诗',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
  openGraph: {
    title: 'ClipPoems · 剪贴诗',
    description: '拼贴诗歌创作工具',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f0e8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
