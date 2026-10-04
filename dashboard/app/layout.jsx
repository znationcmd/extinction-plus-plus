import './globals.css';
import PwaProvider from '../components/PwaProvider';

export const dynamic = 'force-dynamic';

export const metadata = {
  metadataBase: new URL(process.env.DASHBOARD_URL || 'http://localhost:3000'),
  title: 'Extinction++ RSS',
  description: 'Dashboard Extinction++ RSS',
  manifest: '/manifest.webmanifest',
  applicationName: 'Extinction++ RSS',
  appleWebApp: { capable: true, title: 'Extinction++', statusBarStyle: 'black-translucent' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: [{ url: '/app-icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  openGraph: {
    title: 'Extinction++ RSS',
    description: 'Real Survival System',
    images: ['/og-image.png']
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#08111f'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body><PwaProvider>{children}</PwaProvider></body>
    </html>
  );
}
