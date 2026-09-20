import { androidPasswordKey } from '../backup/password-key';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { PDFDocument } from 'pdf-lib';
import { migrate, SqlRepository } from '../database/repository';
import { ExpoVault } from '../files/expo-vault';
import { HouseService } from '../../features/entries/entry-service';
import { PdfService } from '../pdf/pdf-service';
import { ExpoMedia } from '../media/media-service';
import { BackupCodec, BackupService } from '../backup/backup-service';
import { houseNative } from '../native/house-native';
import { digest } from '../files/integrity';
import type { Environment, SqlConnection } from '../ports';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export async function androidCheck(
  progress: (text: string) => void,
): Promise<string> {
  if (!__DEV__) throw new Error('Nur im Dev-Build verfügbar.');
  const checks: string[] = [];
  function step(text: string) {
    checks.push(text);
    progress(text);
  }
  const env: Environment = {
    id: Crypto.randomUUID,
    now: () => new Date().toISOString(),
    random: Crypto.getRandomBytes,
  };
  const id = env.id();
  const name = `check-${id}.db`;
  let connection = await SQLite.openDatabaseAsync(name);
  const db: SqlConnection = {
    exec: (sql) => connection.execAsync(sql),
    run: async (sql, ...params) => {
      await connection.runAsync(sql, ...params);
    },
    all: <T>(sql: string, ...params: (string | number | null)[]) =>
      connection.getAllAsync<T>(sql, ...params),
  };
  await migrate(db);
  const repo = new SqlRepository(db);
  const vault = new ExpoVault(`check-${id}`);
  async function asset(module: number) {
    const a = Asset.fromModule(module);
    await a.downloadAsync();
    return new File(a.localUri!);
  }
  const pdf = new PdfService(vault, async () =>
    (await asset(require('../../../assets/DejaVuSans.ttf'))).bytes(),
  );
  const house = new HouseService(repo, vault, env, pdf, {
    async sync() {
      return [];
    },
  });
  const media = new ExpoMedia(house);
  const backup = new BackupService(
    house,
    new BackupCodec(env, androidPasswordKey),
  );
  try {
    const now = env.now();
    const record = {
      id: env.id(),
      name: 'Synthetisches Testhaus',
      category: 'Haus',
      location: 'Testort',
      manufacturer: '',
      model: '',
      serial: '',
      installedOn: '',
      note: '',
      reminder: null,
      createdAt: now,
      updatedAt: now,
    };
    await house.saveRecord(record);
    const d = await house.draft(record.id);
    d.form.activity = 'Wartung';
    d.form.cost = '123,45';
    d.form.note = 'Synthetischer Android-Test';
    const photo = await asset(require('../../../assets/synthetic-photo.jpg'));
    const optimized = await media.importPhoto({
      uri: photo.uri,
      width: 2500,
      height: 1600,
      fileName: 'Testfoto.jpg',
    });
    const photoBytes = await vault.read(optimized.file);
    const probe = await PDFDocument.create();
    const image = await probe.embedJpg(photoBytes);
    assert(Math.max(image.width, image.height) <= 1920, 'Foto ist zu groß.');
    assert(
      !String.fromCharCode(...photoBytes.slice(0, 10000)).includes('Exif'),
      'EXIF wurde übernommen.',
    );
    step('Fotooptimierung: 1920 Pixel, frisches JPEG ohne EXIF.');
    const original = await (
      await asset(require('../../../assets/synthetic-document.pdf'))
    ).bytes();
    const first = await house.importAttachment(
      original,
      'pdf',
      'Synthetischer Prüfbericht.pdf',
    );
    assert(
      (await houseNative.validatePdf(vault.uri(first.file))) === 2,
      'Native PDF-Seitenzahl falsch.',
    );
    let protectedRejected = false;
    try {
      await houseNative.validatePdf(
        (await asset(require('../../../assets/protected.pdf'))).uri,
      );
    } catch {
      protectedRejected = true;
    }
    assert(protectedRejected, 'Passwortschutz wurde nicht erkannt.');
    step(
      'Android-PDF-Engine: zwei Querformatseiten und Passwortschutz geprüft.',
    );
    const second = await house.importAttachment(
      original,
      'pdf',
      'Zweiter Prüfbericht.pdf',
    );
    d.form.attachments = [optimized, first, second];
    d.external = 'scanner';
    await house.persistDraft(d);
    await connection.closeAsync();
    connection = await SQLite.openDatabaseAsync(name);
    await migrate(db);
    const restoredDraft = (await repo.drafts())[0];
    assert(
      restoredDraft?.form.cost === '123,45' &&
        restoredDraft.external === 'scanner' &&
        restoredDraft.form.attachments.length === 3,
      'Entwurf nicht wiederhergestellt.',
    );
    step('SQLite-Neuöffnung: Formularentwurf und Anhänge erhalten.');
    const { entry } = await house.saveEntry(restoredDraft);
    const edit = await house.draft(record.id, entry);
    edit.form.cost = '234,56';
    edit.form.attachments = [optimized, second, first];
    const updated = await house.saveEntry(edit);
    assert(updated.entry.costCents === 23456, 'Centbetrag falsch.');
    const report = await house.createReport(record.id, null, true);
    const reportBytes = await vault.read(report.file);
    assert(
      (await houseNative.validatePdf(vault.uri(report.file))) === 9,
      'Protokollseiten fehlen.',
    );
    assert(
      digest(await vault.read(first.file)) === digest(original),
      'Original-PDF verändert.',
    );
    step('Eintrag bearbeitet und sortiert. Vollständiges PDF nativ geöffnet.');
    const preview = await houseNative.openPdfPreview(vault.uri(report.file));
    assert(preview.pages.length === 9, 'Vorschauseiten fehlen.');
    const landscapePreview = await houseNative.openPdfPreview(
      vault.uri(first.file),
    );
    assert(
      landscapePreview.pages[0]!.width > landscapePreview.pages[0]!.height,
      'Querformat in Vorschau verloren.',
    );
    await houseNative.closePdfPreview(landscapePreview.session);
    for (let index = 0; index < preview.pages.length; index++) {
      const uri = await houseNative.renderPdfPage(preview.session, index, 900);
      const page = new File(uri);
      assert(
        page.exists && page.size > 100,
        'Vorschauseite wurde nicht gerendert.',
      );
    }
    const again = await houseNative.renderPdfPage(preview.session, 0, 900);
    assert(
      new File(again).exists,
      'Verdrängte Vorschauseite wurde nicht erneut geladen.',
    );
    await houseNative.closePdfPreview(preview.session);
    assert(!new File(again).exists, 'Vorschaucache nach Schließen erhalten.');
    let closedRejected = false;
    try {
      await houseNative.renderPdfPage(preview.session, 0, 900);
    } catch {
      closedRejected = true;
    }
    assert(closedRejected, 'Geschlossene PDF-Vorschau akzeptiert.');
    assert(
      digest(await vault.read(report.file)) === digest(reportBytes),
      'Vorschau verändert Original.',
    );
    step(
      'Native PDF-Vorschau: neun Seiten, Querformat, Cache-Neuladen, Schließen und unverändertes Original geprüft.',
    );

    const change = await house.draft(record.id, updated.entry);
    change.form.note = 'Spätere Änderung';
    await house.saveEntry(change);
    assert(
      digest(await vault.read(report.file)) === digest(reportBytes),
      'Altes Protokoll wurde verändert.',
    );
    step('Gespeichertes Protokoll bleibt nach Bearbeitung unverändert.');
    const knownKey = await houseNative.deriveBackupKey(
      'Synthetisches Passwort ä🔑',
      '00112233445566778899aabbccddeeff',
      600000,
    );
    assert(
      knownKey ===
        'f2301eb4e771957c77bf0b24519cd0624017347b00adb74addc2a426db8883a4',
      'Native Schlüsselableitung weicht von OpenSSL ab.',
    );
    step(
      'Native PBKDF2-Ableitung stimmt mit OpenSSL überein, auch mit Unicode.',
    );
    progress('Backup wird mit PBKDF2 und AES-256-GCM verschlüsselt …');
    const bytes = await backup.create('Synthetisches Testpasswort 2026');
    progress('Backup wird vollständig entschlüsselt und geprüft …');
    const decoded = await backup.codec.decode(
      bytes,
      'Synthetisches Testpasswort 2026',
    );
    const before = await repo.snapshot();
    // This is an isolated test database. Only synthetic test records are removed.
    await house.delete('record', record.id);
    await backup.restore(decoded);
    const after = await repo.snapshot();
    assert(
      after.records.length === 1 &&
        after.entries[0]?.costCents === 23456 &&
        after.reports.length === 1,
      'Wiederherstellung unvollständig.',
    );
    assert(
      before.entries[0]?.attachments.map((a) => a.id).join() ===
        after.entries[0]?.attachments.map((a) => a.id).join(),
      'Reihenfolge verändert.',
    );
    for (const item of [
      ...after.entries.flatMap((e) => e.attachments),
      ...after.reports,
    ])
      assert(
        digest(await vault.read(item.file)) === item.sha256,
        'Wiederhergestellte Datei verändert.',
      );
    step(
      'Verschlüsseltes Backup mit Fotos und PDFs erfolgreich wiederhergestellt.',
    );
    let wrong = false;
    try {
      await backup.codec.decode(bytes, 'Falsch');
    } catch {
      wrong = true;
    }
    assert(wrong, 'Falsches Passwort akzeptiert.');
    step('Falsches Backup-Passwort verständlich abgewiesen.');
    await connection.closeAsync();
    connection = await SQLite.openDatabaseAsync(name);
    await migrate(db);
    assert(
      (await repo.snapshot()).entries.length === 1,
      'Daten nach Neuöffnung verloren.',
    );
    step(
      'Wiederhergestellte Daten bleiben nach erneuter SQLite-Neuöffnung erhalten.',
    );
    const result = JSON.stringify(
      { success: true, checkedAt: env.now(), checks },
      null,
      2,
    );
    new File(Paths.document, 'android-check-result.json').write(result);
    return result;
  } finally {
    await connection.closeAsync();
    // Test evidence and synthetic files are retained for independent PDF inspection.
  }
}
