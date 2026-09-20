import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useServices } from '../../core/composition';
import { useTask } from '../../core/ui/use-task';
import { useFeedback } from '../../core/ui/feedback';
import { errorText } from '../../core/ui/components';
import type { HouseEntry, HouseRecord } from '../../core/domain/models';
export function useEntryDetail(id: string) {
  const { house, revision, refresh } = useServices();
  const [entry, setEntry] = useState<HouseEntry>(),
    [record, setRecord] = useState<HouseRecord>(),
    [loading, setLoading] = useState(true);
  const task = useTask(),
    feedback = useFeedback();
  const { setError } = task;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([house.repository.entry(id), house.repository.records()])
        .then(([entry, records]) => {
          if (active) {
            setEntry(entry ?? undefined);
            setRecord(records.find((r) => r.id === entry?.recordId));
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
      // Revision/retry tokens intentionally reload persisted data on focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [house, id, revision, setError]),
  );
  return {
    entry,
    record,
    loading,
    ...task,
    remove: async () => {
      if (!entry) return;
      if (
        !(await feedback.confirm(
          'Eintrag löschen?',
          'Der Eintrag und seine Einzelprotokolle werden gelöscht. Gespeicherte Gesamtprotokolle bleiben erhalten.',
        ))
      )
        return;
      await task.run(async () => {
        const warnings = await house.delete('entry', id);
        refresh();
        router.dismissTo({
          pathname: '/record/[id]',
          params: { id: entry.recordId },
        });
        feedback.notify(warnings.join('\n') || 'Eintrag gelöscht.');
      });
    },
  };
}
