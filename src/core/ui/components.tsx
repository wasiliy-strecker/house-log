import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export const colors = {
  background: '#FAF8F1',
  card: '#FFFFFF',
  ink: '#26363A',
  muted: '#526769',
  primary: '#12666B',
  soft: '#E8F1EE',
  border: '#DCE3DC',
  danger: '#9F3333',
};
export const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: 18,
    gap: 18,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  title: { fontSize: 29, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  heading: { fontSize: 20, fontWeight: '700', color: colors.ink },
  text: { fontSize: 16, lineHeight: 24, color: colors.ink },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.ink },
  input: {
    fontSize: 17,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7B8B4',
    borderRadius: 10,
    padding: 13,
    minHeight: 50,
  },
});
export function Page({
  children,
  nested = false,
}: {
  children: ReactNode;
  nested?: boolean;
}) {
  const safe = useSafeAreaInsets();
  const Component = nested ? NestableScrollContainer : ScrollView;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Component
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          { paddingBottom: safe.bottom + 28 },
        ]}
      >
        {children}
      </Component>
    </KeyboardAvoidingView>
  );
}
export function Title({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={styles.title}>
        {children}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  testID,
}: {
  title: string;
  onPress(): void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingVertical: 13,
        paddingHorizontal: 17,
        borderRadius: 11,
        justifyContent: 'center',
        backgroundColor: secondary
          ? colors.soft
          : danger
            ? colors.danger
            : colors.primary,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? (danger ? colors.danger : colors.primary) : '#FFF',
          fontWeight: '600',
          textAlign: 'center',
          fontSize: 16,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#758581"
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected?: string;
  onSelect(value: string): void;
}) {
  return (
    <View style={styles.row}>
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === selected }}
          onPress={() => onSelect(value)}
          style={{
            minHeight: 48,
            padding: 12,
            borderRadius: 24,
            backgroundColor: value === selected ? colors.primary : colors.soft,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: value === selected ? '#FFF' : colors.primary,
            }}
          >
            {value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text?: string;
  error?: boolean;
}) {
  return text ? (
    <View
      style={{
        backgroundColor: error ? '#FBEDE7' : colors.soft,
        padding: 14,
        borderRadius: 10,
      }}
    >
      <Text
        accessibilityRole={error ? 'alert' : undefined}
        style={[styles.text, error && { color: colors.danger }]}
      >
        {text}
      </Text>
    </View>
  ) : null;
}
export function Busy({ label = 'Wird verarbeitet …' }: { label?: string }) {
  return (
    <View style={styles.row}>
      <ActivityIndicator color={colors.primary} />
      <Body>{label}</Body>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  time = false,
  optional = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  time?: boolean;
  optional?: boolean;
}) {
  const date = value ? new Date(value) : new Date();
  function pick(mode: 'date' | 'time') {
    DateTimePickerAndroid.open({
      value: date,
      mode,
      is24Hour: true,
      onChange: (event, next) => {
        if (event.type === 'set' && next)
          onChange(
            time
              ? next.toISOString()
              : `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
          );
      },
    });
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Button
        secondary
        title={value ? date.toLocaleDateString('de-DE') : 'Datum auswählen'}
        onPress={() => pick('date')}
      />
      {time && (
        <Button
          secondary
          title={date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          onPress={() => pick('time')}
        />
      )}
      {optional && value ? (
        <Button
          secondary
          title="Datum entfernen"
          onPress={() => onChange('')}
        />
      ) : null}
    </View>
  );
}
export function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error)
    return 'Bitte die Pflichtfelder und das Format deiner Angaben prüfen.';
  return error instanceof Error
    ? error.message
    : 'Die Aktion konnte nicht abgeschlossen werden. Deine gespeicherten Daten bleiben erhalten.';
}
