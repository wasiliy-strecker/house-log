import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ServicesProvider } from '../core/composition';
import { colors } from '../core/ui/components';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ServicesProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              contentStyle: { backgroundColor: colors.background },
              headerTitleStyle: { fontWeight: '700' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Hausakte' }} />
            <Stack.Screen
              name="record/[id]"
              options={{ title: 'Meine Akte' }}
            />
            <Stack.Screen
              name="record/edit"
              options={{ title: 'Akte bearbeiten' }}
            />
            <Stack.Screen name="entry/edit" options={{ title: 'Eintrag' }} />
            <Stack.Screen
              name="settings"
              options={{ title: 'Einstellungen' }}
            />
            <Stack.Screen name="privacy" options={{ title: 'Datenschutz' }} />
          </Stack>
        </ServicesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
