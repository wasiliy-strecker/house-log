import { afterEach, describe, expect, it } from 'vitest';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { snapshotFiles } from '../src/core/domain/models';
import { digest } from '../src/core/files/integrity';
import { fixture, record, sourcePdf, photo, env } from './support';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
const password = 'Hausakte Testpasswort 2026';
async function prepared() {
  const f = await setup();
  const r = record();
  await f.house.saveRecord(r);
  const draft = await f.house.draft(r.id);
  draft.form.activity = 'Wartung';
  draft.form.cost = '345,67';
  draft.form.value = '1250';
  draft.form.unit = 'h';
  draft.form.attachments = [
    await f.house.importAttachment(await photo(), 'photo', 'Foto.jpg'),
    await f.house.importAttachment(
      await sourcePdf(['ALTER_ANHANG']),
      'pdf',
      'Alt.pdf',
    ),
    await f.house.importAttachment(
      await sourcePdf(['ZWEITER_ANHANG']),
      'pdf',
      'Zweiter.pdf',
    ),
  ];
  await f.house.persistDraft(draft);
  const first = await f.house.saveEntry(draft);
  const edit = await f.house.draft(r.id, first.entry);
  edit.form.cost = '456,78';
  edit.form.note = 'Nach Wartung bearbeitet';
  const replacement = await f.house.importAttachment(
    await sourcePdf(['ERSATZ']),
    'pdf',
    'Ersatz.pdf',
  );
  edit.form.attachments = [
    first.entry.attachments[0]!,
    first.entry.attachments[2]!,
    replacement,
  ];
  await f.house.persistDraft(edit);
  const { entry } = await f.house.saveEntry(edit);
  const report = await f.house.createReport(r.id, null, true);
  const bytes = await f.backup.create(password);
  return { f, r, entry, report, bytes };
}
describe('Real AES-GCM, PDFs, files and SQLite backup workflow', () => {
  it('round trips the complete create → edit/sort → report → backup → restore flow', async () => {
    const { f, bytes } = await prepared();
    const target = await setup();
    const decoded = await target.backup.codec.decode(bytes, password);
    await target.backup.restore(decoded);
    const before = await f.repo.snapshot();
    const after = await target.repo.snapshot();
    expect(after.records).toEqual(before.records);
    expect(after.activities).toEqual(before.activities);
    expect(after.entries[0]?.costCents).toBe(45678);
    expect(after.entries[0]?.attachments.map((a) => a.name)).toEqual([
      'Foto.jpg',
      'Zweiter.pdf',
      'Ersatz.pdf',
    ]);
    expect(after.reports).toHaveLength(1);
    const normalize = (data: typeof before) =>
      JSON.parse(
        JSON.stringify(data, (key, value: unknown) =>
          key === 'file' ? undefined : value,
        ),
      );
    expect(normalize(after)).toEqual(normalize(before));
    for (const item of [
      ...after.entries.flatMap((e) => e.attachments),
      ...after.reports,
    ])
      expect(digest(await target.vault.read(item.file))).toBe(item.sha256);
    expect(await target.repo.entries(after.records[0]!.id)).toMatchObject({
      total: 1,
    });
  });
  it('decrypts with the independent Node/OpenSSL AES-256-GCM implementation', async () => {
    const { bytes } = await prepared();
    const key = pbkdf2Sync(password, bytes.slice(12, 28), 600000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.slice(28, 40));
    decipher.setAAD(bytes.slice(0, 40));
    decipher.setAuthTag(bytes.slice(-16));
    const plain = Buffer.concat([
      decipher.update(bytes.slice(40, -16)),
      decipher.final(),
    ]);
    expect(plain.toString('utf8', 4, 4 + plain.readUInt32BE(0))).toContain(
      'hausakte_backup',
    );
    expect(Buffer.from(bytes).includes(Buffer.from('Haus Musterstraße'))).toBe(
      false,
    );
  });
  it('rejects wrong passwords, tampering and foreign files without changing local state', async () => {
    const { f, bytes } = await prepared();
    const before = await f.repo.snapshot();
    await expect(
      f.backup.codec.decode(bytes, 'Falsches Passwort'),
    ).rejects.toThrow(/Passwort/);
    const changed = new Uint8Array(bytes);
    changed[changed.length - 20]! ^= 1;
    await expect(f.backup.codec.decode(changed, password)).rejects.toThrow(
      /beschädigt/,
    );
    const header = new Uint8Array(bytes);
    header[11]! ^= 1;
    await expect(f.backup.codec.decode(header, password)).rejects.toThrow(
      /Version/,
    );
    await expect(
      f.backup.codec.decode(
        new TextEncoder().encode('fahrzeugakte_backup'),
        password,
      ),
    ).rejects.toThrow(/Hausakte/);
    expect(await f.repo.snapshot()).toEqual(before);
  });
  it('rejects authenticated payloads with missing attachments before takeover', async () => {
    const { f } = await prepared();
    const data = await f.repo.snapshot();
    const malformed = await f.backup.codec.encode(data, new Map(), password);
    await expect(f.backup.codec.decode(malformed, password)).rejects.toThrow(
      /unvollständig/,
    );
  });
  it('rolls back a mid-restore SQL failure and removes only staged files', async () => {
    const { bytes } = await prepared();
    const target = await setup();
    const local = record({ name: 'Bestehende Akte' });
    await target.house.saveRecord(local);
    const before = await target.repo.snapshot();
    const decoded = await target.backup.codec.decode(bytes, password);
    target.raw.exec(
      "CREATE TRIGGER fail_entry BEFORE INSERT ON entries BEGIN SELECT RAISE(ABORT,'synthetic'); END;",
    );
    await expect(target.backup.restore(decoded)).rejects.toThrow();
    expect(await target.repo.snapshot()).toEqual(before);
    expect(await target.vault.list()).toEqual([]);
  });
  it('preserves newer data and drafts while repairing missing matching attachments', async () => {
    const { f, r, entry, report, bytes } = await prepared();
    const newer = {
      ...entry,
      note: 'Neuerer lokaler Inhalt',
      updatedAt: '2099-01-01T00:00:00.000Z',
    };
    await f.repo.saveEntry(newer, env.id());
    const draft = await f.house.draft(r.id, newer);
    draft.form.note = 'Nicht gespeicherter Entwurf';
    await f.house.persistDraft(draft);
    await f.vault.remove(entry.attachments[0]!.file);
    await writeFile(f.vault.uri(report.file), new Uint8Array([1, 2, 3]));
    const decoded = await f.backup.codec.decode(bytes, password);
    await f.backup.restore(decoded);
    const after = await f.repo.snapshot();
    expect(after.entries[0]?.note).toBe('Neuerer lokaler Inhalt');
    expect((await f.repo.drafts())[0]?.form.note).toBe(
      'Nicht gespeicherter Entwurf',
    );
    const repairedPhoto = after.entries[0]!.attachments[0]!;
    expect(repairedPhoto.file).not.toBe(entry.attachments[0]!.file);
    expect(digest(await f.vault.read(repairedPhoto.file))).toBe(
      repairedPhoto.sha256,
    );
    expect(digest(await f.vault.read(after.reports[0]!.file))).toBe(
      report.sha256,
    );
    const stable = JSON.stringify(after);
    await f.backup.restore(decoded);
    expect(JSON.stringify(await f.repo.snapshot())).toBe(stable);
  });
  it('fails backup explicitly if a referenced file is missing', async () => {
    const { f } = await prepared();
    const files = snapshotFiles(await f.repo.snapshot());
    await f.vault.remove(files[0]!);
    await expect(f.backup.create(password)).rejects.toThrow(/fehlt/);
  });
});
