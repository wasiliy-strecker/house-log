import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import { Body, Field, useTheme } from '../../core/ui/components';
export function ActivityField({
  value,
  suggestions,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  suggestions: string[];
  onChange(value: string): void;
  disabled: boolean;
  autoFocus: boolean;
}) {
  const [focused, setFocused] = useState(false),
    c = useTheme();
  const options = suggestions.filter((s) =>
    s
      .toLocaleLowerCase('de-DE')
      .includes(value.trim().toLocaleLowerCase('de-DE')),
  );
  return (
    <View style={{ zIndex: focused ? 20 : 0, gap: 4 }}>
      <Field
        label="Aktivität *"
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        returnKeyType="done"
        placeholder="z. B. Wartung oder Renovierung"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => {
          setFocused(false);
          Keyboard.dismiss();
        }}
      />
      <Body muted style={{ paddingHorizontal: 16, fontSize: 12 }}>
        Vorschlag auswählen oder eigene Aktivität eingeben.
      </Body>
      {focused && !disabled && !!options.length && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={{
            position: 'absolute',
            top: 58,
            left: 0,
            right: 0,
            maxHeight: 220,
            borderRadius: 4,
            backgroundColor: c.elevated,
            elevation: 8,
            zIndex: 20,
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => {
                onChange(option);
                setFocused(false);
                Keyboard.dismiss();
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 48,
              }}
              android_ripple={{ color: c.primary + '22' }}
            >
              <Body style={{ fontSize: 16 }}>{option}</Body>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
