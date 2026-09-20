import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import {
  fileKey,
  snapshotFiles,
  validateSnapshot,
  type Snapshot,
} from '../domain/models';
import { digest, verifiedFile } from '../files/integrity';
import { inspectPdf } from '../pdf/pdf-service';
import type { Environment } from '../ports';
import type { HouseService } from '../../features/entries/entry-service';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAGIC = encoder.encode('HABACK01');
const ITERATIONS = 600000;
export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
export type PasswordKey = (
  password: string,
  salt: Uint8Array,
  iterations: number,
) => Promise<Uint8Array>;
export const noblePasswordKey: PasswordKey = (password, salt, iterations) =>
  pbkdf2Async(sha256, encoder.encode(password), salt, {
    c: iterations,
    dkLen: 32,
    asyncTick: 8,
  });
const descriptorsSchema = z
  .array(
    z
      .object({
        file: fileKey,
        size: z
          .number()
          .int()
          .positive()
          .max(50 * 1024 * 1024),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
  )
  .max(30000);
type DecodedBackup = {
  data: Snapshot;
  files: Map<string, Uint8Array>;
  createdAt: string;
};
function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}
function integer(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset);
}
export class BackupCodec {
  constructor(
    private env: Environment,
    private passwordKey: PasswordKey = noblePasswordKey,
  ) {}
  async encode(
    data: Snapshot,
    files: Map<string, Uint8Array>,
    password: string,
  ): Promise<Uint8Array> {
    if (password.length < 10 || password.length > 1024)
      throw new Error(
        'Bitte ein Passwort mit mindestens 10 Zeichen verwenden.',
      );
    const descriptors = [...files].map(([file, bytes]) => ({
      file,
      size: bytes.length,
      sha256: digest(bytes),
    }));
    const manifest = encoder.encode(
      JSON.stringify({
        format: 'hausakte_backup',
        version: 1,
        createdAt: this.env.now(),
        data: validateSnapshot(data),
        files: descriptors,
      }),
    );
    const size =
      4 +
      manifest.length +
      [...files.values()].reduce((sum, b) => sum + b.length, 0);
    if (size > MAX_BACKUP_BYTES - 64)
      throw new Error(
        'Das Backup überschreitet die derzeitige Grenze von 128 MB.',
      );
    const payload = concatBytes(
      u32(manifest.length),
      manifest,
      ...files.values(),
    );
    const salt = this.env.random(16);
    const nonce = this.env.random(12);
    const header = concatBytes(MAGIC, u32(ITERATIONS), salt, nonce);
    const key = await this.passwordKey(password, salt, ITERATIONS);
    try {
      return concatBytes(header, gcm(key, nonce, header).encrypt(payload));
    } finally {
      key.fill(0);
      payload.fill(0);
    }
  }
  async decode(bytes: Uint8Array, password: string): Promise<DecodedBackup> {
    if (
      bytes.length < 60 ||
      bytes.length > MAX_BACKUP_BYTES ||
      !MAGIC.every((b, i) => bytes[i] === b)
    )
      throw new Error('Keine unterstützte Hausakte-Sicherung (.habackup).');
    const iterations = integer(bytes, 8);
    if (iterations !== ITERATIONS)
      throw new Error(
        'Die Backup-Version oder Schlüsselableitung wird nicht unterstützt.',
      );
    if (password.length > 1024) throw new Error('Das Passwort ist zu lang.');
    const key = await this.passwordKey(
      password,
      bytes.slice(12, 28),
      iterations,
    );
    let payload: Uint8Array;
    try {
      payload = gcm(key, bytes.slice(28, 40), bytes.slice(0, 40)).decrypt(
        bytes.slice(40),
      );
    } catch {
      throw new Error(
        'Das Passwort ist falsch oder das Backup wurde beschädigt.',
      );
    } finally {
      key.fill(0);
    }
    try {
      const length = integer(payload, 0);
      if (length > 16 * 1024 * 1024 || length > payload.length - 4)
        throw new Error('Ungültiges Inhaltsverzeichnis.');
      const manifest = z
        .object({
          format: z.literal('hausakte_backup'),
          version: z.literal(1),
          createdAt: z.string().datetime({ offset: true }),
          data: z.unknown(),
          files: descriptorsSchema,
        })
        .strict()
        .parse(JSON.parse(decoder.decode(payload.slice(4, 4 + length))));
      const data = validateSnapshot(manifest.data);
      const files = new Map<string, Uint8Array>();
      let offset = 4 + length;
      for (const descriptor of manifest.files) {
        if (
          files.has(descriptor.file) ||
          offset + descriptor.size > payload.length
        )
          throw new Error('Doppelte oder fehlende Datei.');
        const file = payload.slice(offset, offset + descriptor.size);
        offset += descriptor.size;
        if (digest(file) !== descriptor.sha256)
          throw new Error('Ungültige Prüfsumme.');
        if (descriptor.file.endsWith('.pdf')) await inspectPdf(file);
        else {
          const probe = await PDFDocument.create();
          await probe.embedJpg(file);
        }
        files.set(descriptor.file, file);
      }
      if (
        offset !== payload.length ||
        files.size !== snapshotFiles(data).length
      )
        throw new Error('Unvollständiges Inhaltsverzeichnis.');
      for (const item of [
        ...data.entries.flatMap((e) => e.attachments),
        ...data.reports,
      ]) {
        const file = files.get(item.file);
        if (
          !file ||
          digest(file) !== item.sha256 ||
          ('size' in item && item.size !== file.length)
        )
          throw new Error('Eine Anhangsreferenz ist beschädigt.');
        if (
          'kind' in item &&
          item.kind === 'pdf' &&
          (await inspectPdf(file)).getPageCount() !== item.pages
        )
          throw new Error('Ungültige Seitenzahl.');
      }
      return { data, files, createdAt: manifest.createdAt };
    } catch {
      throw new Error(
        'Das Backup enthält beschädigte oder unvollständige Daten. Es wurde nichts übernommen.',
      );
    } finally {
      payload.fill(0);
    }
  }
}
export class BackupService {
  constructor(
    private house: HouseService,
    readonly codec: BackupCodec,
  ) {}
  create(password: string): Promise<Uint8Array> {
    return this.house.queue.run(async () => {
      const data = await this.house.repository.snapshot();
      const files = new Map<string, Uint8Array>();
      let size = 0;
      for (const item of [
        ...data.entries.flatMap((e) => e.attachments),
        ...data.reports,
      ]) {
        const bytes = await verifiedFile(this.house.vault, item);
        if (!files.has(item.file)) size += bytes.length;
        if (size > MAX_BACKUP_BYTES - 64)
          throw new Error(
            'Das Backup überschreitet die derzeitige Grenze von 128 MB.',
          );
        files.set(item.file, bytes);
      }
      return this.codec.encode(data, files, password);
    });
  }
  restore(decoded: DecodedBackup): Promise<{ warnings: string[] }> {
    return this.house.queue.run(async () => {
      const old = await this.house.repository.snapshot();
      const staged: string[] = [];
      try {
        const mapping = new Map<string, string>();
        const hashes = new Map<string, string>();
        for (const [key, bytes] of decoded.files) {
          const file = await this.house.vault.put(
            bytes,
            key.endsWith('.pdf') ? 'pdf' : 'jpg',
          );
          staged.push(file);
          mapping.set(key, file);
          hashes.set(digest(bytes), file);
        }
        const incoming = JSON.parse(JSON.stringify(decoded.data)) as Snapshot;
        for (const item of [
          ...incoming.entries.flatMap((e) => e.attachments),
          ...incoming.reports,
        ])
          item.file = mapping.get(item.file)!;
        const records = new Map(old.records.map((r) => [r.id, r]));
        for (const record of incoming.records)
          if (
            !records.has(record.id) ||
            records.get(record.id)!.updatedAt < record.updatedAt
          )
            records.set(record.id, record);
        const entries = new Map(old.entries.map((e) => [e.id, e]));
        for (const entry of incoming.entries)
          if (
            !entries.has(entry.id) ||
            entries.get(entry.id)!.updatedAt < entry.updatedAt
          )
            entries.set(entry.id, entry);
        const reports = new Map(old.reports.map((r) => [r.id, r]));
        for (const report of incoming.reports) {
          if (
            reports.has(report.id) &&
            reports.get(report.id)!.sha256 !== report.sha256
          )
            throw new Error(
              'Ein gleichnamiges gespeichertes Protokoll hat einen anderen Inhalt. Wiederherstellung abgebrochen.',
            );
          if (!reports.has(report.id)) reports.set(report.id, report);
        }
        const data: Snapshot = {
          records: [...records.values()],
          entries: [...entries.values()],
          reports: [...reports.values()],
          activities: [...new Set([...old.activities, ...incoming.activities])],
        };
        // Repair missing matching files without rolling back newer entry content.
        for (const item of [
          ...data.entries.flatMap((e) => e.attachments),
          ...data.reports,
        ]) {
          try {
            await verifiedFile(this.house.vault, item);
          } catch {
            const repaired = hashes.get(item.sha256);
            if (repaired) item.file = repaired;
            // Unrelated missing local files do not invalidate the incoming backup.
          }
        }
        await this.house.repository.replace(data);
        await this.house.cleanup([...snapshotFiles(old), ...staged]);
        return { warnings: await this.house.syncReminders() };
      } catch (error) {
        await this.house.cleanup(staged);
        throw error;
      }
    });
  }
}
