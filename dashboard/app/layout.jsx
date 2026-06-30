import './globals.css';

export const metadata = {
  title: 'Extinction++ RSS',
  description: 'Dashboard Extinction++ RSS',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png'
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
  maximumScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
