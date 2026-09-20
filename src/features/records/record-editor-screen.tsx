import { Switch, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  Card,
  Choices,
  DateField,
  Field,
  Heading,
  Notice,
  Page,
  Title,
  styles,
} from '../../core/ui/components';
import { categories, type Reminder } from '../../core/domain/models';
import { useRecordEditor } from './use-record-editor';

const intervals: Record<Reminder['interval'], string> = {
  hourly: 'Stündlich',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
};
export function RecordEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const vm = useRecordEditor(id);
  const record = vm.record;
  if (!record)
    return (
      <Page>
        <Notice error text={vm.error} />
        <Busy />
      </Page>
    );
  const reminder = record.reminder;
  return (
    <Page>
      <Title subtitle="Ein Haus, eine Wohnung oder eine einzelne Anlage.">
        {id ? 'Akte bearbeiten' : 'Neue Akte'}
      </Title>
      <Notice error text={vm.error} />
      <Field
        label="Name *"
        value={record.name}
        onChangeText={(v) => vm.change('name', v)}
        placeholder="Zum Beispiel Haus Musterstraße"
      />
      <Field
        label="Kategorie"
        value={record.category}
        onChangeText={(v) => vm.change('category', v)}
      />
      <Choices
        values={categories}
        selected={record.category}
        onSelect={(v) => vm.change('category', v)}
      />
      <Field
        label="Standort / Adresse"
        value={record.location}
        onChangeText={(v) => vm.change('location', v)}
      />
      <Field
        label="Hersteller"
        value={record.manufacturer}
        onChangeText={(v) => vm.change('manufacturer', v)}
      />
      <Field
        label="Modell"
        value={record.model}
        onChangeText={(v) => vm.change('model', v)}
      />
      <Field
        label="Seriennummer"
        value={record.serial}
        onChangeText={(v) => vm.change('serial', v)}
      />
      <DateField
        label="Einbau- oder Anschaffungsdatum"
        value={record.installedOn}
        optional
        onChange={(v) => vm.change('installedOn', v)}
      />
      <Field
        label="Notiz"
        multiline
        value={record.note}
        onChangeText={(v) => vm.change('note', v)}
      />
      <Card>
        <View style={styles.row}>
          <Heading>Lokale Erinnerung</Heading>
          <Switch
            accessibilityLabel="Erinnerung aktivieren"
            value={!!reminder}
            onValueChange={vm.toggleReminder}
          />
        </View>
        <Body>Optional an Wartung oder einen neuen Eintrag erinnern.</Body>
        {reminder && (
          <>
            <Choices
              values={Object.values(intervals)}
              selected={intervals[reminder.interval]}
              onSelect={(label) =>
                vm.reminder({
                  interval: Object.entries(intervals).find(
                    ([, v]) => v === label,
                  )![0] as Reminder['interval'],
                })
              }
            />
            {reminder.interval === 'hourly' ? (
              <DateField
                time
                label="Erster Termin"
                value={new Date(reminder.startsAtMillis).toISOString()}
                onChange={(v) =>
                  vm.reminder({ startsAtMillis: new Date(v).getTime() })
                }
              />
            ) : (
              <>
                <Field
                  label="Stunde (0–23)"
                  keyboardType="number-pad"
                  value={String(reminder.hour)}
                  onChangeText={(v) => vm.reminder({ hour: Number(v) })}
                />
                <Field
                  label="Minute (0–59)"
                  keyboardType="number-pad"
                  value={String(reminder.minute)}
                  onChangeText={(v) => vm.reminder({ minute: Number(v) })}
                />
              </>
            )}
            {['weekly', 'monthly', 'yearly'].includes(reminder.interval) && (
              <Field
                label={
                  reminder.interval === 'weekly'
                    ? 'Wochentag (1 = Montag, 7 = Sonntag)'
                    : 'Tag im Monat (1–31)'
                }
                keyboardType="number-pad"
                value={String(reminder.day)}
                onChangeText={(v) => vm.reminder({ day: Number(v) })}
              />
            )}
            {reminder.interval === 'yearly' && (
              <Field
                label="Monat (1–12)"
                keyboardType="number-pad"
                value={String(reminder.month)}
                onChangeText={(v) => vm.reminder({ month: Number(v) })}
              />
            )}
            <Choices
              values={['Normal', 'Pünktlich mit Alarmton']}
              selected={
                reminder.deliveryMode === 'normal'
                  ? 'Normal'
                  : 'Pünktlich mit Alarmton'
              }
              onSelect={(v) =>
                vm.reminder({
                  deliveryMode: v === 'Normal' ? 'normal' : 'punctualWithSound',
                })
              }
            />
            <Body>
              Am Monatsende wird bei Bedarf der letzte gültige Tag verwendet.
              Android-Berechtigungen und Energiesparregeln können die Zustellung
              beeinflussen.
            </Body>
          </>
        )}
      </Card>
      {vm.busy && <Busy />}
      <Button
        title={id ? 'Änderungen speichern' : 'Akte anlegen'}
        disabled={vm.busy}
        onPress={() => {
          void vm.save();
        }}
      />
    </Page>
  );
}
