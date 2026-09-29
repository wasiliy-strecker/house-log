import { z } from 'zod';
import { MAX_FILE_BYTES, MAX_PDF_PAGES } from '../files/limits';

const id = z.string().uuid();
const short = z.string().max(500);
const note = z.string().max(20000);
const timestamp = z.string().datetime({ offset: true });
export const fileKey = z.string().regex(/^[a-f0-9-]{36}\.(jpg|pdf)$/);
export const attachmentSchema = z
  .object({
    id,
    kind: z.enum(['photo', 'pdf']),
    name: short.min(1),
    file: fileKey,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().positive().max(MAX_FILE_BYTES),
    pages: z.number().int().positive().max(MAX_PDF_PAGES).optional(),
  })
  .strict();
export const reminderSchema = z
  .object({
    interval: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'yearly']),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    deliveryMode: z.enum(['normal', 'punctualWithSound']),
    startsAtMillis: z.number().int().nonnegative(),
  })
  .strict()
  .refine((r) => r.interval !== 'weekly' || r.day <= 7, {
    message: 'Wochentag muss zwischen 1 und 7 liegen.',
  });
export const recordSchema = z
  .object({
    id,
    name: short.trim().min(1, 'Bitte einen Namen eingeben.'),
    category: short,
    location: short,
    manufacturer: short,
    model: short,
    serial: short,
    installedOn: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    note,
    reminder: reminderSchema.nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();
export const entrySchema = z
  .object({
    id,
    recordId: id,
    activity: short.trim().min(1, 'Bitte eine Aktivität eingeben.'),
    occurredAt: timestamp,
    provider: short,
    costCents: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    measurement: z
      .object({
        value: z.number().finite().nonnegative(),
        unit: short.trim().min(1),
      })
      .strict()
      .nullable(),
    note,
    attachments: z.array(attachmentSchema).max(200),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();
export const reportSchema = z
  .object({
    id,
    recordId: id,
    entryId: id.nullable(),
    name: short,
    file: fileKey,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: timestamp,
    full: z.boolean(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    records: z.array(recordSchema).max(10000),
    entries: z.array(entrySchema).max(100000),
    reports: z.array(reportSchema).max(20000),
    activities: z.array(short).max(10000),
  })
  .strict();
export type HouseRecord = z.infer<typeof recordSchema>;
export type HouseEntry = z.infer<typeof entrySchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type SavedReport = z.infer<typeof reportSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type EntryForm = {
  activity: string;
  occurredAt: string;
  provider: string;
  cost: string;
  value: string;
  unit: string;
  note: string;
  attachments: Attachment[];
};
export type EntryDraft = {
  id: string;
  recordId: string;
  entryId: string | null;
  createdAt: string;
  form: EntryForm;
  updatedAt: string;
  external: 'camera' | 'gallery' | 'pdf' | 'scanner' | null;
  captureStage?: 'choose' | 'form';
  captureSource?: 'manual' | 'photo';
};
export const defaultActivities = [
  'Wartung',
  'Reparatur',
  'Renovierung',
  'Prüfung',
  'Anschaffung',
];
export const categories = [
  'Haus',
  'Wohnung',
  'Heizung',
  'Dach',
  'Fenster',
  'Sanitäranlage',
  'Sonstige Anlage',
];
export const units = ['h', 'kWh', 'm³', 'Liter', 'Zyklen'];
export const PAGE_SIZE = 10;
export function parseCost(value: string): number | null {
  if (!value.trim()) return null;
  const clean = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean)) {
    throw new Error(
      'Kosten bitte als Eurobetrag eingeben, zum Beispiel 123,45.',
    );
  }
  const [euros = '0', cents = ''] = clean.replaceAll('.', '').split(',');
  const result = Number(euros) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(result))
    throw new Error('Dieser Betrag ist zu groß.');
  return result;
}
export function money(cents: number | null): string {
  return cents === null
    ? ''
    : `${Math.floor(cents / 100).toLocaleString('de-DE')},${String(cents % 100).padStart(2, '0')} €`;
}
export function costInput(cents: number | null): string {
  return cents === null
    ? ''
    : `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}
export function measurementDelta(
  current: HouseEntry,
  previous: HouseEntry,
): number | null {
  return current.measurement &&
    previous.measurement &&
    current.measurement.unit === previous.measurement.unit
    ? current.measurement.value - previous.measurement.value
    : null;
}
export function snapshotFiles(data: Snapshot): string[] {
  return [
    ...new Set([
      ...data.entries.flatMap((e) => e.attachments.map((a) => a.file)),
      ...data.reports.map((r) => r.file),
    ]),
  ];
}
export function validateSnapshot(input: unknown): Snapshot {
  const data = snapshotSchema.parse(input);
  for (const rows of [data.records, data.entries, data.reports]) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error('Doppelte IDs im Backup.');
  }
  const records = new Set(data.records.map((r) => r.id));
  const entries = new Map(data.entries.map((e) => [e.id, e.recordId]));
  for (const e of data.entries) {
    if (
      !records.has(e.recordId) ||
      new Set(e.attachments.map((a) => a.id)).size !== e.attachments.length
    )
      throw new Error('Ungültige Zuordnung im Backup.');
    for (const a of e.attachments)
      if ((a.kind === 'pdf') !== a.file.endsWith('.pdf'))
        throw new Error('Ungültiger Anhangstyp.');
  }
  for (const r of data.reports) {
    if (
      !records.has(r.recordId) ||
      (r.entryId && entries.get(r.entryId) !== r.recordId) ||
      !r.file.endsWith('.pdf')
    )
      throw new Error('Ungültiges Protokoll im Backup.');
  }
  return data;
}
