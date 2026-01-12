import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Huutopussi Tracker',
  description: 'Track scores for Huutopussi card game matches',
  manifest: '/manifest.json',
  themeColor: '#166534',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Huutopussi Tracker',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Huutopussi',
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#166534',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <head>
        <link rel='icon' href='/favicon.svg' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />
        <meta name='apple-mobile-web-app-title' content='Huutopussi' />
      </head>
      <body className='antialiased'>{children}</body>
    </html>
  )
}
