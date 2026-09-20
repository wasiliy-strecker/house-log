import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useServices } from '../../core/composition';
import type {
  EntryDraft,
  HouseRecord,
  HouseEntry,
  SavedReport,
} from '../../core/domain/models';
import { PAGE_SIZE, measurementDelta } from '../../core/domain/models';
import type { ReminderStatus } from '../../core/native/house-native';
import { errorText } from '../../core/ui/components';
import { useTask } from '../../core/ui/use-task';
import { useFeedback } from '../../core/ui/feedback';
import {
  visibleRecords,
  type DashboardItem,
  type RecordSort,
} from './presentation-model';
export function useReminderStatus() {
  const { native } = useServices();
  const [status, setStatus] = useState<ReminderStatus>();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () =>
        native
          .reminderStatus()
          .then((v) => {
            if (active) setStatus(v);
          })
          .catch(() => {});
      void load();
      const l = AppState.addEventListener('change', (s) => {
        if (s === 'active') void load();
      });
      return () => {
        active = false;
        l.remove();
      };
    }, [native]),
  );
  return status;
}
export function useRecords() {
  const { house, revision } = useServices();
  const [items, setItems] = useState<DashboardItem[]>([]),
    [drafts, setDrafts] = useState<EntryDraft[]>([]),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState<RecordSort>('lastEdited'),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const status = useReminderStatus();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([house.repository.dashboard(), house.repository.drafts()])
        .then(([r, d]) => {
          if (active) {
            setItems(r);
            setDrafts(d);
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
    }, [house, revision, retry]),
  );
  return {
    items: visibleRecords(items, search, sort),
    empty: !items.length,
    drafts,
    search,
    setSearch,
    sort,
    setSort,
    loading,
    error,
    status,
    retry: () => setRetry((n) => n + 1),
  };
}
export function useRecordDetail(id: string, history = false) {
  const { house, native, revision, refresh } = useServices();
  const [record, setRecord] = useState<HouseRecord>(),
    [entries, setEntries] = useState<HouseEntry[]>([]),
    [deltas, setDeltas] = useState<Record<string, number | null>>({}),
    [total, setTotal] = useState(0),
    [offset, setOffset] = useState(0),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true);
  const task = useTask();
  const { setError } = task;
  const status = useReminderStatus();
  const [hasAttachments, setHasAttachments] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([
        house.repository.records(),
        house.repository.entries(
          id,
          history ? search : '',
          history ? offset : 0,
        ),
      ])
        .then(async ([records, page]) => {
          const comparisons = await Promise.all(
            page.rows.map(async (e) => {
              const p = await house.repository.previousMeasurement(e);
              return [e.id, p ? measurementDelta(e, p) : null] as const;
            }),
          );
          if (!active) return;
          setRecord(records.find((r) => r.id === id));
          setEntries(page.rows);
          setTotal(page.total);
          setHasAttachments(page.hasAttachments);
          setDeltas(Object.fromEntries(comparisons));
          setError('');
          if (offset && offset >= page.total)
            setOffset(
              Math.max(0, Math.floor((page.total - 1) / PAGE_SIZE) * PAGE_SIZE),
            );
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      void native.acknowledge(id).catch(() => {});
      return () => {
        active = false;
      };
      // Revision/retry tokens intentionally reload persisted data on focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [house, native, id, history, search, offset, revision, setError]),
  );
  return {
    record,
    entries,
    hasAttachments,
    deltas,
    total,
    offset,
    setOffset,
    search,
    setSearch: (v: string) => {
      setOffset(0);
      setSearch(v);
    },
    loading,
    status,
    ...task,
    remove: () =>
      task.run(async () => {
        await house.delete('record', id);
        refresh();
        router.replace('/');
      }),
  };
}
export function useReports(
  recordId: string,
  entryId: string | null,
  hasAttachments: boolean,
) {
  const { house, revision, refresh } = useServices();
  const feedback = useFeedback();
  const task = useTask();
  const [reports, setReports] = useState<SavedReport[]>([]),
    [offset, setOffset] = useState(0);
  const { setError } = task;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      house.repository
        .reports(recordId)
        .then((rows) => {
          if (active) {
            const filtered = rows.filter((r) => r.entryId === entryId);
            setReports(filtered);
            setOffset((old) =>
              old >= filtered.length
                ? Math.max(
                    0,
                    Math.floor((filtered.length - 1) / PAGE_SIZE) * PAGE_SIZE,
                  )
                : old,
            );
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        });
      return () => {
        active = false;
      };
      // Revision/retry tokens intentionally reload persisted data on focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [house, recordId, entryId, revision, setError]),
  );
  return {
    ...task,
    reports: reports.slice(offset, offset + PAGE_SIZE),
    total: reports.length,
    offset,
    setOffset,
    create: async () => {
      const mode = await feedback.choose({
        title: 'PDF-Inhalt wählen',
        message: 'Wähle, welche Inhalte deine PDF enthalten soll.',
        options: [
          {
            value: 'compact',
            label: 'Kompakte PDF ohne Anhänge',
            description:
              'Einträge, Dienstleister, Kosten, Notizen und Dokumentenliste – ohne Anhänge.',
            icon: 'description_outlined',
          },
          {
            value: 'full',
            label: 'Mit Fotos und PDF-Dokumenten',
            description: hasAttachments
              ? 'Enthält alle aktuellen Fotos und alle Seiten der PDF-Dokumente.'
              : 'Keine aktuellen Fotos oder PDFs vorhanden.',
            icon: 'photo_library_outlined',
            disabled: !hasAttachments,
          },
        ],
      });
      if (mode === null) return;
      await task.run(async () => {
        const report = await house.createReport(
          recordId,
          entryId,
          mode === 'full',
        );
        refresh();
        setOffset(0);
        router.push({ pathname: '/pdf/[id]', params: { id: report.id } });
      });
    },
    open: (report: SavedReport) =>
      router.push({ pathname: '/pdf/[id]', params: { id: report.id } }),
    remove: async (report: SavedReport) => {
      if (
        await feedback.confirm(
          'Hausprotokoll löschen?',
          'Die gespeicherte PDF wird entfernt. Bereits exportierte Kopien bleiben erhalten.',
        )
      )
        await task.run(async () => {
          await house.delete('report', report.id);
          refresh();
          feedback.notify('Hausprotokoll gelöscht.');
        });
    },
  };
}
