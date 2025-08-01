import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - PomoUno',
  description: 'Sign in to PomoUno to sync your productivity data across devices and unlock advanced features.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E53935',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 