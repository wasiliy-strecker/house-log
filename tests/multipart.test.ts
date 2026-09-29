import { afterEach, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { fixture, record } from './support';
import { validateSnapshot } from '../src/core/domain/models';
import { PdfViewerService } from '../src/core/pdf/viewer-service';
import type { HouseNative } from '../src/core/native/house-native';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  const r = record();
  await f.house.saveRecord(r);
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 101; i++) pdf.addPage([595 + i, 842]);
  const draft = await f.house.draft(r.id);
  draft.form.activity = 'Prüfung';
  draft.form.attachments = [
    await f.house.importAttachment(
      await pdf.save(),
      'pdf',
      'Import.pdf',
      'imported',
    ),
  ];
  await f.house.saveEntry(draft);
  return { f, r };
}
it('keeps part order and original page formats across a backup and opens the complete group from any part', async () => {
  const { f, r } = await setup();
  await f.house.createReport(r.id, null, true);
  const data = await f.repo.snapshot();
  const reports = data.reports.sort((a, b) => a.partIndex! - b.partIndex!);
  expect(reports.map((part) => part.partIndex)).toEqual([1, 2]);
  const dimensions: number[] = [];
  for (const report of reports) {
    const pdf = await PDFDocument.load(await f.vault.read(report.file));
    expect(pdf.getPageCount()).toBeLessThanOrEqual(100);
    dimensions.push(
      ...pdf
        .getPages()
        .slice(1)
        .map((page) => page.getWidth()),
    );
  }
  expect(dimensions.slice(-101)).toEqual(
    Array.from({ length: 101 }, (_, i) => 595 + i),
  );
  const native = {
    openPdfPreview: async () => ({ session: 'test', pages: [] }),
  } as unknown as HouseNative;
  const viewer = new PdfViewerService(f.house, native);
  expect(
    (await viewer.open(reports[1]!.id)).parts.map((part) => part.id),
  ).toEqual(reports.map((part) => part.id));
  const backup = await f.backup.codec.decode(
    await f.backup.create('Synthetic password'),
    'Synthetic password',
  );
  expect(backup.data.entries[0]!.attachments[0]!.source).toBe('imported');
  await f.backup.restore(backup);
  expect((await f.repo.snapshot()).reports).toHaveLength(2);
  const invalid = structuredClone(data);
  invalid.reports[1]!.partIndex = invalid.reports[0]!.partIndex;
  expect(() => validateSnapshot(invalid)).toThrow(/Protokollteile/);
  await f.house.delete('report', reports[0]!.id);
  expect((await viewer.open(reports[1]!.id)).parts).toHaveLength(1);
  expect((await f.repo.snapshot()).entries[0]!.attachments).toEqual(
    data.entries[0]!.attachments,
  );
});
it('rolls back all parts and their files when the second report cannot be saved', async () => {
  const { f, r } = await setup();
  const before = await f.repo.snapshot(),
    files = await f.vault.list();
  f.raw.exec(
    "CREATE TRIGGER fail_second_part BEFORE INSERT ON reports WHEN json_extract(NEW.body,'$.partIndex')=2 BEGIN SELECT RAISE(ABORT,'synthetic part failure'); END;",
  );
  await expect(f.house.createReport(r.id, null, true)).rejects.toThrow(
    /synthetic part failure/,
  );
  expect(await f.repo.snapshot()).toEqual(before);
  expect(await f.vault.list()).toEqual(files);
});
