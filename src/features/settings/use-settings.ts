import { useCallback, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useServices } from '../../core/composition';
import type { ReminderStatus } from '../../core/native/house-native';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';
export function useSettings() {
  const { backup, media, house, native, refresh } = useServices();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [status, setStatus] = useState<ReminderStatus>();
  const task = useTask();
  const { setError } = task;
  const load = useCallback(() => {
    native
      .reminderStatus()
      .then(setStatus)
      .catch((e) => setError(errorText(e)));
  }, [native, setError]);
  useFocusEffect(
    useCallback(() => {
      load();
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') load();
      });
      return () => listener.remove();
    }, [load]),
  );
  return {
    ...task,
    password,
    setPassword,
    repeat,
    setRepeat,
    status,
    create: () =>
      task.run(async () => {
        if (password !== repeat)
          throw new Error('Die beiden Passwörter stimmen nicht überein.');
        const bytes = await backup.create(password);
        await media.exportBackup(bytes);
        setPassword('');
        setRepeat('');
        task.setNotice(
          'Das verschlüsselte Backup wurde an die gewählte Speicher- oder Teilen-App übergeben. Bitte die Datei dort aufbewahren.',
        );
      }),
    restore: () =>
      task.run(async () => {
        if (!password)
          throw new Error('Bitte zuerst das Backup-Passwort eingeben.');
        const bytes = await media.pickBackup();
        if (!bytes) return;
        const decoded = await backup.codec.decode(bytes, password);
        const accepted = await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Geprüftes Backup übernehmen?',
            `${decoded.data.records.length} Akten, ${decoded.data.entries.length} Einträge und ${decoded.data.reports.length} Protokolle. Neuere lokale Einträge bleiben erhalten. Fehlende passende Dateien werden repariert.`,
            [
              {
                text: 'Abbrechen',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              { text: 'Wiederherstellen', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          ),
        );
        if (!accepted) return;
        const result = await backup.restore(decoded);
        refresh();
        load();
        setPassword('');
        setRepeat('');
        task.setNotice(
          [
            'Backup wiederhergestellt. Die Daten sind sofort in deinen Akten sichtbar.',
            ...result.warnings,
          ].join('\n'),
        );
      }),
    permissions: () =>
      task.run(async () => {
        if (Platform.OS === 'android' && Number(Platform.Version) >= 33)
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        const warnings = await house.syncReminders();
        task.setNotice(
          warnings.join('\n') || 'Erinnerungen wurden aktualisiert.',
        );
        load();
      }),
    openSettings: (exact: boolean) =>
      task.run(() => native.openReminderSettings(exact)),
    test: (punctual: boolean) =>
      task.run(async () => {
        const result = await native.testReminder(punctual);
        task.setNotice(
          result === 'posted'
            ? 'Test-Erinnerung gesendet. Sie verschwindet nach einer Minute.'
            : 'Die Test-Erinnerung konnte nicht angezeigt werden. Bitte App- und Kanalberechtigungen prüfen.',
        );
        load();
      }),
  };
}
