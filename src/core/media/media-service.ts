import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Attachment, EntryDraft } from '../domain/models';
import type { HouseService } from '../../features/entries/entry-service';
import { houseNative } from '../native/house-native';
import { MAX_FILE_BYTES } from '../pdf/pdf-service';
import { verifiedFile } from '../files/integrity';
import { MAX_BACKUP_BYTES } from '../backup/backup-service';

export type PreparedBackup = { uri: string; name: string };
export type PickResult = { attachments: Attachment[]; failures: string[] };
export interface MediaPort {
  pick(
    source: NonNullable<EntryDraft['external']>,
    multiple?: boolean,
  ): Promise<PickResult>;
  recoverPhotos(): Promise<PickResult>;
  open(item: { file: string; sha256: string }): Promise<void>;
  share(item: { file: string; sha256: string }): Promise<void>;
  prepareBackup(bytes: Uint8Array): Promise<PreparedBackup>;
  saveBackup(file: PreparedBackup): Promise<'saved' | 'cancelled'>;
  shareBackup(file: PreparedBackup): Promise<void>;
  discardBackup(file: PreparedBackup): Promise<void>;
  pickBackup(): Promise<Uint8Array | null>;
}
export class ExpoMedia implements MediaPort {
  constructor(private house: HouseService) {}
  async importPhoto(asset: ImagePicker.ImagePickerAsset): Promise<Attachment> {
    const manipulator = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > 1920)
      manipulator.resize(
        asset.width >= asset.height ? { width: 1920 } : { height: 1920 },
      );
    const rendered = await manipulator.renderAsync();
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.88,
    });
    // Android's Bitmap encoder creates fresh JPEG bytes with no inherited EXIF.
    try {
      return await this.house.importAttachment(
        await new File(result.uri).bytes(),
        'photo',
        asset.fileName?.replace(/\.[^.]*$/, '.jpg') || 'Foto.jpg',
      );
    } finally {
      new File(result.uri).delete();
      rendered.release();
      manipulator.release();
    }
  }
  private async photos(
    result:
      ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null,
  ): Promise<PickResult> {
    const output: PickResult = { attachments: [], failures: [] };
    if (!result) return output;
    if ('code' in result) {
      output.failures.push(
        result.message ||
          'Die Fotoauswahl konnte nicht wiederhergestellt werden.',
      );
      return output;
    }
    if (result.canceled) return output;
    for (const asset of result.assets) {
      try {
        output.attachments.push(await this.importPhoto(asset));
      } catch {
        output.failures.push(
          `${asset.fileName || 'Foto'} konnte nicht übernommen werden.`,
        );
      }
    }
    return output;
  }
  async pick(
    source: NonNullable<EntryDraft['external']>,
    multiple = true,
  ): Promise<PickResult> {
    if (source === 'camera') {
      if (!(await ImagePicker.requestCameraPermissionsAsync()).granted)
        throw new Error(
          'Die Kamera ist nicht freigegeben. Du kannst Fotos aus der Galerie wählen.',
        );
      return this.photos(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
          exif: false,
        }),
      );
    }
    if (source === 'gallery')
      return this.photos(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: multiple,
          quality: 1,
          exif: false,
        }),
      );
    const output: PickResult = { attachments: [], failures: [] };
    const assets: { uri: string; name: string }[] = [];
    if (source === 'scanner') {
      const uri = await houseNative.scan();
      if (uri)
        assets.push({
          uri,
          name: `Scan ${new Date().toLocaleDateString('de-DE')}.pdf`,
        });
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple,
        copyToCacheDirectory: true,
      });
      if (!result.canceled) assets.push(...result.assets);
    }
    for (const asset of assets) {
      try {
        const file = new File(asset.uri);
        if (file.size > MAX_FILE_BYTES)
          throw new Error('PDF größer als 50 MB.');
        const bytes = await file.bytes();
        // Structural JS check and Android's independent PDF engine must agree.
        const { inspectPdf } = await import('../pdf/pdf-service');
        const pdf = await inspectPdf(bytes);
        const nativePages = await houseNative.validatePdf(asset.uri);
        if (nativePages !== pdf.getPageCount())
          throw new Error('Die PDF-Seiten sind inkonsistent.');
        output.attachments.push(
          await this.house.importAttachment(bytes, 'pdf', asset.name),
        );
      } catch (error) {
        output.failures.push(
          `${asset.name}: ${error instanceof Error ? error.message : 'Die PDF ist beschädigt, geschützt oder nicht lesbar.'}`,
        );
      }
    }
    return output;
  }
  async recoverPhotos() {
    return this.photos(await ImagePicker.getPendingResultAsync());
  }
  async open(item: { file: string; sha256: string }) {
    await verifiedFile(this.house.vault, item);
    try {
      await houseNative.openPdf(this.house.vault.uri(item.file));
    } catch {
      throw new Error(
        'Keine App zum Öffnen von PDFs verfügbar. Bitte eine PDF-App installieren oder „Teilen“ verwenden.',
      );
    }
  }
  async share(item: { file: string; sha256: string }) {
    await verifiedFile(this.house.vault, item);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
    await Sharing.shareAsync(this.house.vault.uri(item.file), {
      mimeType: item.file.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    });
  }
  async prepareBackup(bytes: Uint8Array): Promise<PreparedBackup> {
    const directory = new Directory(Paths.cache, 'exports');
    directory.create({ intermediates: true, idempotent: true });
    const name = `Hausakte-${new Date().toISOString().replace(/[:.]/g, '-')}.habackup`;
    const file = new File(directory, name);
    try {
      file.write(bytes);
      return { uri: file.uri, name };
    } catch (error) {
      if (file.exists) file.delete();
      throw error;
    }
  }
  async saveBackup(file: PreparedBackup) {
    return (await houseNative.saveBackupFile(file.uri, file.name)).status;
  }
  async shareBackup(file: PreparedBackup) {
    const directory = new Directory(Paths.cache, 'shared-backups');
    directory.create({ idempotent: true, intermediates: true });
    const copy = new File(directory, file.name);
    new File(file.uri).copy(copy);
    await Sharing.shareAsync(copy.uri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Hausakte-Backup teilen',
    });
  }
  async discardBackup(file: PreparedBackup) {
    const directory = new Directory(Paths.cache, 'exports');
    if (
      !file.uri.startsWith(directory.uri.replace(/\/$/, '') + '/') ||
      file.uri.slice(directory.uri.replace(/\/$/, '').length + 1).includes('/')
    )
      throw new Error('Ungültige Backup-Referenz.');
    const stored = new File(file.uri);
    if (stored.exists) stored.delete();
  }
  async pickBackup() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset?.name.toLowerCase().endsWith('.habackup'))
      throw new Error('Bitte eine .habackup-Datei auswählen.');
    const file = new File(asset.uri);
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error('Das Backup ist größer als 128 MB.');
    return file.bytes();
  }
}
