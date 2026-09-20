import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { money, type HouseEntry, type HouseRecord } from '../domain/models';
import type { FileVault } from '../ports';
import { verifiedFile } from '../files/integrity';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export async function inspectPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (bytes.length < 20 || bytes.length > MAX_FILE_BYTES)
    throw new Error('Die PDF ist leer oder größer als 50 MB.');
  const head = String.fromCharCode(...bytes.slice(0, 8));
  const tail = String.fromCharCode(...bytes.slice(-2048));
  if (!head.startsWith('%PDF-') || !tail.includes('%%EOF'))
    throw new Error('Die PDF ist beschädigt oder unvollständig.');
  try {
    const pdf = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    if (pdf.isEncrypted)
      throw new Error('Passwortgeschützte PDFs werden nicht unterstützt.');
    if (!pdf.getPageCount() || pdf.getPageCount() > 2000)
      throw new Error('Die PDF hat keine Seiten oder mehr als 2000 Seiten.');
    for (const page of pdf.getPages()) {
      if (
        !Number.isFinite(page.getWidth()) ||
        !Number.isFinite(page.getHeight()) ||
        page.getWidth() <= 0 ||
        page.getHeight() <= 0
      )
        throw new Error('Ungültiges Seitenformat.');
    }
    return pdf;
  } catch (error) {
    if (
      String(error).toLowerCase().includes('encrypt') ||
      String(error).includes('Passwort')
    )
      throw new Error(
        'Diese PDF ist passwortgeschützt. Bitte eine ungeschützte Kopie verwenden.',
      );
    throw new Error(
      'Die PDF ist beschädigt oder enthält keine lesbaren Seiten.',
    );
  }
}
class TextPages {
  private page: PDFPage;
  private y = 780;
  constructor(
    private pdf: PDFDocument,
    private font: PDFFont,
  ) {
    this.page = pdf.addPage([595.28, 841.89]);
  }
  line(text: string, size = 11) {
    const width = 495;
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (this.font.widthOfTextAtSize(line + character, size) > width) {
          this.draw(line, size);
          line = '';
        }
        line += character;
      }
      this.draw(line || ' ', size);
    }
  }
  private draw(line: string, size: number) {
    if (this.y < 55) {
      this.page = this.pdf.addPage([595.28, 841.89]);
      this.y = 780;
    }
    this.page.drawText(line, {
      x: 50,
      y: this.y,
      size,
      font: this.font,
      color: rgb(0.13, 0.2, 0.21),
    });
    this.y -= size * 1.5;
  }
}
export class PdfService {
  constructor(
    private vault: FileVault,
    private fontBytes: () => Promise<Uint8Array>,
  ) {}
  async create(
    record: HouseRecord,
    entries: HouseEntry[],
    full: boolean,
  ): Promise<Uint8Array> {
    if (
      entries.reduce(
        (sum, e) => sum + e.attachments.reduce((bytes, a) => bytes + a.size, 0),
        0,
      ) >
      64 * 1024 * 1024
    )
      throw new Error(
        'Die Anhänge dieses Protokolls überschreiten 64 MB. Bitte Einzelprotokolle erstellen.',
      );
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Hausakte · ${record.name}`);
    pdf.setProducer('Hausakte · lokale Verarbeitung');
    pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(await this.fontBytes(), { subset: true });
    const cover = new TextPages(pdf, font);
    cover.line('HAUSAKTE', 24);
    cover.line(record.name, 20);
    cover.line(
      full
        ? 'Protokoll mit Fotos und PDFs'
        : 'Kompaktes Protokoll ohne Anhänge',
    );
    for (const [label, value] of Object.entries({
      Kategorie: record.category,
      Standort: record.location,
      Hersteller: record.manufacturer,
      Modell: record.model,
      Seriennummer: record.serial,
      Einbau: record.installedOn,
      Notiz: record.note,
    })) {
      if (value) cover.line(`${label}: ${value}`);
    }
    cover.line(
      `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'}. Neueste zuerst.`,
    );
    for (const entry of [...entries].sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id),
    )) {
      const text = new TextPages(pdf, font);
      text.line(entry.activity, 19);
      text.line(new Date(entry.occurredAt).toLocaleString('de-DE'));
      if (entry.provider) text.line(`Dienstleister: ${entry.provider}`);
      if (entry.costCents !== null)
        text.line(`Kosten: ${money(entry.costCents)}`);
      if (entry.measurement)
        text.line(
          `Mess- / Betriebsstand: ${entry.measurement.value.toLocaleString('de-DE')} ${entry.measurement.unit}`,
        );
      if (entry.note) text.line(entry.note);
      text.line(
        `${entry.attachments.filter((a) => a.kind === 'photo').length} Fotos · ${entry.attachments.filter((a) => a.kind === 'pdf').length} PDFs`,
      );
      for (const attachment of entry.attachments) text.line(attachment.name);
      // Even compact reports verify every referenced attachment before success.
      for (const attachment of entry.attachments) {
        const bytes = await verifiedFile(this.vault, attachment);
        if (attachment.kind === 'pdf') {
          const original = await inspectPdf(bytes);
          if (original.getPageCount() !== attachment.pages)
            throw new Error(
              'Die Seitenzahl eines PDF-Anhangs stimmt nicht mehr.',
            );
          if (full) {
            const divider = new TextPages(pdf, font);
            divider.line('PDF-Anhang', 20);
            divider.line(`${record.name} · ${entry.activity}`);
            divider.line(new Date(entry.occurredAt).toLocaleString('de-DE'));
            divider.line(attachment.name, 16);
            divider.line(`${original.getPageCount()} Originalseiten`);
            const copied = await pdf.copyPages(
              original,
              original.getPageIndices(),
            );
            copied.forEach((page) => pdf.addPage(page));
          }
        } else {
          const image = await pdf.embedJpg(bytes);
          if (full) {
            const page = pdf.addPage([595.28, 841.89]);
            const fit = image.scaleToFit(495, 700);
            page.drawText(`Foto · ${entry.activity}`.slice(0, 65), {
              x: 50,
              y: 790,
              size: 12,
              font,
            });
            page.drawImage(image, {
              x: (595.28 - fit.width) / 2,
              y: (760 - fit.height) / 2 + 20,
              ...fit,
            });
          }
        }
      }
    }
    const bytes = await pdf.save();
    if (bytes.length > MAX_FILE_BYTES)
      throw new Error(
        'Das Protokoll überschreitet 50 MB. Bitte kleinere Einzelprotokolle erstellen.',
      );
    return bytes;
  }
}
