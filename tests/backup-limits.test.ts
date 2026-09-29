import { expect, it, vi } from 'vitest';
import { pbkdf2Sync } from 'node:crypto';
import {
  BackupCodec,
  MAX_BACKUP_BYTES,
  MAX_MANIFEST_BYTES,
  MAX_BACKUP_FILES,
  checkBackupSize,
} from '../src/core/backup/backup-service';
import { ContentLimitError } from '../src/core/files/limits';
import type { Snapshot } from '../src/core/domain/models';
import { env, record } from './support';
import { backupDate, backupManifest, legacyBackup } from './backup-fixtures';

const password = 'Synthetic boundary password';
const passwordKey = vi.fn(
  async (p: string, salt: Uint8Array, iterations: number) =>
    new Uint8Array(pbkdf2Sync(p, salt, iterations, 32, 'sha256')),
);
const codec = new BackupCodec({ ...env, now: () => backupDate }, passwordKey);

function sizedManifest(bytes: number): Snapshot {
  const r = record();
  const data: Snapshot = {
    records: [r],
    activities: [],
    reports: [],
    entries: Array.from({ length: 850 }, () => ({
      id: env.id(),
      recordId: r.id,
      activity: 'Wartung',
      occurredAt: backupDate,
      provider: '',
      costCents: null,
      measurement: null,
      note: '',
      attachments: [],
      createdAt: backupDate,
      updatedAt: backupDate,
    })),
  };
  let remaining =
    bytes - Buffer.byteLength(JSON.stringify(backupManifest(data)));
  for (const entry of data.entries) {
    const length = Math.min(20000, remaining);
    entry.note = 'x'.repeat(length);
    remaining -= length;
  }
  expect(remaining).toBe(0);
  return data;
}

it.each([-1, 0])(
  'round trips a manifest at 16 MiB %+i bytes',
  async (offset) => {
    const data = sizedManifest(MAX_MANIFEST_BYTES + offset);
    const backup = await codec.encode(data, new Map(), password);
    const decoded = await codec.decode(backup, password);
    expect(
      Buffer.byteLength(JSON.stringify(backupManifest(decoded.data))),
    ).toBe(MAX_MANIFEST_BYTES + offset);
    expect(decoded.data.entries).toHaveLength(850);
  },
);

it('rejects the oversized-text export before key derivation and identifies old oversized backups', async () => {
  const data = sizedManifest(MAX_MANIFEST_BYTES + 1);
  passwordKey.mockClear();
  await expect(codec.encode(data, new Map(), password)).rejects.toThrow(
    /16 MiB/,
  );
  expect(passwordKey).not.toHaveBeenCalled();
  const legacy = legacyBackup(backupManifest(data), password);
  await expect(codec.decode(legacy, password)).rejects.toThrow(
    ContentLimitError,
  );
  await expect(codec.decode(legacy, password)).rejects.toThrow(/16 MiB/);
  // Authentication must still take precedence over a claimed manifest length.
  await expect(codec.decode(legacy, 'wrong-password')).rejects.toThrow(
    /Passwort/,
  );
});

it('includes container overhead in the total-size boundary', () => {
  expect(() => checkBackupSize(1000, MAX_BACKUP_BYTES - 1061)).not.toThrow();
  expect(() => checkBackupSize(1000, MAX_BACKUP_BYTES - 1060)).not.toThrow();
  expect(() => checkBackupSize(1000, MAX_BACKUP_BYTES - 1059)).toThrow(
    /128 MB/,
  );
});

it('rejects unsupported file counts before encryption, including legacy containers', async () => {
  const data: Snapshot = {
    records: [],
    entries: [],
    reports: [],
    activities: [],
  };
  const files = new Map(
    Array.from({ length: MAX_BACKUP_FILES + 1 }, () => [
      `${env.id()}.jpg`,
      new Uint8Array([1]),
    ]),
  );
  passwordKey.mockClear();
  await expect(codec.encode(data, files, password)).rejects.toThrow(
    /30000 Dateien/,
  );
  expect(passwordKey).not.toHaveBeenCalled();
  await expect(
    codec.decode(legacyBackup(backupManifest(data, files), password), password),
  ).rejects.toThrow(/30000 Dateien/);
});
