import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useServices } from '../../core/composition';
import type { HouseRecord, Reminder } from '../../core/domain/models';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';
export function useRecordEditor(id?: string) {
  const { house, refresh } = useServices();
  const [record, setRecord] = useState<HouseRecord | undefined>(() => {
    if (id) return undefined;
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
  const task = useTask();
  const { setError } = task;
  useEffect(() => {
    if (id)
      house.repository
        .records()
        .then((records) => {
          const found = records.find((r) => r.id === id);
          if (!found) throw new Error('Die Akte wurde nicht gefunden.');
          setRecord(found);
        })
        .catch((e) => setError(errorText(e)));
  }, [house, id, setError]);
  function change<K extends keyof HouseRecord>(key: K, value: HouseRecord[K]) {
    setRecord((current) => current && { ...current, [key]: value });
  }
  function reminder(value: Partial<Reminder>) {
    if (record?.reminder) change('reminder', { ...record.reminder, ...value });
  }
  return {
    record,
    change,
    reminder,
    ...task,
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
    save: () =>
      task.run(async () => {
        if (!record) return;
        const warnings = await house.saveRecord(record);
        refresh();
        if (warnings.length)
          Alert.alert('Akte gespeichert', warnings.join('\n'));
        if (id) router.back();
        else
          router.replace({
            pathname: '/record/[id]',
            params: { id: record.id },
          });
      }),
  };
}
