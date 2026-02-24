import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Shift Maker',
  description: '飲食店シフト自動作成アプリ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-6 pb-24">{children}</main>
      </body>
    </html>
  );
}
