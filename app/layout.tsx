import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../packages/brain/src/styles/brain.css'

export const metadata: Metadata = {
  title: 'Brain Explorer — @encapsa-dev/brain',
  description: 'Explore connected knowledge in an interactive 3D brain, 2D graph, or accessible list. An offline, synthetic demonstration of the reusable @encapsa-dev/brain library.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#0b1018',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
