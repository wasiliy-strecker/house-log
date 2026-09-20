import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { PermissionsAndroid, Platform } from 'react-native';
import { useServices } from '../../core/composition';
import type { HouseRecord, Reminder } from '../../core/domain/models';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';
import { useFeedback } from '../../core/ui/feedback';
import { useLeaveGuard } from '../../core/ui/use-leave-guard';
export function useRecordEditor(id?: string) {
  const { house, refresh, native } = useServices();
  const feedback = useFeedback();
  const [record, setRecord] = useState<HouseRecord | undefined>(() => {
    if (id) return;
    const now = house.env.now();
    return {
      id: house.env.id(),
      name: '',
      category: 'Haus',
      location: '',
      manufacturer: '',
      model: '',
      serial: '',
      installedOn: '',
      note: '',
      reminder: null,
      createdAt: now,
      updatedAt: now,
    };
  });
  const [initial, setInitial] = useState(() => JSON.stringify(record));
  const [initialReady, setReady] = useState(!id);
  const task = useTask();
  const { setError } = task;
  useEffect(() => {
    let active = true;
    if (id)
      house.repository
        .records()
        .then((records) => {
          const found = records.find((r) => r.id === id);
          if (!found) throw new Error('Die Akte wurde nicht gefunden.');
          if (active) {
            setRecord(found);
            setInitial(JSON.stringify(found));
            setReady(true);
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        });
    return () => {
      active = false;
    };
  }, [house, id, setError]);
  const dirty = initialReady && JSON.stringify(record) !== initial;
  const leave = useLeaveGuard({
    dirty,
    busy: task.busy,
    discard: async () => {},
    title: id ? 'Änderungen verwerfen?' : 'Eingaben verwerfen?',
  });
  function change<K extends keyof HouseRecord>(key: K, value: HouseRecord[K]) {
    setRecord((current) => current && { ...current, [key]: value });
  }
  return {
    record,
    dirty,
    change,
    ...task,
    reminder: (value: Partial<Reminder>) => {
      if (record?.reminder)
        change('reminder', { ...record.reminder, ...value });
    },
    toggleReminder: (enabled: boolean) =>
      change(
        'reminder',
        enabled
          ? {
              interval: 'monthly',
              day: 1,
              month: 1,
              hour: 9,
              minute: 0,
              deliveryMode: 'normal',
              startsAtMillis: Date.now() + 3600000,
            }
          : null,
      ),
    testReminder: (punctual: boolean) =>
      task.run(async () => {
        const result = await native.testReminder(punctual);
        feedback.notify(
          result === 'posted'
            ? 'Test-Erinnerung gesendet. Sie verschwindet nach einer Minute.'
            : 'Die Erinnerung ist in Android blockiert. Bitte die Benachrichtigungseinstellungen prüfen.',
        );
      }),
    openReminderSettings: (exact: boolean) =>
      task.run(() => native.openReminderSettings(exact)),
    save: () =>
      task.run(async () => {
        if (!record) return;
        if (
          record.reminder &&
          Platform.OS === 'android' &&
          Number(Platform.Version) >= 33
        )
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        const warnings = await house.saveRecord(record);
        refresh();
        leave(() => {
          if (id)
            router.dismissTo({
              pathname: '/record/[id]',
              params: { id: record.id },
            });
          else
            router.replace({
              pathname: '/record/[id]',
              params: { id: record.id },
            });
        });
        feedback.notify(
          warnings.join('\n') ||
            (id
              ? 'Änderungen an der Akte gespeichert.'
              : 'Akte gespeichert. Als Nächstes kannst du den ersten Eintrag erfassen.'),
        );
      }),
  };
}
