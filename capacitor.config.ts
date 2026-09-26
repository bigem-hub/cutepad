import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cutepad.app',
  appName: 'Cutepad',
  webDir: 'apps/web/dist',
  backgroundColor: '#ffd6e8',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
