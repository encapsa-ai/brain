import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../packages/brain/src/styles/brain.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://brain-two-lake.vercel.app'),
  title: 'Encapsa Brain | React Knowledge Graph & 3D Brain Visualization',
  description: 'Explore @encapsa-dev/brain: an open-source React and TypeScript library for interactive 3D knowledge graphs, accessible 2D exploration, and compact AI-context dashboard previews.',
  applicationName: 'Encapsa Brain',
  keywords: ['React knowledge graph', 'brain visualization', 'TypeScript', '3D graph visualization', 'AI context', 'Encapsa'],
  authors: [{ name: 'Encapsa AI', url: 'https://encapsa.ai' }],
  openGraph: {
    type: 'website',
    title: 'Encapsa Brain: Explore connected knowledge',
    description: 'Composable React knowledge visualization. Try the interactive brain, 2D graph, accessible explorer, and dashboard preview.',
    siteName: 'Encapsa Brain',
  },
  twitter: { card: 'summary', title: 'Encapsa Brain', description: 'Open-source React knowledge graph and 3D brain visualization by Encapsa.' },
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
