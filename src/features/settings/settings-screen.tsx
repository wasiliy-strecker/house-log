import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  Card,
  Field,
  Heading,
  Notice,
  Page,
  Title,
  styles,
} from '../../core/ui/components';
import { useSettings } from './use-settings';
export function SettingsScreen() {
  const vm = useSettings();
  return (
    <Page>
      <Stack.Screen
        options={{ headerBackVisible: !vm.busy, gestureEnabled: !vm.busy }}
      />
      <Title subtitle="Deine Daten bleiben auf deinem Gerät.">
        Einstellungen
      </Title>
      <Notice error text={vm.error} />
      <Notice text={vm.notice} />
      <Card>
        <Heading>Backup und Wiederherstellung</Heading>
        <Body>
          Eine passwortgeschützte .habackup-Datei sichert deine gespeicherten
          Akten, Einträge, Fotos, PDF-Anhänge und Protokolle. Formularentwürfe
          gehören nicht zum Backup. Bewahre Passwort und Datei sicher auf.
        </Body>
        <Field
          label="Backup-Passwort"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!vm.busy}
          value={vm.password}
          onChangeText={vm.setPassword}
          placeholder="Mindestens 10 Zeichen zum Erstellen"
        />
        <Field
          label="Passwort wiederholen (zum Erstellen)"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!vm.busy}
          value={vm.repeat}
          onChangeText={vm.setRepeat}
        />
        <Button
          title="Backup erstellen und speichern"
          disabled={vm.busy}
          onPress={() => {
            void vm.create();
          }}
        />
        <Button
          secondary
          title="Backup auswählen und wiederherstellen"
          disabled={vm.busy}
          onPress={() => {
            void vm.restore();
          }}
        />
        <Body>
          Bei der Wiederherstellung werden vorhandene und gesicherte Daten
          zusammengeführt. Neuere lokale Änderungen bleiben erhalten. Die
          vollständige Sicherung wird vor der Übernahme geprüft.
        </Body>
        <Body>
          Aktuelle Grenze: 128 MB pro Backup. Ein vergessenes Passwort kann
          nicht zurückgesetzt werden.
        </Body>
      </Card>
      {vm.busy && (
        <Busy label="Daten werden geprüft und verschlüsselt. Das kann etwas dauern …" />
      )}
      <Card>
        <Heading>Erinnerungen</Heading>
        <Body>
          Wiederholungen richtest du in der jeweiligen Akte ein. Die Planung
          erfolgt lokal, auch ohne geöffnete App.
        </Body>
        {vm.status && (
          <>
            <Body>
              Benachrichtigungen:{' '}
              {vm.status.notifications ? 'freigegeben' : 'nicht freigegeben'}
            </Body>
            <Body>
              Genaue Alarme:{' '}
              {vm.status.exact ? 'freigegeben' : 'nicht freigegeben'}
            </Body>
            {vm.status.doNotDisturb && (
              <Notice text="Nicht stören ist aktiv. Ein Alarmton kann unterdrückt werden." />
            )}
            {vm.status.schedules.map((s) => (
              <Body key={s.recordId}>
                Nächste Erinnerung:{' '}
                {s.nextTriggerAtMillis
                  ? new Date(s.nextTriggerAtMillis).toLocaleString('de-DE')
                  : 'nicht geplant'}
                {s.planningState !== 'scheduled' ? ' · Planung prüfen' : ''}
                {s.deliveryFailed ? ' · Zustellfehler' : ''}
              </Body>
            ))}
          </>
        )}
        <Button
          secondary
          title="Benachrichtigungen freigeben"
          disabled={vm.busy}
          onPress={() => {
            void vm.permissions();
          }}
        />
        <Button
          secondary
          title="Android-Benachrichtigungseinstellungen"
          disabled={vm.busy}
          onPress={() => {
            void vm.openSettings(false);
          }}
        />
        <Button
          secondary
          title="Genaue Alarme freigeben"
          disabled={vm.busy}
          onPress={() => {
            void vm.openSettings(true);
          }}
        />
        <View style={styles.row}>
          <Button
            secondary
            title="Test-Erinnerung"
            disabled={vm.busy}
            onPress={() => {
              void vm.test(false);
            }}
          />
          <Button
            secondary
            title="Test mit Alarmton"
            disabled={vm.busy}
            onPress={() => {
              void vm.test(true);
            }}
          />
        </View>
        <Body>
          Nach einem erzwungenen App-Stopp muss Hausakte einmal geöffnet werden.
          Bei Änderungen an Berechtigungen plant die App beim nächsten Öffnen
          erneut.
        </Body>
      </Card>
      <Card>
        <Heading>Privat und unabhängig</Heading>
        <Body>
          Kein Konto, keine Werbung, keine eigene Nutzungsanalyse und keine
          Cloud-Synchronisierung. Es gibt keine Server-KI oder automatische
          Rechnungsanalyse.
        </Body>
        <Button
          secondary
          title="Datenschutzerklärung anzeigen"
          onPress={() => router.push('/privacy')}
        />
        <Body>Hausakte 1.0.0 · Lokal entwickelt für Android</Body>
      </Card>
    </Page>
  );
}
