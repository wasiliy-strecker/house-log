import type {
  HouseEntry,
  HouseRecord,
  Reminder,
  EntryDraft,
} from '../../core/domain/models';
import { categories, measurementDelta } from '../../core/domain/models';

export type HistoryItem = {
  entry: HouseEntry;
  photoUri?: string;
  photoCount: number;
  measurementText: string;
  comparison: string | null;
};
export function historyComparison(
  entry: HouseEntry,
  previous: HouseEntry | null,
): string | null {
  if (!previous) return null;
  const delta = measurementDelta(entry, previous);
  if (delta === null || !entry.measurement || !previous.measurement)
    return null;
  return `${previous.measurement.value.toLocaleString('de-DE')} → ${entry.measurement.value.toLocaleString('de-DE')} = ${delta.toLocaleString('de-DE')} ${entry.measurement.unit} Differenz`;
}

export function categorySuggestions(records: HouseRecord[]): string[] {
  const unique = new Map<string, string>();
  const saved = records
    .map((record) => record.category.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'de-DE'));
  for (const category of [...categories, ...saved]) {
    const key = category.toLocaleLowerCase('de-DE');
    if (!unique.has(key)) unique.set(key, category);
  }
  return [...unique.values()];
}
export type DashboardItem = {
  record: HouseRecord;
  latest: HouseEntry | null;
  lastEdited: string;
};
export type RecordSort = 'lastEdited' | 'name' | 'category';
export const sortLabels: Record<RecordSort, string> = {
  lastEdited: 'Zuletzt bearbeitet',
  name: 'Name',
  category: 'Kategorie',
};
export const dateTime = (value: string | number) =>
  new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
export function entrySummary(entry: HouseEntry | null) {
  return !entry
    ? 'Noch kein Eintrag'
    : entry.activity +
        (entry.measurement
          ? ` · ${entry.measurement.value.toLocaleString('de-DE')} ${entry.measurement.unit}`
          : '');
}
export function visibleRecords(
  items: DashboardItem[],
  search: string,
  sort: RecordSort,
) {
  const q = search.trim().toLocaleLowerCase('de-DE');
  return items
    .filter(({ record: r, latest }) =>
      [
        r.name,
        r.category,
        r.location,
        r.manufacturer,
        r.model,
        r.serial,
        r.installedOn,
        latest ? entrySummary(latest) : '',
      ].some((v) => v.toLocaleLowerCase('de-DE').includes(q)),
    )
    .sort(
      (a, b) =>
        (sort === 'lastEdited'
          ? b.lastEdited.localeCompare(a.lastEdited)
          : sort === 'name'
            ? a.record.name.localeCompare(b.record.name, 'de-DE')
            : a.record.category.localeCompare(b.record.category, 'de-DE')) ||
        a.record.name.localeCompare(b.record.name, 'de-DE') ||
        a.record.id.localeCompare(b.record.id),
    );
}
export function reminderSummary(r: Reminder) {
  const time = `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')} Uhr`;
  const labels = {
    hourly: `stündlich ab ${dateTime(r.startsAtMillis)}`,
    daily: `täglich um ${time}`,
    weekly: `${['montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags', 'sonntags'][r.day - 1]} um ${time}`,
    monthly: `monatlich am ${r.day}. um ${time}`,
    yearly: `jährlich am ${r.day}.${r.month}. um ${time}`,
  };
  return (
    labels[r.interval] +
    (r.deliveryMode === 'punctualWithSound' ? ' · pünktlich mit Ton' : '')
  );
}
export function capturePhase(draft: EntryDraft): 'choose' | 'form' {
  return draft.entryId ||
    draft.form.attachments.length ||
    draft.form.activity ||
    draft.form.note ||
    draft.form.cost ||
    draft.form.provider ||
    draft.form.value
    ? 'form'
    : (draft.captureStage ?? 'choose');
}
