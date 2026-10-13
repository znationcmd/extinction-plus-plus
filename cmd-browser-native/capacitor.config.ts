import type { CapacitorConfig } from '@capacitor/cli';

// Native wrapper for CMD Browser. Public websites require native WebView navigation
// handling; server.allowNavigation alone is not a substitute for browser tabs.
const config: CapacitorConfig = {
  appId: 'app.cmd.browser',
  appName: 'CMD Browser',
  webDir: 'www',
  server: { url: 'https://cmd-browser-web-rzsb-production.up.railway.app', cleartext: false },
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
};
export default config;
