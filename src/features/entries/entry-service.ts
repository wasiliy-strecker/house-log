import {
  entrySchema,
  recordSchema,
  snapshotFiles,
  costInput,
  parseCost,
  type Attachment,
  type EntryDraft,
  type HouseEntry,
  type HouseRecord,
  type SavedReport,
} from '../../core/domain/models';
import type {
  Environment,
  FileVault,
  Repository,
  ReminderPort,
} from '../../core/ports';
import { SerialQueue } from '../../core/ports';
import { digest } from '../../core/files/integrity';
import {
  inspectPdf,
  MAX_FILE_BYTES,
  type PdfService,
} from '../../core/pdf/pdf-service';

export class HouseService {
  readonly queue = new SerialQueue();
  constructor(
    readonly repository: Repository,
    readonly vault: FileVault,
    readonly env: Environment,
    readonly pdf: PdfService,
    readonly reminders: ReminderPort,
  ) {}
  async cleanup(candidates: string[]): Promise<void> {
    // A failed reference lookup must prevent all physical deletion.
    try {
      const used = new Set(snapshotFiles(await this.repository.snapshot()));
      for (const d of await this.repository.drafts())
        for (const a of d.form.attachments) used.add(a.file);
      for (const file of new Set(candidates))
        if (!used.has(file))
          await this.vault.remove(file).catch(() => undefined);
    } catch {
      /* Retain an orphan rather than risk a referenced file. */
    }
  }
  async syncReminders(): Promise<string[]> {
    try {
      const data = await this.repository.snapshot();
      return await this.reminders.sync(data.records, data.entries);
    } catch {
      return [
        'Gespeichert. Erinnerungen konnten nicht aktualisiert werden. Bitte die Berechtigungen in den Einstellungen prüfen.',
      ];
    }
  }
  saveRecord(record: HouseRecord) {
    return this.queue.run(async () => {
      await this.repository.saveRecord(
        recordSchema.parse({ ...record, updatedAt: this.env.now() }),
      );
      return this.syncReminders();
    });
  }
  async draft(recordId: string, entry?: HouseEntry): Promise<EntryDraft> {
    const existing = (await this.repository.drafts()).find(
      (d) => d.recordId === recordId && d.entryId === (entry?.id ?? null),
    );
    if (existing) return existing;
    const now = this.env.now();
    const draft: EntryDraft = {
      id: this.env.id(),
      recordId,
      entryId: entry?.id ?? null,
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
      external: null,
      form: {
        activity: entry?.activity ?? '',
        occurredAt: entry?.occurredAt ?? now,
        provider: entry?.provider ?? '',
        cost: costInput(entry?.costCents ?? null),
        value: entry?.measurement?.value.toString().replace('.', ',') ?? '',
        unit: entry?.measurement?.unit ?? 'h',
        note: entry?.note ?? '',
        attachments: entry?.attachments ?? [],
      },
    };
    await this.repository.saveDraft(draft);
    return draft;
  }
  persistDraft(draft: EntryDraft): Promise<void> {
    return this.queue.run(async () => {
      const previous = (await this.repository.drafts()).find(
        (d) => d.id === draft.id,
      );
      await this.repository.saveDraft({ ...draft, updatedAt: this.env.now() });
      await this.cleanup(previous?.form.attachments.map((a) => a.file) ?? []);
    });
  }
  async importAttachment(
    bytes: Uint8Array,
    kind: Attachment['kind'],
    name: string,
  ): Promise<Attachment> {
    if (!bytes.length || bytes.length > MAX_FILE_BYTES)
      throw new Error('Die Datei ist leer oder größer als 50 MB.');
    const pages =
      kind === 'pdf' ? (await inspectPdf(bytes)).getPageCount() : undefined;
    const file = await this.vault.put(bytes, kind === 'pdf' ? 'pdf' : 'jpg');
    return {
      id: this.env.id(),
      kind,
      name:
        name.slice(0, 500) || (kind === 'pdf' ? 'Dokument.pdf' : 'Foto.jpg'),
      file,
      sha256: digest(bytes),
      size: bytes.length,
      ...(pages ? { pages } : {}),
    };
  }
  saveEntry(
    draft: EntryDraft,
  ): Promise<{ entry: HouseEntry; warnings: string[] }> {
    return this.queue.run(async () => {
      const f = draft.form;
      const number = f.value.trim().replace(',', '.');
      if (number && !/^\d+(\.\d+)?$/.test(number))
        throw new Error(
          'Bitte einen gültigen Messwert eingeben oder das Feld leeren.',
        );
      const entry = entrySchema.parse({
        id: draft.entryId ?? this.env.id(),
        recordId: draft.recordId,
        activity: f.activity.trim(),
        occurredAt: f.occurredAt,
        provider: f.provider,
        costCents: parseCost(f.cost),
        measurement: number
          ? { value: Number(number), unit: f.unit.trim() }
          : null,
        note: f.note,
        attachments: f.attachments,
        createdAt: draft.createdAt,
        updatedAt: this.env.now(),
      });
      const before = await this.repository.snapshot();
      await this.repository.saveEntry(entry, draft.id);
      await this.cleanup(
        before.entries
          .find((e) => e.id === entry.id)
          ?.attachments.map((a) => a.file) ?? [],
      );
      return { entry, warnings: await this.syncReminders() };
    });
  }
  discard(draft: EntryDraft): Promise<void> {
    return this.queue.run(async () => {
      await this.repository.removeDraft(draft.id);
      await this.cleanup(draft.form.attachments.map((a) => a.file));
    });
  }
  delete(kind: 'record' | 'entry' | 'report', id: string): Promise<string[]> {
    return this.queue.run(async () => {
      const candidates = snapshotFiles(await this.repository.snapshot());
      const drafts = await this.repository.drafts();
      candidates.push(
        ...drafts.flatMap((d) => d.form.attachments.map((a) => a.file)),
      );
      if (kind === 'record') await this.repository.deleteRecord(id);
      else if (kind === 'entry') await this.repository.deleteEntry(id);
      else await this.repository.deleteReport(id);
      await this.cleanup(candidates);
      return this.syncReminders();
    });
  }
  createReport(
    recordId: string,
    entryId: string | null,
    full: boolean,
  ): Promise<SavedReport> {
    return this.queue.run(async () => {
      const data = await this.repository.snapshot();
      const record = data.records.find((r) => r.id === recordId);
      if (!record) throw new Error('Die Akte wurde nicht gefunden.');
      const entries = data.entries.filter(
        (e) => e.recordId === recordId && (!entryId || e.id === entryId),
      );
      if (entryId && !entries.length)
        throw new Error('Der Eintrag wurde nicht gefunden.');
      const createdAt = this.env.now();
      const bytes = await this.pdf.create(record, entries, full, {
        kind: entryId ? 'single' : 'history',
        createdAt,
      });
      const file = await this.vault.put(bytes, 'pdf');
      try {
        const report: SavedReport = {
          id: this.env.id(),
          recordId,
          entryId,
          name: `${record.name.slice(0, 200)} · ${entryId ? 'Einzelprotokoll' : 'Gesamtprotokoll'} · ${full ? 'vollständig' : 'kompakt'}`,
          file,
          sha256: digest(bytes),
          createdAt,
          full,
        };
        await this.repository.saveReport(report);
        return report;
      } catch (error) {
        await this.cleanup([file]);
        throw error;
      }
    });
  }
}
