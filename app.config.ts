import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Hausakte Dev',
  slug: 'hausakte',
  version: '1.0.0',
  scheme: 'hausakte',
  orientation: 'default',
  userInterfaceStyle: 'light',
  platforms: ['android'],
  icon: './assets/icon.png',
  android: {
    package: 'com.appfactory.house_log',
    versionCode: 1,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/icon-foreground.png',
      backgroundColor: '#12666B',
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
    'expo-font',
    'expo-asset',
    'expo-sharing',
    ['expo-image-picker', { microphonePermission: false }],
    './plugins/with-house-android',
  ],
};
export default config;
