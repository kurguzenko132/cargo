import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cargo-pied-three.vercel.app').replace(/\/$/, '')
const ogImageUrl = `${siteUrl}/api/og-image?v=4`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CARGO STORE — заказ одежды из Китая и каталога',
    template: '%s | CARGO STORE',
  },
  description:
    'Выбирайте товары на сайте или отправляйте ссылку с 1688, Taobao, Poizon и других платформ. Менеджер рассчитает стоимость и оформит заказ.',
  applicationName: 'CARGO STORE',
  keywords: [
    'CARGO STORE',
    'одежда',
    'заказ одежды',
    'заказ по ссылке',
    '1688',
    'Taobao',
    'Poizon',
    'интернет-магазин одежды',
  ],
  authors: [{ name: 'CARGO STORE' }],
  creator: 'CARGO STORE',
  publisher: 'CARGO STORE',
  icons: {
    icon: '/images/default-logo.png',
    shortcut: '/images/default-logo.png',
    apple: '/images/default-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteUrl,
    siteName: 'CARGO STORE',
    title: 'CARGO STORE — заказ одежды из Китая и каталога',
    description:
      'Выбирайте товары на сайте или отправляйте ссылку с 1688, Taobao, Poizon и других платформ. Менеджер рассчитает стоимость и оформит заказ.',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'CARGO STORE — заказ одежды с сайта и по ссылке',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CARGO STORE — заказ одежды из Китая и каталога',
    description:
      'Выбирайте товары на сайте или отправляйте ссылку с 1688, Taobao, Poizon и других платформ. Менеджер рассчитает стоимость и оформит заказ.',
    images: [ogImageUrl],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#f7f3ef',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" prefix="og: https://ogp.me/ns#">
      <body>{children}</body>
    </html>
  )
}
