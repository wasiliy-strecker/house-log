import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import {
  ActionRow,
  Body,
  Button,
  BusyOverlay,
  Card,
  Field,
  Heading,
  Notice,
  Page,
  useTheme,
} from '../../core/ui/components';
import { Icon } from '../../core/ui/icon';
import { useSettings } from './use-settings';
function PasswordDialog({
  confirm,
  close,
}: {
  confirm: boolean;
  close: (value: string | null) => void;
}) {
  const c = useTheme();
  const [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [show, setShow] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => close(null)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#00000066',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 28,
            padding: 24,
            gap: 16,
            maxHeight: '85%',
          }}
        >
          <Heading>
            {confirm ? 'Backup-Passwort festlegen' : 'Backup-Passwort eingeben'}
          </Heading>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingTop: 8 }}
          >
            <Body>
              {confirm
                ? 'Mindestens 10 Zeichen. Ohne dieses Passwort kann das Backup nicht wiederhergestellt werden.'
                : 'Gib das Passwort dieser Hausakte-Sicherung ein.'}
            </Body>
            <Field
              label="Passwort"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              trailing={
                show ? 'visibility_off_outlined' : 'visibility_outlined'
              }
              onTrailingPress={() => setShow((v) => !v)}
            />
            {confirm && (
              <Field
                label="Passwort wiederholen"
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                value={repeat}
                onChangeText={setRepeat}
              />
            )}
            <Notice error text={error} />
          </ScrollView>
          <ActionRow>
            {[
              <Button
                key="cancel"
                textOnly
                title="Abbrechen"
                onPress={() => close(null)}
              />,
              <Button
                key="continue"
                title="Weiter"
                onPress={() => {
                  if (
                    !password ||
                    (confirm && password.length < 10) ||
                    password.length > 1024
                  ) {
                    setError(
                      confirm
                        ? 'Bitte ein Passwort mit 10 bis 1024 Zeichen eingeben.'
                        : 'Bitte ein gültiges Passwort eingeben.',
                    );
                    return;
                  }
                  if (confirm && password !== repeat) {
                    setError('Die Passwörter stimmen nicht überein.');
                    return;
                  }
                  close(password);
                }}
              />,
            ]}
          </ActionRow>
        </View>
      </View>
    </Modal>
  );
}
export function SettingsScreen() {
  const c = useTheme();
  const [prompt, setPrompt] = useState<{ confirm: boolean; id: number }>();
  const resolve = useRef<((value: string | null) => void) | null>(null);
  useEffect(() => () => resolve.current?.(null), []);
  const vm = useSettings(
    (confirm) =>
      new Promise((done) => {
        resolve.current = done;
        setPrompt({ confirm, id: Date.now() });
      }),
  );
  function close(value: string | null) {
    setPrompt(undefined);
    resolve.current?.(value);
    resolve.current = null;
  }
  return (
    <Page>
      <Notice error text={vm.error} />
      <Heading>Datensicherung</Heading>
      <Card style={{ padding: 0, gap: 0 }}>
        <Pressable
          accessibilityRole="button"
          disabled={vm.busy}
          onPress={() => void vm.create()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <Icon name="lock_outline" />
          <View style={{ flex: 1, gap: 4 }}>
            <Body style={{ fontSize: 16 }}>
              Verschlüsseltes Backup erstellen
            </Body>
            <Body muted>Akten, Einträge, Fotos und Hausprotokolle</Body>
          </View>
          <Icon name="chevron_right" />
        </Pressable>
        <View style={{ height: 1, backgroundColor: c.border }} />
        <Pressable
          accessibilityRole="button"
          disabled={vm.busy}
          onPress={() => void vm.restore()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <Icon name="settings_backup_restore_outlined" />
          <View style={{ flex: 1, gap: 4 }}>
            <Body style={{ fontSize: 16 }}>Backup wiederherstellen</Body>
            <Body muted>Vorhandene neuere Einträge bleiben erhalten</Body>
          </View>
          <Icon name="chevron_right" />
        </Pressable>
      </Card>
      <View style={{ marginTop: 6 }}>
        <Heading>Datenschutz</Heading>
      </View>
      <Card style={{ padding: 18, gap: 0 }}>
        <Body>
          Fotos, Einträge und PDFs werden lokal auf deinem Gerät verarbeitet.
          Die App überträgt deine Hausdaten nicht an einen Server.
        </Body>
        <Body style={{ marginTop: 10 }}>
          Deine Daten bleiben lokal auf deinem Gerät gespeichert, bis du sie in
          der App löschst oder die App-Daten entfernst.
        </Body>
        <Body muted style={{ marginTop: 10 }}>
          Entwickler und Datenschutzkontakt{'\n'}
          Wasiliy Strecker · AppFabrik AI
        </Body>
        <View style={{ marginTop: 14 }}>
          <Button
            secondary
            icon="open_in_new"
            title="Datenschutzerklärung öffnen"
            disabled={vm.busy}
            onPress={() => void vm.openPrivacy()}
          />
        </View>
      </Card>
      <View style={{ marginTop: 6 }}>
        <Heading>Über Hausakte</Heading>
      </View>
      <Card style={{ padding: 0, gap: 0 }}>
        <View style={{ padding: 18, gap: 12 }}>
          <Body strong>Hausakte 1.0.0</Body>
          <Body muted>Kostenlos. Ohne Konto. Ohne Werbung.</Body>
          <Body muted>
            Eigenständige lokale Android-App. Backups bis 128 MB.
            Formularentwürfe gehören nicht zum Backup.
          </Body>
        </View>
        <View style={{ height: 1, backgroundColor: c.border }} />
        <Pressable
          accessibilityRole="link"
          disabled={vm.busy}
          onPress={() => void vm.openSource()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <Icon name="code" />
          <View style={{ flex: 1, gap: 4 }}>
            <Body style={{ fontSize: 16 }}>Quellcode auf GitHub</Body>
            <Body muted>Öffentliches Projekt-Repository</Body>
          </View>
          <Icon name="open_in_new" />
        </Pressable>
      </Card>
      <BusyOverlay visible={!!vm.phase} label={vm.phase} />
      {prompt && (
        <PasswordDialog
          key={prompt.id}
          confirm={prompt.confirm}
          close={close}
        />
      )}
    </Page>
  );
}
