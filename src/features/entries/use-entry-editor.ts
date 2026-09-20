import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useServices } from '../../core/composition';
import {
  defaultActivities,
  costInput,
  type Attachment,
  type EntryDraft,
  type EntryForm,
} from '../../core/domain/models';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';
import { useFeedback } from '../../core/ui/feedback';
import { useLeaveGuard } from '../../core/ui/use-leave-guard';
import { capturePhase } from '../records/presentation-model';
export function useEntryEditor(recordId: string, entryId?: string) {
  const { house, media, refresh } = useServices();
  const feedback = useFeedback();
  const [draft, setDraft] = useState<EntryDraft>(),
    [activities, setActivities] = useState(defaultActivities),
    [initialForm, setInitialForm] = useState('');
  const current = useRef<EntryDraft | undefined>(undefined),
    initial = useRef(''),
    committed = useRef(false);
  const task = useTask();
  const { setError, setNotice } = task;
  useEffect(() => {
    let active = true;
    (async () => {
      const [data, savedEntry] = await Promise.all([
        house.repository.snapshot(),
        entryId ? house.repository.entry(entryId) : null,
      ]);
      const record = data.records.find((r) => r.id === recordId);
      if (
        !record ||
        (entryId && (!savedEntry || savedEntry.recordId !== recordId))
      )
        throw new Error('Akte oder Eintrag nicht gefunden.');
      const saved = await house.draft(recordId, savedEntry ?? undefined);
      const original: EntryForm = savedEntry
        ? {
            activity: savedEntry.activity,
            occurredAt: savedEntry.occurredAt,
            provider: savedEntry.provider,
            cost: costInput(savedEntry.costCents),
            value:
              savedEntry.measurement?.value.toString().replace('.', ',') ?? '',
            unit: savedEntry.measurement?.unit ?? 'h',
            note: savedEntry.note,
            attachments: savedEntry.attachments,
          }
        : {
            activity: '',
            occurredAt: saved.createdAt,
            provider: '',
            cost: '',
            value: '',
            unit: 'h',
            note: '',
            attachments: [],
          };
      if (active) {
        initial.current = JSON.stringify(original);
        setInitialForm(initial.current);
        current.current = saved;
        setDraft(saved);
        setActivities([...new Set([...defaultActivities, ...data.activities])]);
        if (saved.external === 'scanner')
          setNotice(
            'Dein Entwurf wurde wiederhergestellt. Den unterbrochenen Scan bitte erneut starten.',
          );
      }
    })().catch((e) => setError(errorText(e)));
    return () => {
      active = false;
      const d = current.current;
      if (d && !committed.current && JSON.stringify(d.form) === initial.current)
        void house.discard(d).catch(() => {});
    };
  }, [house, recordId, entryId, setError, setNotice]);
  const dirty = !!draft && JSON.stringify(draft.form) !== initialForm;
  const leave = useLeaveGuard({
    dirty,
    busy: task.busy,
    title: entryId ? 'Änderungen verwerfen?' : 'Eintrag verwerfen?',
    discard: async () => {
      if (current.current) await house.discard(current.current);
      committed.current = true;
      refresh();
    },
  });
  function apply(next: EntryDraft) {
    current.current = next;
    setDraft(next);
    return house.persistDraft(next);
  }
  function change<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    if (!current.current) return;
    void apply({
      ...current.current,
      form: { ...current.current.form, [key]: value },
    }).catch((e) =>
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
    dirty,
    phase: draft ? capturePhase(draft) : 'choose',
    change,
    setAttachments,
    ...task,
    chooseManual: () =>
      task.run(async () => {
        if (!current.current) return;
        const next = {
          ...current.current,
          captureStage: 'form' as const,
          captureSource: 'manual' as const,
        };
        await apply(next);
      }),
    pick: (source: NonNullable<EntryDraft['external']>, replaceId?: string) =>
      task.run(async () => {
        if (!current.current) return;
        await apply({ ...current.current, external: source });
        const result = await media.pick(source, !replaceId);
        const before = current.current.form.attachments;
        let attachments = [...before];
        if (replaceId && result.attachments[0])
          attachments = before.map((a) =>
            a.id === replaceId ? result.attachments[0]! : a,
          );
        else attachments.push(...result.attachments);
        try {
          await apply({
            ...current.current,
            external: null,
            captureStage: attachments.length
              ? 'form'
              : current.current.captureStage,
            captureSource:
              current.current.captureSource ??
              (attachments.length ? 'photo' : undefined),
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
        if (result.failures.length) setError(result.failures.join('\n'));
      }),
    remove: (id: string) =>
      setAttachments(
        (current.current?.form.attachments ?? []).filter((a) => a.id !== id),
      ),
    reorderKind: (items: Attachment[]) => {
      if (!items.length) return;
      const kind = items[0]!.kind;
      const all = current.current?.form.attachments ?? [];
      setAttachments([...all.filter((a) => a.kind !== kind), ...items]);
    },
    move: (id: string, delta: number) => {
      const items = [...(current.current?.form.attachments ?? [])];
      const index = items.findIndex((a) => a.id === id),
        item = items[index],
        next = items[index + delta];
      if (!item || !next || item.kind !== next.kind) return;
      items[index] = next;
      items[index + delta] = item;
      setAttachments(items);
    },
    save: () =>
      task.run(async () => {
        if (!current.current) return;
        await house.persistDraft(current.current);
        const result = await house.saveEntry(current.current);
        committed.current = true;
        refresh();
        leave(() => {
          if (entryId)
            router.dismissTo({
              pathname: '/entry/[id]',
              params: { id: result.entry.id },
            });
          else
            router.replace({
              pathname: '/entry/[id]',
              params: { id: result.entry.id },
            });
        });
        feedback.notify(
          result.warnings.join('\n') ||
            (entryId ? 'Änderungen gespeichert.' : 'Eintrag gespeichert.'),
        );
      }),
  };
}
