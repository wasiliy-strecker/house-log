import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useServices } from '../../core/composition';
import type {
  EntryDraft,
  HouseRecord,
  HouseEntry,
  SavedReport,
} from '../../core/domain/models';
import { PAGE_SIZE, measurementDelta } from '../../core/domain/models';
import { errorText } from '../../core/ui/components';
import { useTask } from '../../core/ui/use-task';

export function useRecords() {
  const { house, revision } = useServices();
  const [records, setRecords] = useState<HouseRecord[]>([]);
  const [drafts, setDrafts] = useState<EntryDraft[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([house.repository.records(), house.repository.drafts()])
        .then(([r, d]) => {
          if (active) {
            setRecords(r);
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
      // Repository writes invalidate the focused screen through this generation.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [house, revision]),
  );
  return {
    records: records.filter((r) =>
      `${r.name} ${r.category} ${r.location}`
        .toLocaleLowerCase('de-DE')
        .includes(search.toLocaleLowerCase('de-DE')),
    ),
    drafts,
    search,
    setSearch,
    loading,
    error,
  };
}
export function useRecordDetail(id: string) {
  const { house, media, native, revision, refresh } = useServices();
  const [record, setRecord] = useState<HouseRecord>();
  const [entries, setEntries] = useState<HouseEntry[]>([]);
  const [deltas, setDeltas] = useState<Record<string, number | null>>({});
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [reportOffset, setReportOffset] = useState(0);
  const [search, setSearchValue] = useState('');
  const [loading, setLoading] = useState(true);
  const task = useTask();
  const { setError } = task;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([
        house.repository.records(),
        house.repository.entries(id, search, offset),
        house.repository.reports(id),
      ])
        .then(async ([records, page, saved]) => {
          const comparisons = await Promise.all(
            page.rows.map(async (entry) => {
              const previous =
                await house.repository.previousMeasurement(entry);
              return [
                entry.id,
                previous ? measurementDelta(entry, previous) : null,
              ] as const;
            }),
          );
          if (!active) return;
          setRecord(records.find((r) => r.id === id));
          setEntries(page.rows);
          setDeltas(Object.fromEntries(comparisons));
          setTotal(page.total);
          setReports(saved);
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
      native.acknowledge(id).catch(() => undefined);
      return () => {
        active = false;
      };
      // Repository writes invalidate the focused screen through this generation.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [house, id, search, offset, revision, native, setError]),
  );
  return {
    record,
    entries,
    deltas,
    reports: reports.slice(reportOffset, reportOffset + PAGE_SIZE),
    reportTotal: reports.length,
    reportOffset,
    setReportOffset,
    total,
    offset,
    setOffset,
    search,
    setSearch: (v: string) => {
      setOffset(0);
      setSearchValue(v);
    },
    loading,
    ...task,
    createReport: (entryId: string | null, full: boolean) =>
      task.run(async () => {
        await house.createReport(id, entryId, full);
        task.setNotice(
          'Protokoll gespeichert. Es bleibt bei späteren Änderungen unverändert.',
        );
        refresh();
      }),
    remove: (kind: 'record' | 'entry' | 'report', itemId: string) =>
      task.run(async () => {
        const warnings = await house.delete(kind, itemId);
        refresh();
        if (kind === 'record') router.back();
        else task.setNotice(warnings.join('\n'));
      }),
    open: (report: SavedReport) => task.run(() => media.open(report)),
    share: (report: SavedReport) => task.run(() => media.share(report)),
  };
}
