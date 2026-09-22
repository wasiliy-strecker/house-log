import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  Body,
  Button,
  Busy,
  Card,
  DateField,
  Field,
  Notice,
  Page,
  SelectField,
  MaterialSwitch,
  useTheme,
} from '../../core/ui/components';
import { Icon } from '../../core/ui/icon';
import { SuggestionField } from '../../core/ui/suggestion-field';
import type { Reminder } from '../../core/domain/models';
import { useRecordEditor } from './use-record-editor';
import { useReminderStatus } from './use-records';
const intervals: Record<Reminder['interval'], string> = {
  hourly: 'Stündlich',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
};
const weekdays = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
];
export function RecordEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const vm = useRecordEditor(id),
    c = useTheme(),
    status = useReminderStatus();
  const r = vm.record;
  if (!r)
    return (
      <Page ready={!!vm.error}>
        <Notice error text={vm.error} />
        {!vm.error && <Busy />}
      </Page>
    );
  const reminder = r.reminder;
  const time = reminder
    ? `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')} Uhr`
    : '';
  function pickTime() {
    const date = new Date();
    date.setHours(reminder!.hour, reminder!.minute);
    DateTimePickerAndroid.open({
      value: date,
      mode: 'time',
      is24Hour: true,
      onChange: (e, value) => {
        if (e.type === 'set' && value)
          vm.reminder({ hour: value.getHours(), minute: value.getMinutes() });
      },
    });
  }
  return (
    <Page
      bottom={
        <>
          {!id && (
            <Body muted style={{ fontSize: 12 }}>
              Speichere zuerst die Akte. Anschließend kannst du den ersten
              Eintrag mit oder ohne Fotos und Dokumente erfassen.
            </Body>
          )}
          <Button
            icon={id && !vm.dirty ? 'check_circle_outline' : 'save_outlined'}
            title={
              vm.busy
                ? 'Wird gespeichert …'
                : id && !vm.dirty
                  ? 'Alles gespeichert'
                  : id
                    ? 'Änderungen speichern'
                    : 'Akte speichern'
            }
            disabled={vm.busy || !vm.dirty}
            onPress={() => void vm.save()}
          />
        </>
      }
    >
      <Stack.Screen
        options={{ title: id ? 'Akte bearbeiten' : 'Akte anlegen' }}
      />
      <View style={{ gap: 16 }}>
        <Notice error text={vm.error} />
        <SuggestionField
          label="Kategorie"
          placeholder="z. B. Haus oder Heizung"
          helper="Vorschlag auswählen oder eigene Kategorie eingeben."
          value={r.category}
          suggestions={vm.categorySuggestions}
          disabled={vm.busy}
          showAllOnFocus
          onChange={(v) => vm.change('category', v)}
        />
        <Field
          label="Name *"
          value={r.name}
          onChangeText={(v) => vm.change('name', v)}
          editable={!vm.busy}
        />
        <Field
          label="Standort / Adresse (optional)"
          value={r.location}
          onChangeText={(v) => vm.change('location', v)}
          editable={!vm.busy}
          multiline
          numberOfLines={3}
          submitBehavior="newline"
          scrollEnabled={false}
        />
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anlagendaten (optional)"
            accessibilityState={{
              expanded: vm.technicalExpanded,
              disabled: vm.busy,
            }}
            disabled={vm.busy}
            onPress={vm.toggleTechnical}
            android_ripple={{ color: c.primary + '22' }}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Body style={{ fontSize: 16, lineHeight: 24 }}>
                Anlagendaten (optional)
              </Body>
              <Body muted>Hersteller, Modell und Seriennummer</Body>
            </View>
            <View
              style={{
                transform: [
                  { rotate: vm.technicalExpanded ? '180deg' : '0deg' },
                ],
              }}
            >
              <Icon name="expand_more" color={c.primary} />
            </View>
          </Pressable>
          {vm.technicalExpanded && (
            <View style={{ gap: 16, paddingTop: 4 }}>
              <Field
                label="Hersteller (optional)"
                value={r.manufacturer}
                onChangeText={(v) => vm.change('manufacturer', v)}
                editable={!vm.busy}
              />
              <Field
                label="Modell (optional)"
                value={r.model}
                onChangeText={(v) => vm.change('model', v)}
                editable={!vm.busy}
              />
              <Field
                label="Seriennummer (optional)"
                value={r.serial}
                onChangeText={(v) => vm.change('serial', v)}
                editable={!vm.busy}
              />
            </View>
          )}
        </Card>
        <DateField
          label="Einbau / Anschaffung (optional)"
          value={r.installedOn}
          onChange={(v) => vm.change('installedOn', v)}
          optional
          disabled={vm.busy}
        />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Body style={{ fontSize: 16 }}>Aktenerinnerung</Body>
              <Body muted>Optional und nur lokal auf diesem Gerät</Body>
            </View>
            <MaterialSwitch
              label="Erinnerung aktivieren"
              value={!!reminder}
              disabled={vm.busy}
              onValueChange={vm.toggleReminder}
            />
          </View>
          {reminder && (
            <View style={{ gap: 16 }}>
              <SelectField
                label="Intervall"
                value={reminder.interval}
                options={Object.entries(intervals).map(([value, label]) => ({
                  value,
                  label,
                }))}
                disabled={vm.busy}
                onChange={(value) =>
                  vm.reminder({
                    interval: value as Reminder['interval'],
                    day:
                      value === 'weekly'
                        ? Math.min(reminder.day, 7)
                        : reminder.day,
                  })
                }
              />
              {reminder.interval === 'yearly' && (
                <SelectField
                  label="Monat"
                  value={String(reminder.month)}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: new Date(2026, i, 1).toLocaleString('de-DE', {
                      month: 'long',
                    }),
                  }))}
                  onChange={(v) => vm.reminder({ month: Number(v) })}
                />
              )}
              {reminder.interval === 'weekly' && (
                <SelectField
                  label="Wochentag"
                  value={String(reminder.day)}
                  options={weekdays.map((label, i) => ({
                    label,
                    value: String(i + 1),
                  }))}
                  onChange={(v) => vm.reminder({ day: Number(v) })}
                />
              )}
              {(reminder.interval === 'monthly' ||
                reminder.interval === 'yearly') && (
                <SelectField
                  label="Tag"
                  value={String(reminder.day)}
                  options={Array.from({ length: 31 }, (_, i) => String(i + 1))}
                  onChange={(v) => vm.reminder({ day: Number(v) })}
                />
              )}
              {reminder.interval === 'hourly' ? (
                <DateField
                  label="Erster Termin"
                  time
                  value={new Date(reminder.startsAtMillis).toISOString()}
                  onChange={(v) =>
                    vm.reminder({ startsAtMillis: new Date(v).getTime() })
                  }
                />
              ) : (
                <View style={{ gap: 8 }}>
                  <Body>Uhrzeit: {time}</Body>
                  <Button
                    secondary
                    icon="schedule"
                    title="Uhrzeit ändern"
                    onPress={pickTime}
                  />
                </View>
              )}
              {(['normal', 'punctualWithSound'] as const).map((mode) => (
                <Card
                  key={mode}
                  onPress={() => vm.reminder({ deliveryMode: mode })}
                  style={{
                    borderColor:
                      reminder.deliveryMode === mode ? c.primary : c.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      name={
                        reminder.deliveryMode === mode
                          ? 'check_circle_outline'
                          : 'notifications_active_outlined'
                      }
                      color={c.primary}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Body strong>
                        {mode === 'normal'
                          ? 'Normale Erinnerung'
                          : 'Pünktlich mit Ton'}
                      </Body>
                      <Body muted>
                        {mode === 'normal'
                          ? 'Android kann die Erinnerung etwas später anzeigen.'
                          : 'Benötigt die Freigabe für genaue Alarme. Android-Einstellungen können den Ton beeinflussen.'}
                      </Body>
                    </View>
                  </View>
                </Card>
              ))}
              {status && !status.notifications && (
                <>
                  <Notice
                    error
                    text="Benachrichtigungen sind in Android blockiert."
                  />
                  <Button
                    secondary
                    title="Benachrichtigungen erlauben"
                    onPress={() => void vm.openReminderSettings(false)}
                  />
                </>
              )}
              {reminder.deliveryMode === 'punctualWithSound' &&
                status &&
                !status.exact && (
                  <>
                    <Notice text="Ohne Freigabe für genaue Alarme erinnert Android möglicherweise später." />
                    <Button
                      secondary
                      title="Alarme & Erinnerungen erlauben"
                      onPress={() => void vm.openReminderSettings(true)}
                    />
                  </>
                )}
              <Button
                secondary
                icon="notifications_active_outlined"
                title="Erinnerung testen"
                disabled={vm.busy}
                onPress={() =>
                  void vm.testReminder(
                    reminder.deliveryMode === 'punctualWithSound',
                  )
                }
              />
            </View>
          )}
        </Card>
        <Field
          label="Notiz (optional)"
          multiline
          value={r.note}
          onChangeText={(v) => vm.change('note', v)}
          editable={!vm.busy}
        />
      </View>
    </Page>
  );
}
