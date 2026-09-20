import { SerialQueue, type Repository, type SqlConnection } from '../ports';
import {
  type HouseEntry,
  type HouseRecord,
  type SavedReport,
  type Snapshot,
  type EntryDraft,
  PAGE_SIZE,
  recordSchema,
  entrySchema,
  reportSchema,
  validateSnapshot,
} from '../domain/models';

export const schemaV1 = `
CREATE TABLE records (id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE entries (id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, occurred_at TEXT NOT NULL, search TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE reports (id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE drafts (id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE activities (name TEXT PRIMARY KEY);
PRAGMA user_version=1;`;
export async function migrate(db: SqlConnection): Promise<void> {
  await db.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;',
  );
  const version =
    (await db.all<{ user_version: number }>('PRAGMA user_version'))[0]
      ?.user_version ?? 0;
  if (version > 2)
    throw new Error('Die Datenbank stammt aus einer neueren Hausakte-Version.');
  await db.exec('BEGIN IMMEDIATE');
  try {
    if (version < 1) await db.exec(schemaV1);
    if (version < 2)
      await db.exec(
        'CREATE INDEX entries_history ON entries(record_id, occurred_at DESC, id DESC); CREATE INDEX reports_record ON reports(record_id); PRAGMA user_version=2;',
      );
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
export class SqlRepository implements Repository {
  private queue = new SerialQueue();
  constructor(private db: SqlConnection) {}
  private async bodies<T>(
    table: string,
    where = '',
    params: (string | number)[] = [],
  ): Promise<T[]> {
    return (
      await this.db.all<{ body: string }>(
        `SELECT body FROM ${table} ${where}`,
        ...params,
      )
    ).map((r) => JSON.parse(r.body) as T);
  }
  private write<T>(work: () => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      await this.db.exec('BEGIN IMMEDIATE');
      try {
        const value = await work();
        await this.db.exec('COMMIT');
        return value;
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    });
  }
  records() {
    return this.queue.run(() =>
      this.bodies<HouseRecord>(
        'records',
        "ORDER BY json_extract(body, '$.name') COLLATE NOCASE",
      ),
    );
  }
  entries(recordId: string, search = '', offset = 0, limit = PAGE_SIZE) {
    return this.queue.run(async () => {
      const pattern = `%${search.toLocaleLowerCase('de-DE').replace(/[\\%_]/g, '\\$&')}%`;
      const clause = "WHERE record_id=? AND search LIKE ? ESCAPE '\\'";
      const rows = await this.bodies<HouseEntry>(
        'entries',
        `${clause} ORDER BY occurred_at DESC,id DESC LIMIT ? OFFSET ?`,
        [recordId, pattern, limit, offset],
      );
      const total =
        (
          await this.db.all<{ n: number }>(
            `SELECT count(*) n FROM entries ${clause}`,
            recordId,
            pattern,
          )
        )[0]?.n ?? 0;
      return { rows, total };
    });
  }
  reports(recordId: string) {
    return this.queue.run(() =>
      this.bodies<SavedReport>(
        'reports',
        "WHERE record_id=? ORDER BY json_extract(body,'$.createdAt') DESC",
        [recordId],
      ),
    );
  }
  previousMeasurement(entry: HouseEntry) {
    return this.queue.run(async () => {
      if (!entry.measurement) return null;
      const rows = await this.bodies<HouseEntry>(
        'entries',
        "WHERE record_id=? AND (occurred_at<? OR (occurred_at=? AND id<?)) AND json_extract(body,'$.measurement.unit')=? ORDER BY occurred_at DESC,id DESC LIMIT 1",
        [
          entry.recordId,
          entry.occurredAt,
          entry.occurredAt,
          entry.id,
          entry.measurement.unit,
        ],
      );
      return rows[0] ?? null;
    });
  }
  drafts() {
    return this.queue.run(() => this.bodies<EntryDraft>('drafts'));
  }
  snapshot(): Promise<Snapshot> {
    return this.queue.run(async () =>
      validateSnapshot({
        records: await this.bodies('records'),
        entries: await this.bodies('entries'),
        reports: await this.bodies('reports'),
        activities: (
          await this.db.all<{ name: string }>(
            'SELECT name FROM activities ORDER BY name',
          )
        ).map((a) => a.name),
      }),
    );
  }
  saveDraft(draft: EntryDraft) {
    return this.write(() =>
      this.db.run(
        'INSERT INTO drafts VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
        draft.id,
        draft.recordId,
        JSON.stringify(draft),
      ),
    );
  }
  removeDraft(id: string) {
    return this.write(() => this.db.run('DELETE FROM drafts WHERE id=?', id));
  }
  private putRecord(record: HouseRecord) {
    return this.db.run(
      'INSERT INTO records VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
      record.id,
      JSON.stringify(recordSchema.parse(record)),
    );
  }
  saveRecord(record: HouseRecord) {
    return this.write(() => this.putRecord(record));
  }
  private async putEntry(entry: HouseEntry) {
    const e = entrySchema.parse(entry);
    const existing = (
      await this.db.all<{ record_id: string }>(
        'SELECT record_id FROM entries WHERE id=?',
        e.id,
      )
    )[0];
    if (existing && existing.record_id !== e.recordId)
      throw new Error(
        'Ein Eintrag kann nicht in eine andere Akte verschoben werden.',
      );
    await this.db.run(
      'INSERT INTO entries VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,search=excluded.search,body=excluded.body',
      e.id,
      e.recordId,
      e.occurredAt,
      `${e.activity} ${e.provider} ${e.note} ${e.attachments.map((a) => a.name).join(' ')}`.toLocaleLowerCase(
        'de-DE',
      ),
      JSON.stringify(e),
    );
    await this.db.run(
      'INSERT OR IGNORE INTO activities VALUES (?)',
      e.activity,
    );
  }
  saveEntry(entry: HouseEntry, draftId: string) {
    return this.write(async () => {
      await this.putEntry(entry);
      await this.db.run('DELETE FROM drafts WHERE id=?', draftId);
    });
  }
  private putReport(report: SavedReport) {
    return this.db.run(
      'INSERT INTO reports VALUES (?,?,?,?)',
      report.id,
      report.recordId,
      report.entryId,
      JSON.stringify(reportSchema.parse(report)),
    );
  }
  saveReport(report: SavedReport) {
    return this.write(() => this.putReport(report));
  }
  deleteRecord(id: string) {
    return this.write(() => this.db.run('DELETE FROM records WHERE id=?', id));
  }
  deleteEntry(id: string) {
    return this.write(async () => {
      await this.db.run(
        "DELETE FROM drafts WHERE json_extract(body,'$.entryId')=?",
        id,
      );
      await this.db.run('DELETE FROM entries WHERE id=?', id);
    });
  }
  deleteReport(id: string) {
    return this.write(() => this.db.run('DELETE FROM reports WHERE id=?', id));
  }
  replace(input: Snapshot) {
    const data = validateSnapshot(input);
    return this.write(async () => {
      const drafts = await this.bodies<EntryDraft>('drafts');
      await this.db.exec(
        'DELETE FROM drafts; DELETE FROM reports; DELETE FROM entries; DELETE FROM records; DELETE FROM activities;',
      );
      for (const r of data.records) await this.putRecord(r);
      for (const e of data.entries) await this.putEntry(e);
      for (const r of data.reports) await this.putReport(r);
      for (const a of data.activities)
        await this.db.run('INSERT OR IGNORE INTO activities VALUES (?)', a);
      for (const draft of drafts)
        if (data.records.some((r) => r.id === draft.recordId))
          await this.db.run(
            'INSERT INTO drafts VALUES (?,?,?)',
            draft.id,
            draft.recordId,
            JSON.stringify(draft),
          );
    });
  }
}
