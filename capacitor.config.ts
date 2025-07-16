import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.05b8d46eef6f4138a397a5edd43a2a6f',
  appName: 'valorwell-clinician-portal',
  webDir: 'dist',
  server: {
    url: "https://05b8d46e-ef6f-4138-a397-a5edd43a2a6f.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    allowsLinkPreview: false
  }
};

export default config;