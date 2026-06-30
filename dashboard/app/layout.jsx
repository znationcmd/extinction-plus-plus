import './globals.css';

export const metadata = {
  title: 'Extinction++ RSS',
  description: 'Dashboard Extinction++ RSS'
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
