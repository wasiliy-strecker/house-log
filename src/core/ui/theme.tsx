import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import { StartupError, StartupPending } from '../startup/startup';
export const light = {
  background: '#F1F4F7',
  card: '#FAFCFE',
  input: '#EAF0F5',
  ink: '#181C20',
  muted: '#42474E',
  primary: '#315E80',
  onPrimary: '#FFFFFF',
  soft: '#CCE5FF',
  onSoft: '#044B71',
  border: '#C4D1DD',
  outline: '#72787E',
  danger: '#BA1A1A',
  elevated: '#E6E8EE',
  disabled: '#D7DADD',
  dark: false,
};
export const dark: typeof light = {
  background: '#151B22',
  card: '#212C37',
  input: '#10161C',
  ink: '#E0E2E8',
  muted: '#C2C7CE',
  primary: '#A5CDED',
  onPrimary: '#003350',
  soft: '#044B71',
  onSoft: '#CCE5FF',
  border: '#445362',
  outline: '#8C9198',
  danger: '#FFB4AB',
  elevated: '#272A2E',
  disabled: '#30373E',
  dark: true,
};
const ThemeContext = createContext(light);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <FontThemeProvider key={attempt} retry={() => setAttempt((n) => n + 1)}>
      {children}
    </FontThemeProvider>
  );
}
function FontThemeProvider({
  children,
  retry,
}: {
  children: ReactNode;
  retry(): void;
}) {
  const scheme = useColorScheme();
  const [loaded, error] = useFonts({
    Roboto: require('../../../assets/ui/Roboto-Regular.ttf'),
    RobotoMedium: require('../../../assets/ui/Roboto-Medium.ttf'),
    RobotoBold: require('../../../assets/ui/Roboto-Bold.ttf'),
    RobotoBlack: require('../../../assets/ui/Roboto-Black.ttf'),
    MaterialIcons: require('../../../assets/ui/MaterialIcons-Regular.otf'),
  });
  if (error)
    return (
      <StartupError
        message="Die Schriftarten konnten nicht geladen werden."
        retry={retry}
      />
    );
  if (!loaded) return <StartupPending />;
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? dark : light}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
