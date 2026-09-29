import type {
  HouseRecord,
  HouseEntry,
  SavedReport,
  Snapshot,
  EntryDraft,
} from './domain/models';

export interface SqlConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: (string | number | null)[]): Promise<void>;
  all<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}
export interface Repository {
  snapshot(): Promise<Snapshot>;
  records(): Promise<HouseRecord[]>;
  entry(id: string): Promise<HouseEntry | null>;
  dashboard(): Promise<
    { record: HouseRecord; latest: HouseEntry | null; lastEdited: string }[]
  >;
  entries(
    recordId: string,
    search?: string,
    offset?: number,
    limit?: number,
  ): Promise<{ rows: HouseEntry[]; total: number; hasAttachments: boolean }>;
  previousMeasurement(entry: HouseEntry): Promise<HouseEntry | null>;
  reports(recordId: string): Promise<SavedReport[]>;
  drafts(): Promise<EntryDraft[]>;
  saveDraft(draft: EntryDraft): Promise<void>;
  removeDraft(id: string): Promise<void>;
  saveRecord(record: HouseRecord): Promise<void>;
  saveEntry(entry: HouseEntry, draftId: string): Promise<void>;
  saveReport(report: SavedReport): Promise<void>;
  saveReports(reports: SavedReport[]): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  deleteReport(id: string): Promise<void>;
  replace(data: Snapshot): Promise<void>;
}
export interface FileVault {
  read(key: string): Promise<Uint8Array>;
  put(bytes: Uint8Array, extension: 'jpg' | 'pdf'): Promise<string>;
  remove(key: string): Promise<void>;
  list(): Promise<string[]>;
  uri(key: string): string;
}
export interface ReminderPort {
  sync(records: HouseRecord[], entries: HouseEntry[]): Promise<string[]>;
}
export type Environment = {
  id(): string;
  now(): string;
  random(length: number): Uint8Array;
};

export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(work, work);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
