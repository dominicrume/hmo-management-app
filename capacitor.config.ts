import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voremlabs.mattysplace',
  appName: "Matty's Place",
  webDir: 'out',

  server: {
    // During local development, point this to your local dev server:
    // url: 'http://localhost:3000',
    // cleartext: true,
    
    // For Phase A (WebView wrapper over production backend), you would use:
    // url: 'https://app.mattysplace.org'
  }
};

export default config;
