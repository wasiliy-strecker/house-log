import { afterEach, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { fixture, record, sourcePdf } from './support';
import {
  capturePhase,
  entrySummary,
  visibleRecords,
} from '../src/features/records/presentation-model';
import { reorderItems } from '../src/core/ui/reorder';
import { PdfViewerService } from '../src/core/pdf/viewer-service';
import type { HouseNative } from '../src/core/native/house-native';
const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
it('opens legacy and manual drafts at the right capture step after reopening', async () => {
  const f = await setup(),
    r = record();
  await f.house.saveRecord(r);
  const d = await f.house.draft(r.id);
  expect(capturePhase(d)).toBe('choose');
  d.captureStage = 'form';
  d.captureSource = 'manual';
  await f.house.persistDraft(d);
  expect(capturePhase((await f.repo.drafts())[0]!)).toBe('form');
  delete d.captureStage;
  d.form.note = 'recovered legacy input';
  expect(capturePhase(d)).toBe('form');
  expect(entrySummary(null)).toBe('Noch kein Eintrag');
});
it('uses newest activity but most recent edit for overview sorting with real SQLite', async () => {
  const f = await setup(),
    a = record({ name: 'Heizung', category: 'Heizung' }),
    b = record({ name: 'Dach' });
  await f.house.saveRecord(a);
  await f.house.saveRecord(b);
  const old = await f.house.draft(a.id);
  old.form.activity = 'Prüfung';
  old.form.occurredAt = '2024-01-01T12:00:00.000Z';
  const { entry } = await f.house.saveEntry(old);
  const recent = await f.house.draft(a.id);
  recent.form.activity = 'Fenster einstellen';
  recent.form.occurredAt = '2025-01-01T12:00:00.000Z';
  await f.house.saveEntry(recent);
  await f.repo.saveEntry(
    { ...entry, updatedAt: '2099-01-01T12:00:00.000Z' },
    old.id,
  );
  const items = await f.repo.dashboard();
  expect(items[0]?.record.id).toBe(a.id);
  expect(items[0]?.latest?.activity).toBe('Fenster einstellen');
  expect(entrySummary(items[0]!.latest)).toBe('Fenster einstellen');
  expect(
    visibleRecords(items, 'FENSTER', 'name').map((i) => i.record.id),
  ).toEqual([a.id]);
  expect(visibleRecords(items, '', 'name').map((i) => i.record.name)).toEqual([
    'Dach',
    'Heizung',
  ]);
  expect((await f.repo.entry(entry.id))?.activity).toBe('Prüfung');
  expect(await f.repo.entry('missing')).toBeNull();
});
it('offers complete reports when attachments are beyond the ten-entry preview', async () => {
  const f = await setup(),
    r = record();
  await f.house.saveRecord(r);
  for (let i = 0; i < 12; i++) {
    const d = await f.house.draft(r.id);
    d.form.activity = 'Prüfung';
    d.form.occurredAt = new Date(1700000000000 + i * 1000).toISOString();
    if (i === 0)
      d.form.attachments = [
        await f.house.importAttachment(await sourcePdf(), 'pdf', 'Alt.pdf'),
      ];
    await f.house.saveEntry(d);
  }
  const page = await f.repo.entries(r.id);
  expect(page.rows).toHaveLength(10);
  expect(page.rows.every((e) => !e.attachments.length)).toBe(true);
  expect(page.hasAttachments).toBe(true);
});
it('drag and accessible move operations preserve identity and exact order', () => {
  const original = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  expect(reorderItems(original, 0, 2).map((v) => v.id)).toEqual([
    'two',
    'three',
    'one',
  ]);
  expect(reorderItems(original, 2, 0).map((v) => v.id)).toEqual([
    'three',
    'one',
    'two',
  ]);
  expect(original.map((v) => v.id)).toEqual(['one', 'two', 'three']);
  expect(reorderItems(original, -1, 9)).toEqual(original);
});
it('verifies real PDF bytes before draft preview, saved preview and printing', async () => {
  const f = await setup(),
    r = record();
  await f.house.saveRecord(r);
  const d = await f.house.draft(r.id);
  d.form.activity = 'Wartung';
  const a = await f.house.importAttachment(
    await sourcePdf(),
    'pdf',
    'Prüfung.pdf',
  );
  d.form.attachments = [a];
  await f.house.persistDraft(d);
  const calls: string[] = [];
  const native = {
    async openPdfPreview(uri: string) {
      calls.push(uri);
      return { session: 'test-session', pages: [{ width: 842, height: 595 }] };
    },
    async printPdf() {
      calls.push('print');
    },
    async closePdfPreview() {},
  } as unknown as HouseNative;
  const service = new PdfViewerService(f.house, native);
  const opened = await service.open(a.id);
  expect(opened.kind).toBe('attachment');
  await f.house.saveEntry(d);
  const report = await f.house.createReport(r.id, null, true);
  expect((await service.open(report.id)).kind).toBe('report');
  await service.print(opened);
  expect(calls).toContain('print');
  await writeFile(f.vault.uri(a.file), await sourcePdf(['CHANGED']));
  const before = calls.length;
  await expect(service.open(a.id)).rejects.toThrow(/verändert/);
  await expect(service.print(opened)).rejects.toThrow(/verändert/);
  expect(calls).toHaveLength(before);
  await expect(service.open('missing')).rejects.toThrow(/nicht mehr/);
});
