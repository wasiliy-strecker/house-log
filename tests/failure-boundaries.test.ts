import { afterEach, expect, it } from 'vitest';
import { fixture, record, sourcePdf, env } from './support';
import { measurementDelta } from '../src/core/domain/models';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});

it('finds the previous matching unit beyond the visible page and search filter', async () => {
  const f = await setup();
  const r = record();
  await f.house.saveRecord(r);
  for (let i = 0; i < 15; i++) {
    const d = await f.house.draft(r.id);
    d.form.activity = i === 14 ? 'Ziel' : 'Wartung';
    d.form.occurredAt = new Date(1700000000000 + i * 1000).toISOString();
    if (i === 0 || i === 14) {
      d.form.value = String(i === 0 ? 10 : 50);
      d.form.unit = 'h';
    }
    if (i === 8) {
      d.form.value = '900';
      d.form.unit = 'kWh';
    }
    await f.house.saveEntry(d);
  }
  const visible = (await f.repo.entries(r.id, 'Ziel')).rows[0]!;
  const previous = await f.repo.previousMeasurement(visible);
  expect(previous?.measurement).toEqual({ value: 10, unit: 'h' });
  expect(measurementDelta(visible, previous!)).toBe(40);
});

it('keeps the old draft and its files if the next draft write fails', async () => {
  const f = await setup();
  const r = record();
  await f.house.saveRecord(r);
  const d = await f.house.draft(r.id);
  const attachment = await f.house.importAttachment(
    await sourcePdf(),
    'pdf',
    'Gesichert.pdf',
  );
  d.form.attachments = [attachment];
  await f.house.persistDraft(d);
  f.raw.exec(
    "CREATE TRIGGER fail_draft BEFORE UPDATE ON drafts BEGIN SELECT RAISE(ABORT,'synthetic'); END;",
  );
  await expect(
    f.house.persistDraft({ ...d, form: { ...d.form, attachments: [] } }),
  ).rejects.toThrow();
  expect((await f.repo.drafts())[0]?.form.attachments).toEqual([attachment]);
  expect((await f.vault.read(attachment.file)).length).toBeGreaterThan(0);
});

it('protects files if report deletion fails and reclaims them only after success', async () => {
  const f = await setup();
  const r = record();
  await f.house.saveRecord(r);
  const d = await f.house.draft(r.id);
  d.form.activity = 'Prüfung';
  await f.house.saveEntry(d);
  const report = await f.house.createReport(r.id, null, false);
  const before = await f.vault.read(report.file);
  f.raw.exec(
    "CREATE TRIGGER fail_report_delete BEFORE DELETE ON reports BEGIN SELECT RAISE(ABORT,'synthetic'); END;",
  );
  await expect(f.house.delete('report', report.id)).rejects.toThrow();
  expect(await f.vault.read(report.file)).toEqual(before);
  f.raw.exec('DROP TRIGGER fail_report_delete');
  await f.house.delete('report', report.id);
  await expect(f.vault.read(report.file)).rejects.toThrow();
});

it('keeps existing records and cleans staging after a partial restore file failure', async () => {
  const source = await setup();
  const r = record();
  await source.house.saveRecord(r);
  const d = await source.house.draft(r.id);
  d.form.activity = 'Wartung';
  d.form.attachments = [
    await source.house.importAttachment(
      await sourcePdf(['FIRST']),
      'pdf',
      'Eins.pdf',
    ),
    await source.house.importAttachment(
      await sourcePdf(['SECOND']),
      'pdf',
      'Zwei.pdf',
    ),
  ];
  await source.house.saveEntry(d);
  const bytes = await source.backup.create('Synthetisches Testpasswort');
  const decoded = await source.backup.codec.decode(
    bytes,
    'Synthetisches Testpasswort',
  );
  const target = await setup();
  await target.house.saveRecord(record({ name: 'Vorhanden' }));
  const before = await target.repo.snapshot();
  const original = target.vault.put.bind(target.vault);
  let count = 0;
  target.vault.put = async (...args) => {
    if (++count === 2) throw new Error('Synthetic disk full');
    return original(...args);
  };
  await expect(target.backup.restore(decoded)).rejects.toThrow(
    'Synthetic disk full',
  );
  expect(await target.repo.snapshot()).toEqual(before);
  expect(await target.vault.list()).toEqual([]);
});

it('will not change the record owner of an existing entry', async () => {
  const f = await setup();
  const a = record();
  const b = record();
  await f.house.saveRecord(a);
  await f.house.saveRecord(b);
  const d = await f.house.draft(a.id);
  d.form.activity = 'Wartung';
  const { entry } = await f.house.saveEntry(d);
  await expect(
    f.repo.saveEntry({ ...entry, recordId: b.id }, env.id()),
  ).rejects.toThrow(/andere Akte/);
  expect((await f.repo.snapshot()).entries[0]?.recordId).toBe(a.id);
});
