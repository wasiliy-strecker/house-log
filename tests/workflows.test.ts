import { afterEach, describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { digest } from '../src/core/files/integrity';
import {
  parseCost,
  costInput,
  entrySchema,
  measurementDelta,
  snapshotFiles,
} from '../src/core/domain/models';
import {
  SqlRepository,
  migrate,
  schemaV1,
} from '../src/core/database/repository';
import { inspectPdf } from '../src/core/pdf/pdf-service';
import { connect, fixture, record, sourcePdf, photo, env } from './support';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
async function entryFixture(f: Awaited<ReturnType<typeof fixture>>) {
  const r = record();
  await f.house.saveRecord(r);
  const draft = await f.house.draft(r.id);
  draft.form.activity = 'Wartung';
  draft.form.cost = '1.234,56';
  const original = await sourcePdf();
  draft.form.attachments = [
    await f.house.importAttachment(await photo(), 'photo', 'Heizung.jpg'),
    await f.house.importAttachment(original, 'pdf', 'Prüfbericht.pdf'),
  ];
  await f.house.persistDraft(draft);
  const { entry } = await f.house.saveEntry(draft);
  return { r, draft, entry, original };
}
describe('House domain', () => {
  it.each([
    ['', null],
    ['0', 0],
    ['0,01', 1],
    ['1.234,56', 123456],
    ['12,5', 1250],
    ['90071992547409,91', 9007199254740991],
  ])('parses exact cents %s', (input, expected) =>
    expect(parseCost(input)).toBe(expected),
  );
  it.each(['-1', '1.23', '1,234', 'NaN', '1e5', '2 000', '9007199254740992'])(
    'rejects invalid money %s',
    (value) => expect(() => parseCost(value)).toThrow(),
  );
  it('round trips a cent amount without float formatting', () =>
    expect(parseCost(costInput(123456))).toBe(123456));
  it('requires names and activity without fake measurements', async () => {
    const f = await setup();
    await expect(f.house.saveRecord(record({ name: '  ' }))).rejects.toThrow();
    const r = record();
    await f.house.saveRecord(r);
    const draft = await f.house.draft(r.id);
    await expect(f.house.saveEntry(draft)).rejects.toThrow();
    draft.form.activity = 'Fenster einstellen';
    const { entry } = await f.house.saveEntry(draft);
    expect(entry.measurement).toBeNull();
    expect(entry.costCents).toBeNull();
    expect((await f.repo.snapshot()).activities).toContain(
      'Fenster einstellen',
    );
    expect(measurementDelta(entry, entry)).toBeNull();
    expect(
      measurementDelta(
        { ...entry, measurement: { value: 10, unit: 'h' } },
        { ...entry, measurement: { value: 4, unit: 'kWh' } },
      ),
    ).toBeNull();
    expect(
      measurementDelta(
        { ...entry, measurement: { value: 10, unit: 'h' } },
        { ...entry, measurement: { value: 4, unit: 'h' } },
      ),
    ).toBe(6);
  });
});
describe('Real SQLite and files', () => {
  it('persists after reopening and migrates schema 1 with data', async () => {
    const f = await setup();
    const { entry } = await entryFixture(f);
    const reopened = connect(f.path);
    await migrate(reopened.db);
    expect(
      (await new SqlRepository(reopened.db).snapshot()).entries[0],
    ).toEqual(entry);
    reopened.raw.close();
    const older = connect(':memory:');
    await older.db.exec(schemaV1);
    const r = record();
    await new SqlRepository(older.db).saveRecord(r);
    await migrate(older.db);
    expect(await new SqlRepository(older.db).records()).toEqual([r]);
    expect(older.raw.prepare('PRAGMA user_version').get()?.user_version).toBe(
      2,
    );
    older.raw.close();
  });
  it('paginates ten newest entries and escapes search wildcards', async () => {
    const f = await setup();
    const r = record();
    await f.house.saveRecord(r);
    for (let i = 0; i < 24; i++) {
      const d = await f.house.draft(r.id);
      d.form.activity = i === 0 ? '100% Prüfung' : `Wartung ${i}`;
      d.form.occurredAt = new Date(1700000000000 + i * 1000).toISOString();
      await f.house.saveEntry(d);
    }
    const page = await f.repo.entries(r.id);
    expect(page.rows).toHaveLength(10);
    expect(page.rows[0]?.activity).toBe('Wartung 23');
    expect(page.total).toBe(24);
    expect((await f.repo.entries(r.id, '', 20)).rows).toHaveLength(4);
    expect((await f.repo.entries(r.id, '%')).total).toBe(1);
  });
  it('restores all raw draft inputs and attachments after a connection is lost', async () => {
    const f = await setup();
    const { r, entry } = await entryFixture(f);
    const d = await f.house.draft(r.id, entry);
    d.form.cost = 'still typing';
    d.form.note = 'Entwurf vor Scanner';
    d.external = 'scanner';
    await f.house.persistDraft(d);
    const reopened = connect(f.path);
    expect((await new SqlRepository(reopened.db).drafts())[0]).toMatchObject({
      external: 'scanner',
      form: {
        cost: 'still typing',
        note: 'Entwurf vor Scanner',
        attachments: entry.attachments,
      },
    });
    reopened.raw.close();
  });
  it('replaces, sorts and cancels without deleting saved files', async () => {
    const f = await setup();
    const { r, entry } = await entryFixture(f);
    const before = await f.vault.read(entry.attachments[0]!.file);
    const d = await f.house.draft(r.id, entry);
    const newPdf = await f.house.importAttachment(
      await sourcePdf(['REPLACEMENT']),
      'pdf',
      'Neu.pdf',
    );
    d.form.attachments = [newPdf, entry.attachments[0]!];
    await f.house.persistDraft(d);
    await f.house.discard(d);
    expect(await f.vault.read(entry.attachments[0]!.file)).toEqual(before);
    expect((await f.repo.snapshot()).entries[0]).toEqual(entry);
    await expect(f.vault.read(newPdf.file)).rejects.toThrow();
    const edit = await f.house.draft(r.id, entry);
    edit.form.attachments = [...entry.attachments].reverse();
    await f.house.saveEntry(edit);
    expect(
      (await f.repo.snapshot()).entries[0]?.attachments.map((a) => a.id),
    ).toEqual([...entry.attachments].reverse().map((a) => a.id));
    expect((await f.repo.snapshot()).entries).toHaveLength(1);
  });
  it('rolls back failed deletion with reports and files intact', async () => {
    const f = await setup();
    const { entry } = await entryFixture(f);
    const report = await f.house.createReport(entry.recordId, entry.id, true);
    const before = await f.repo.snapshot();
    const files = await Promise.all(
      snapshotFiles(before).map((k) => f.vault.read(k)),
    );
    f.raw.exec(
      "CREATE TRIGGER fail_delete BEFORE DELETE ON entries BEGIN SELECT RAISE(ABORT, 'synthetic'); END;",
    );
    await expect(f.house.delete('entry', entry.id)).rejects.toThrow();
    expect(await f.repo.snapshot()).toEqual(before);
    expect(
      await Promise.all(snapshotFiles(before).map((k) => f.vault.read(k))),
    ).toEqual(files);
    expect((await f.repo.reports(entry.recordId))[0]?.id).toBe(report.id);
  });
  it('keeps old attachments on failed save and keeps drafts for retry', async () => {
    const f = await setup();
    const { r, entry } = await entryFixture(f);
    const d = await f.house.draft(r.id, entry);
    d.form.attachments = [];
    await f.house.persistDraft(d);
    f.raw.exec(
      "CREATE TRIGGER fail_update BEFORE UPDATE ON entries BEGIN SELECT RAISE(ABORT,'synthetic'); END;",
    );
    await expect(f.house.saveEntry(d)).rejects.toThrow();
    expect((await f.repo.snapshot()).entries[0]).toEqual(entry);
    for (const a of entry.attachments)
      expect(digest(await f.vault.read(a.file))).toBe(a.sha256);
    expect(await f.repo.drafts()).toHaveLength(1);
  });
  it('preserves shared files and total reports on entry deletion, removes record reports', async () => {
    const f = await setup();
    const { r, entry } = await entryFixture(f);
    const second = { ...entry, id: env.id() };
    await f.repo.saveEntry(second, env.id());
    await f.house.createReport(r.id, entry.id, false);
    const total = await f.house.createReport(r.id, null, true);
    await f.house.delete('entry', entry.id);
    expect(await f.repo.reports(r.id)).toEqual([total]);
    for (const a of entry.attachments)
      expect(digest(await f.vault.read(a.file))).toBe(a.sha256);
    await f.house.delete('record', r.id);
    expect(await f.repo.records()).toEqual([]);
    expect(await f.vault.list()).toEqual([]);
  });
  it('reports reminder errors after committing successfully', async () => {
    const f = await fixture({
      async sync() {
        throw new Error('denied');
      },
    });
    fixtures.push(f);
    const r = record();
    await f.house.saveRecord(r);
    const d = await f.house.draft(r.id);
    d.form.activity = 'Prüfung';
    const result = await f.house.saveEntry(d);
    expect(result.warnings).toHaveLength(1);
    expect((await f.repo.snapshot()).entries[0]?.id).toBe(result.entry.id);
    expect(await f.repo.drafts()).toEqual([]);
  });
});
describe('Real PDF processing', () => {
  it('preserves original pages, text, landscape and immutable older reports through an edit', async () => {
    const f = await setup();
    const { entry, r, original } = await entryFixture(f);
    const report = await f.house.createReport(r.id, null, true);
    const bytes = await f.vault.read(report.file);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(6);
    expect(pdf.getPage(4).getWidth()).toBe(842);
    expect(pdf.getPage(4).getHeight()).toBe(595);
    const path = join(f.root, 'audit.pdf');
    await writeFile(path, bytes);
    const text = execFileSync('pdftotext', ['-layout', path, '-'], {
      encoding: 'utf8',
    });
    expect(text).toContain('SYNTHETIC_PAGE_ONE');
    expect(text.indexOf('SYNTHETIC_PAGE_ONE')).toBeLessThan(
      text.indexOf('SYNTHETIC_PAGE_TWO'),
    );
    expect(text).toContain('1.234,56');
    expect(await f.vault.read(entry.attachments[1]!.file)).toEqual(original);
    const draft = await f.house.draft(r.id, entry);
    draft.form.note = 'Aktueller Stand';
    draft.form.attachments = [];
    await f.house.saveEntry(draft);
    expect(await f.vault.read(report.file)).toEqual(bytes);
  });
  it('orders entries newest first and attaches PDFs directly to their entry', async () => {
    const f = await setup();
    const { entry, r } = await entryFixture(f);
    const d = await f.house.draft(r.id);
    d.form.activity = 'NEUER EINTRAG';
    d.form.occurredAt = '2099-01-01T10:00:00.000Z';
    d.form.attachments = [
      await f.house.importAttachment(
        await sourcePdf(['NEUER_ANHANG']),
        'pdf',
        'Neu.pdf',
      ),
    ];
    await f.house.saveEntry(d);
    const report = await f.house.createReport(r.id, null, true);
    const path = join(f.root, 'ordered.pdf');
    await writeFile(path, await f.vault.read(report.file));
    const text = execFileSync('pdftotext', [path, '-'], { encoding: 'utf8' });
    expect(text.indexOf('NEUER_ANHANG')).toBeLessThan(
      text.indexOf(entry.activity),
    );
    expect(text.indexOf(entry.activity)).toBeLessThan(
      text.indexOf('SYNTHETIC_PAGE_ONE'),
    );
  });
  it('rejects empty, corrupted, truncated and protected PDF files', async () => {
    await expect(inspectPdf(new Uint8Array())).rejects.toThrow();
    await expect(
      inspectPdf(new TextEncoder().encode('%PDF-1.7\nbroken\n%%EOF')),
    ).rejects.toThrow();
    const valid = await sourcePdf();
    await expect(inspectPdf(valid.slice(0, -100))).rejects.toThrow();
    const protectedBytes = new Uint8Array(
      await readFile(new URL('../assets/protected.pdf', import.meta.url)),
    );
    await expect(inspectPdf(protectedBytes)).rejects.toThrow(/passwort/i);
    expect((await inspectPdf(valid)).getPageCount()).toBe(2);
  });
  it('fails explicitly on changed or missing attachments and wrong page counts', async () => {
    const f = await setup();
    const { entry, r } = await entryFixture(f);
    const pdf = entry.attachments[1]!;
    await writeFile(f.vault.uri(pdf.file), await sourcePdf(['CHANGED']));
    await expect(f.house.createReport(r.id, null, true)).rejects.toThrow(
      /verändert/,
    );
    expect(await f.repo.reports(r.id)).toEqual([]);
    await f.vault.remove(pdf.file);
    await expect(f.house.createReport(r.id, null, false)).rejects.toThrow(
      /fehlt/,
    );
    const replacement = await f.house.importAttachment(
      await sourcePdf(),
      'pdf',
      'Ok.pdf',
    );
    replacement.pages = 99;
    await f.repo.saveEntry(
      entrySchema.parse({ ...entry, attachments: [replacement] }),
      env.id(),
    );
    await expect(f.house.createReport(r.id, null, true)).rejects.toThrow(
      /Seitenzahl/,
    );
  });
  it('does not leave a completed file or report when report persistence fails', async () => {
    const f = await setup();
    const { r } = await entryFixture(f);
    const before = (await f.vault.list()).sort();
    f.raw.exec(
      "CREATE TRIGGER fail_report BEFORE INSERT ON reports BEGIN SELECT RAISE(ABORT,'synthetic'); END;",
    );
    await expect(f.house.createReport(r.id, null, true)).rejects.toThrow();
    expect((await f.vault.list()).sort()).toEqual(before);
    expect(await f.repo.reports(r.id)).toEqual([]);
  });
});
