import { afterEach, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { fixture, record, photo, sourcePdf, env } from './support';
import type { HouseEntry } from '../src/core/domain/models';

const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
async function setup() {
  const f = await fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});

async function readPdf(
  f: Awaited<ReturnType<typeof fixture>>,
  bytes: Uint8Array,
  name: string,
) {
  const path = join(f.root, `${name}.pdf`);
  await writeFile(path, bytes);
  // Optional local artifacts for visual comparison, never committed.
  const directory = process.env.HAUSAKTE_PDF_REVIEW_DIR;
  if (directory) {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${name}.pdf`), bytes);
  }
  return {
    pdf: await PDFDocument.load(bytes),
    text: execFileSync('pdftotext', ['-layout', path, '-'], {
      encoding: 'utf8',
    }),
    boxes: execFileSync('pdftotext', ['-bbox', path, '-'], {
      encoding: 'utf8',
    }),
  };
}

it('uses the family layout in single and history output, with paired photos and original attachments', async () => {
  const f = await setup();
  const r = record({
    location: 'Musterstraße 12\n12345 Musterstadt',
    installedOn: '2020-07-17',
  });
  await f.house.saveRecord(r);
  const draft = await f.house.draft(r.id);
  Object.assign(draft.form, {
    activity: 'Heizung warten',
    provider: 'Musterbetrieb',
    cost: '1.234,56',
    occurredAt: '2026-09-27T08:00:00.000Z',
    value: '1250',
    unit: 'h',
    note: 'Brenner gereinigt und Funktion geprüft.',
  });
  for (let i = 0; i < 3; i++)
    draft.form.attachments.push(
      await f.house.importAttachment(
        await photo(),
        'photo',
        `Foto-${i + 1}.jpg`,
      ),
    );
  draft.form.attachments.push(
    await f.house.importAttachment(await sourcePdf(), 'pdf', 'Prüfbericht.pdf'),
  );
  const { entry } = await f.house.saveEntry(draft);
  for (const kind of ['single', 'history'] as const) {
    for (const full of [false, true]) {
      const report = await f.house.createReport(
        r.id,
        kind === 'single' ? entry.id : null,
        full,
      );
      const { pdf, text, boxes } = await readPdf(
        f,
        await f.vault.read(report.file),
        `${kind}-${full ? 'full' : 'compact'}`,
      );
      expect(text).toContain('Hausprotokoll');
      expect(text).toContain(
        kind === 'single' ? 'Einzelner Eintrag' : 'Aktenverlauf',
      );
      expect(text).toContain('Aktuelle Aktenangaben');
      expect(text).toContain('17.07.2020');
      expect(text).toContain('Musterstraße 12');
      expect(text).toContain('12345 Musterstadt');
      expect(text).toContain('1.234,56 €');
      expect(text).toContain('Notiz');
      expect(text).toContain('Private Dokumentation deiner Hausgeschichte.');
      if (full) {
        expect(text).toMatch(/Foto 1 von 3 +Foto 2 von 3/);
        expect(text).toContain('Foto 3 von 3');
        expect(text.indexOf('Foto 3 von 3')).toBeLessThan(
          text.indexOf('Dokument zu Eintrag 1'),
        );
        expect(text).toContain('SYNTHETIC_PAGE_ONE');
        expect(pdf.getPages().at(-1)!.getSize()).toEqual({
          width: 842,
          height: 595,
        });
        expect(text.split('\f').at(-2)).not.toContain('Protokollseite');
      } else {
        expect(pdf.getPageCount()).toBe(1);
        expect(text).not.toContain('SYNTHETIC_PAGE_ONE');
        expect(text).not.toContain('Foto 1 von');
      }
      // Same 40pt margin and first title position as the Flutter reference.
      expect(boxes).toMatch(
        /xMin="40\.000000" yMin="77\.\d+"[^>]*>Hausprotokoll/,
      );
    }
  }
});

it('paginates long notes, multiline cells and histories without losing text or drawing outside the page', async () => {
  const f = await setup();
  const r = record({
    location: Array.from(
      { length: 40 },
      (_, i) => `Standortzeile ${i + 1}`,
    ).join('\n'),
  });
  const base: HouseEntry = {
    id: env.id(),
    recordId: r.id,
    activity: 'Prüfung',
    occurredAt: env.now(),
    provider: '',
    costCents: null,
    measurement: null,
    attachments: [],
    note:
      Array.from(
        { length: 100 },
        (_, i) => `Notizzeile ${i + 1}: Synthetischer Prüftext.`,
      ).join('\n') + '\nENDE_DER_NOTIZ',
    createdAt: env.now(),
    updatedAt: env.now(),
  };
  const entries = Array.from({ length: 30 }, (_, i) => ({
    ...base,
    id: env.id(),
    occurredAt: new Date(Date.UTC(2026, 8, 27 - i)).toISOString(),
    note: i === 0 ? base.note : '',
  }));
  const { text, boxes, pdf } = await readPdf(
    f,
    await f.pdf.create(r, entries, false, {
      kind: 'history',
      createdAt: env.now(),
    }),
    'long-history',
  );
  expect(pdf.getPageCount()).toBeGreaterThan(3);
  expect(text).toContain('Standortzeile 40');
  expect(text).toContain('ENDE_DER_NOTIZ');
  expect(text.match(/Differenz/g)!.length).toBeGreaterThan(1);
  expect(text).not.toContain('Mess- / Betriebsstand');
  expect(text).not.toContain('0 h');
  for (const word of boxes.matchAll(
    /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/g,
  )) {
    expect(Number(word[1])).toBeGreaterThanOrEqual(39.9);
    expect(Number(word[2])).toBeGreaterThanOrEqual(39.9);
    expect(Number(word[3])).toBeLessThanOrEqual(555.4);
    expect(Number(word[4])).toBeLessThanOrEqual(802);
  }
});

it('only compares measurements of adjacent entries with the same unit', async () => {
  const f = await setup();
  const r = record();
  const entries: HouseEntry[] = [
    { value: 1250, unit: 'h' },
    { value: 1000, unit: 'h' },
    { value: 500, unit: 'kWh' },
    null,
  ].map((measurement, i) => ({
    id: env.id(),
    recordId: r.id,
    activity: `Aktivität ${i + 1}`,
    occurredAt: new Date(Date.UTC(2026, 8, 27 - i)).toISOString(),
    provider: '',
    costCents: null,
    measurement,
    attachments: [],
    note: '',
    createdAt: env.now(),
    updatedAt: env.now(),
  }));
  const { text } = await readPdf(
    f,
    await f.pdf.create(r, entries, false, {
      kind: 'history',
      createdAt: env.now(),
    }),
    'measurement-history',
  );
  expect(text).toContain('250 h Differenz');
  expect(text).toContain('Einheit gewechselt');
  expect(text).not.toContain('500 h Differenz');
});
