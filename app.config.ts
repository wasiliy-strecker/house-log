import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Hausakte Dev',
  slug: 'hausakte',
  version: '1.0.0',
  scheme: 'hausakte',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#315E80',
  platforms: ['android'],
  icon: './assets/icon.png',
  android: {
    package: 'com.appfactory.house_log',
    versionCode: 1,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/icon-foreground.png',
      backgroundColor: '#315E80',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-dev-client',
    // Android mods unwind in reverse order. Our final theme overrides must
    // run after expo-splash-screen has generated Theme.App.SplashScreen.
    './plugins/with-house-android',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#315E80',
        dark: { backgroundColor: '#315E80' },
      },
    ],
    'expo-font',
    'expo-asset',
    'expo-sharing',
    ['expo-image-picker', { microphonePermission: false }],
  ],
};
export default config;
