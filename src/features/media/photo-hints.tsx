import { useCallback, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Button,
  Card,
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
const snapPoints = ['70%', '95%'];
function HintsBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.4}
      pressBehavior="close"
      accessibilityLabel="Fotohinweise schließen"
      accessibilityHint="Schließt die Fotohinweise und kehrt zum Eintrag zurück."
    />
  );
}
function HintsHandle(props: BottomSheetHandleProps) {
  const c = useTheme();
  return (
    <BottomSheetHandle
      {...props}
      accessibilityLabel="Fotohinweise verschieben"
      accessibilityHint="Nach oben ziehen zum Vergrößern. Nach unten ziehen zum Schließen."
      style={{ paddingTop: 22, paddingBottom: 22 }}
      indicatorStyle={{
        width: 32,
        height: 4,
        borderRadius: 4,
        backgroundColor: c.muted,
      }}
    />
  );
}
export function PhotoHints({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<BottomSheet>(null);
  const c = useTheme();
  const safe = useSafeAreaInsets();
  const close = useCallback(() => sheet.current?.forceClose(), []);
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
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {open && (
            <BottomSheet
              ref={sheet}
              index={0}
              snapPoints={snapPoints}
              enableDynamicSizing={false}
              enablePanDownToClose
              enableOverDrag={false}
              topInset={safe.top}
              onClose={() => setOpen(false)}
              backdropComponent={HintsBackdrop}
              handleComponent={HintsHandle}
              backgroundStyle={{
                backgroundColor: c.card,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
              accessible={false}
              accessibilityViewIsModal
            >
              {/* The integrated scroll view transfers the same gesture between
                  content scrolling and sheet dragging at the content edges. */}
              <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: safe.bottom + 24,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      flex: 1,
                      fontFamily: 'Roboto',
                      fontSize: 22,
                      lineHeight: 28,
                      color: c.ink,
                    }}
                  >
                    Haus und Anlagen fotografieren
                  </Text>
                  <IconButton
                    icon="close"
                    label="Fotohinweise schließen"
                    onPress={close}
                  />
                </View>
                {hints.map((h) => (
                  <Card key={h.title} style={{ margin: 4, gap: 0 }}>
                    <Icon name={h.icon} size={36} color={c.primary} />
                    <Body
                      style={{
                        marginTop: 12,
                        fontFamily: 'RobotoMedium',
                        fontSize: 16,
                        lineHeight: 24,
                        letterSpacing: 0.15,
                      }}
                    >
                      {h.title}
                    </Body>
                    <Body style={{ marginTop: 8 }}>{h.text}</Body>
                  </Card>
                ))}
              </BottomSheetScrollView>
            </BottomSheet>
          )}
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
