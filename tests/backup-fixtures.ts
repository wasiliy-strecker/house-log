import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import type { Snapshot } from '../src/core/domain/models';
import { digest } from '../src/core/files/integrity';

export const backupDate = '2026-09-29T08:00:00.000Z';
export function backupManifest(
  data: Snapshot,
  files = new Map<string, Uint8Array>(),
) {
  return {
    format: 'hausakte_backup',
    version: 1,
    createdAt: backupDate,
    data,
    files: [...files].map(([file, bytes]) => ({
      file,
      size: bytes.length,
      sha256: digest(bytes),
    })),
  };
}

/** Independent v1 writer for legacy/invalid authenticated containers. */
export function legacyBackup(
  manifest: unknown,
  password: string,
  files: Uint8Array[] = [],
) {
  const metadata = Buffer.from(JSON.stringify(manifest));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(metadata.length);
  const header = Buffer.alloc(40);
  header.write('HABACK01');
  header.writeUInt32BE(600000, 8);
  randomBytes(16).copy(header, 12);
  randomBytes(12).copy(header, 28);
  const key = pbkdf2Sync(
    password,
    header.subarray(12, 28),
    600000,
    32,
    'sha256',
  );
  const cipher = createCipheriv('aes-256-gcm', key, header.subarray(28, 40));
  cipher.setAAD(header);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.concat([length, metadata, ...files])),
    cipher.final(),
  ]);
  key.fill(0);
  return new Uint8Array(
    Buffer.concat([header, encrypted, cipher.getAuthTag()]),
  );
}
