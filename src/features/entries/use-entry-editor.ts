import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { useServices } from '../../core/composition';
import {
  defaultActivities,
  type Attachment,
  type EntryDraft,
  type EntryForm,
} from '../../core/domain/models';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';

export function useEntryEditor(recordId: string, entryId?: string) {
  const { house, media, refresh } = useServices();
  const [draft, setDraft] = useState<EntryDraft>();
  const current = useRef<EntryDraft | undefined>(undefined);
  const [activities, setActivities] = useState(defaultActivities);
  const [recordName, setRecordName] = useState('');
  const task = useTask();
  const { setError, setNotice } = task;
  useEffect(() => {
    let active = true;
    (async () => {
      const data = await house.repository.snapshot();
      const record = data.records.find((r) => r.id === recordId);
      const entry = data.entries.find((e) => e.id === entryId);
      if (!record || (entryId && (!entry || entry.recordId !== recordId)))
        throw new Error('Akte oder Eintrag nicht gefunden.');
      const saved = await house.draft(recordId, entry);
      if (active) {
        setRecordName(record.name);
        setActivities([...new Set([...defaultActivities, ...data.activities])]);
        current.current = saved;
        setDraft(saved);
        if (saved.external === 'scanner')
          setNotice(
            'Dein Entwurf wurde wiederhergestellt. Den unterbrochenen Scan bitte erneut starten.',
          );
        else
          setNotice(
            'Eingaben und übernommene Anhänge werden als Entwurf auf diesem Gerät gesichert.',
          );
      }
    })().catch((e) => setError(errorText(e)));
    return () => {
      active = false;
    };
  }, [house, recordId, entryId, setError, setNotice]);
  useEffect(() => {
    if (!task.busy) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, [task.busy]);
  function apply(next: EntryDraft): Promise<void> {
    current.current = next;
    setDraft(next);
    return house.persistDraft(next);
  }
  function change<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    if (!current.current) return;
    const next = {
      ...current.current,
      form: { ...current.current.form, [key]: value },
    };
    void apply(next).catch((e) =>
      setError(`Entwurf konnte nicht gesichert werden: ${errorText(e)}`),
    );
  }
  function setAttachments(items: Attachment[]) {
    change('attachments', [
      ...items.filter((a) => a.kind === 'photo'),
      ...items.filter((a) => a.kind === 'pdf'),
    ]);
  }
  return {
    draft,
    activities,
    recordName,
    change,
    setAttachments,
    ...task,
    uri: (a: Attachment) => house.vault.uri(a.file),
    pick: (source: NonNullable<EntryDraft['external']>, replaceId?: string) =>
      task.run(async () => {
        if (!current.current) return;
        // A durable barrier before every external UI, including permission prompts.
        await apply({ ...current.current, external: source });
        const result = await media.pick(source, !replaceId);
        const before = current.current.form.attachments;
        let attachments = [...before];
        if (replaceId && result.attachments[0]) {
          attachments = before.map((a) =>
            a.id === replaceId ? result.attachments[0]! : a,
          );
        } else attachments.push(...result.attachments);
        try {
          await apply({
            ...current.current,
            external: null,
            form: {
              ...current.current.form,
              attachments: [
                ...attachments.filter((a) => a.kind === 'photo'),
                ...attachments.filter((a) => a.kind === 'pdf'),
              ],
            },
          });
        } catch (error) {
          current.current = {
            ...current.current,
            form: { ...current.current.form, attachments: before },
          };
          setDraft(current.current);
          await house.cleanup(result.attachments.map((a) => a.file));
          throw error;
        }
        if (result.failures.length) task.setError(result.failures.join('\n'));
      }),
    move: (id: string, delta: number) => {
      const items = [...(current.current?.form.attachments ?? [])];
      const index = items.findIndex((a) => a.id === id);
      const item = items[index];
      const next = items[index + delta];
      if (!item || !next || item.kind !== next.kind) return;
      items[index] = next;
      items[index + delta] = item;
      setAttachments(items);
    },
    open: (a: Attachment) => task.run(() => media.open(a)),
    share: (a: Attachment) => task.run(() => media.share(a)),
    save: () =>
      task.run(async () => {
        if (!current.current) return;
        await house.persistDraft(current.current);
        const result = await house.saveEntry(current.current);
        refresh();
        if (result.warnings.length)
          Alert.alert('Eintrag gespeichert', result.warnings.join('\n'));
        router.back();
      }),
    discard: () =>
      task.run(async () => {
        if (current.current) await house.discard(current.current);
        refresh();
        router.back();
      }),
  };
}
