import type { SavedReport } from '../domain/models';
import type { HouseService } from '../../features/entries/entry-service';
import type { HouseNative, PdfSession } from '../native/house-native';
import { verifiedFile } from '../files/integrity';
export type OpenPdf = {
  id: string;
  name: string;
  file: string;
  sha256: string;
  uri: string;
  kind: 'attachment' | 'report';
  preview: PdfSession;
  parts: SavedReport[];
};
export class PdfViewerService {
  constructor(
    private house: HouseService,
    private native: HouseNative,
  ) {}
  async open(id: string): Promise<OpenPdf> {
    const [snapshot, drafts] = await Promise.all([
      this.house.repository.snapshot(),
      this.house.repository.drafts(),
    ]);
    const report = snapshot.reports.find((r) => r.id === id);
    const attachment = [
      ...snapshot.entries.flatMap((e) => e.attachments),
      ...drafts.flatMap((d) => d.form.attachments),
    ].find((a) => a.id === id && a.kind === 'pdf');
    const item = report ?? attachment;
    if (!item) throw new Error('Diese PDF ist nicht mehr vorhanden.');
    await verifiedFile(this.house.vault, item);
    const uri = this.house.vault.uri(item.file);
    return {
      id,
      name: item.name,
      file: item.file,
      sha256: item.sha256,
      uri,
      parts: report?.groupId
        ? snapshot.reports
            .filter((r) => r.groupId === report.groupId)
            .sort((a, b) => a.partIndex! - b.partIndex!)
        : report
          ? [report]
          : [],
      kind: report ? 'report' : 'attachment',
      preview: await this.native.openPdfPreview(uri),
    };
  }
  page(pdf: OpenPdf, index: number, width: number) {
    return this.native.renderPdfPage(pdf.preview.session, index, width);
  }
  close(pdf: OpenPdf) {
    return this.native.closePdfPreview(pdf.preview.session);
  }
  async print(pdf: OpenPdf) {
    await verifiedFile(this.house.vault, pdf);
    await this.native.printPdf(pdf.uri, pdf.name + '.pdf');
  }
}
