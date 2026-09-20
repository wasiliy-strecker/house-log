import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Button,
  Card,
  Heading,
  IconButton,
  useTheme,
} from '../../core/ui/components';
import { Icon, type IconName } from '../../core/ui/icon';
const hints: { title: string; icon: IconName; text: string }[] = [
  {
    title: 'Haus oder Anlage vollständig',
    icon: 'house_outlined',
    text: 'Fotografiere das Objekt vollständig. Ein ähnlicher Blickwinkel macht spätere Veränderungen gut sichtbar.',
  },
  {
    title: 'Schäden und Reparaturen',
    icon: 'build',
    text: 'Halte Schäden und ausgeführte Arbeiten als Nahaufnahme fest. Ergänze die Details in der Notiz.',
  },
  {
    title: 'Unterlagen vom Dienstleister',
    icon: 'document_scanner_outlined',
    text: 'Scanne Rechnungen und Prüfberichte über „PDF hinzufügen oder scannen“ oder fotografiere einzelne Belege.',
  },
  {
    title: 'Mess- oder Betriebsstand vergleichen',
    icon: 'straighten',
    text: 'Fotografiere die Anzeige. Den abgelesenen Wert und seine Einheit trägst du selbst in das Formular ein.',
  },
];
export function PhotoHints({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false),
    c = useTheme(),
    safe = useSafeAreaInsets();
  return (
    <>
      <Button
        textOnly
        icon="photo_library_outlined"
        title="Fotohinweise"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: '#00000066',
          }}
        >
          <View
            style={{
              backgroundColor: c.elevated,
              height: '75%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 16,
            }}
          >
            <View
              style={{
                height: 4,
                width: 32,
                borderRadius: 4,
                backgroundColor: c.outline,
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
              }}
            >
              <View style={{ flex: 1 }}>
                <Heading>Haus und Anlagen fotografieren</Heading>
              </View>
              <IconButton
                icon="close"
                label="Fotohinweise schließen"
                onPress={() => setOpen(false)}
              />
            </View>
            <ScrollView
              contentContainerStyle={{
                padding: 20,
                paddingBottom: safe.bottom + 24,
                gap: 12,
              }}
            >
              {hints.map((h) => (
                <Card key={h.title}>
                  <Icon name={h.icon} size={36} color={c.primary} />
                  <Body strong style={{ fontSize: 16 }}>
                    {h.title}
                  </Body>
                  <Body>{h.text}</Body>
                </Card>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
