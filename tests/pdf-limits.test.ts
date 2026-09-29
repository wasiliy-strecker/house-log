import { afterEach, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fixture, record, env } from './support';
import { inspectPdf } from '../src/core/pdf/pdf-service';
import { ReportLayout } from '../src/core/pdf/report-layout';
import { digest } from '../src/core/files/integrity';
import { backupManifest, legacyBackup } from './backup-fixtures';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
async function document(pages: number) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) pdf.addPage([595, 842]);
  return pdf.save();
}

it.each([1997, 1998, 2000])(
  'enforces the final history page count for %i source pages without persisting partial reports',
  async (pages) => {
    const f = await fixture();
    fixtures.push(f);
    const r = record();
    await f.house.saveRecord(r);
    const draft = await f.house.draft(r.id);
    draft.form.activity = 'Wartung';
    draft.form.attachments = [
      await f.house.importAttachment(
        await document(pages),
        'pdf',
        'synthetic.pdf',
      ),
    ];
    await f.house.saveEntry(draft);
    const before = await f.repo.snapshot();
    const beforeFiles = await f.vault.list();
    if (pages === 1997) {
      const report = await f.house.createReport(r.id, null, true);
      expect(
        (await inspectPdf(await f.vault.read(report.file))).getPageCount(),
      ).toBe(2000);
      const backup = await f.backup.create('Synthetic PDF password');
      const decoded = await f.backup.codec.decode(
        backup,
        'Synthetic PDF password',
      );
      expect(decoded.data.reports).toHaveLength(1);
    } else {
      await expect(f.house.createReport(r.id, null, true)).rejects.toThrow(
        /2000 Seiten/,
      );
      expect(await f.repo.snapshot()).toEqual(before);
      expect(await f.vault.list()).toEqual(beforeFiles);
    }
  },
);

it('also limits generated layout pages, not just copied attachments', async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 1999; i++) pdf.addPage();
  const layout = new ReportLayout(pdf, { regular: font, bold: font });
  layout.text('Last allowed page');
  expect(pdf.getPageCount()).toBe(2000);
  expect(() => layout.ensure(1000)).toThrow(/2000 Seiten/);
  expect(pdf.getPageCount()).toBe(2000);
});

it('names an oversized legacy report and preserves all local data on export or import failure', async () => {
  const f = await fixture();
  fixtures.push(f);
  const r = record();
  await f.house.saveRecord(r);
  const bytes = await document(2003);
  const file = await f.vault.put(bytes, 'pdf');
  await f.repo.saveReport({
    id: env.id(),
    recordId: r.id,
    entryId: null,
    name: 'Altes Gesamtprotokoll',
    file,
    sha256: digest(bytes),
    createdAt: env.now(),
    full: true,
  });
  const before = await f.repo.snapshot();
  await expect(f.backup.create('Synthetic PDF password')).rejects.toThrow(
    /Protokoll „Altes Gesamtprotokoll“.*2000 Seiten/,
  );
  const files = new Map([[file, bytes]]);
  const legacy = legacyBackup(
    backupManifest(before, files),
    'Synthetic PDF password',
    [...files.values()],
  );
  await expect(
    f.backup.codec.decode(legacy, 'Synthetic PDF password'),
  ).rejects.toThrow(/Protokoll „Altes Gesamtprotokoll“.*2000 Seiten/);
  expect(await f.repo.snapshot()).toEqual(before);
  expect(digest(await f.vault.read(file))).toBe(digest(bytes));
});
