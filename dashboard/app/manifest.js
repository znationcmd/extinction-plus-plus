export default function manifest() {
  return {
    id: '/',
    name: 'CMD EXTINCTION++ RSS',
    short_name: 'CMD Extinction++',
    description: 'Tes serveurs, les mods DayZ et les outils Extinction++ sur mobile.',
    lang: 'fr',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    background_color: '#08111f',
    theme_color: '#08111f',
    prefer_related_applications: false,
    icons: [
      { src: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Mods DayZ PC', url: '/dayz-mods' },
      { name: 'Valider JSON / XML', url: '/file-validator' },
      { name: 'Mes serveurs', url: '/servers' }
    ]
  };
}
