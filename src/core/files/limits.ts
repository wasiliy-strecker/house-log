export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 2000;

/** A supported file can exceed a limit without being corrupt. */
export class ContentLimitError extends Error {}

export function checkPdfPages(pages: number, report = false): void {
  if (pages > MAX_PDF_PAGES)
    throw new ContentLimitError(
      report
        ? 'Das Protokoll überschreitet 2000 Seiten einschließlich Deckblättern und Anhängen. Bitte kleinere Einzelprotokolle erstellen.'
        : 'Die PDF überschreitet die Grenze von 2000 Seiten.',
    );
}
