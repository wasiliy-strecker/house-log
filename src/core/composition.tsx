import { androidPasswordKey } from './backup/password-key';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Text, View, Pressable } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { migrate, SqlRepository } from './database/repository';
import { ExpoVault } from './files/expo-vault';
import { PdfService } from './pdf/pdf-service';
import { HouseService } from '../features/entries/entry-service';
import { BackupCodec, BackupService } from './backup/backup-service';
import { ExpoMedia, type MediaPort } from './media/media-service';
import { houseNative, type HouseNative } from './native/house-native';
import type { Environment } from './ports';

export type Services = {
  house: HouseService;
  backup: BackupService;
  media: MediaPort;
  native: HouseNative;
};
const Context = createContext<
  (Services & { revision: number; refresh(): void }) | null
>(null);
let boot: Promise<Services> | undefined;
async function createServices(): Promise<Services> {
  const connection = await SQLite.openDatabaseAsync('hausakte.db');
  const db = {
    exec: (sql: string) => connection.execAsync(sql),
    run: async (sql: string, ...params: (string | number | null)[]) => {
      await connection.runAsync(sql, ...params);
    },
    all: <T,>(sql: string, ...params: (string | number | null)[]) =>
      connection.getAllAsync<T>(sql, ...params),
  };
  await migrate(db);
  const repository = new SqlRepository(db);
  const vault = new ExpoVault();
  const env: Environment = {
    id: Crypto.randomUUID,
    now: () => new Date().toISOString(),
    random: Crypto.getRandomBytes,
  };
  const pdf = new PdfService(vault, async () => {
    const asset = Asset.fromModule(require('../../assets/DejaVuSans.ttf'));
    await asset.downloadAsync();
    return new File(asset.localUri!).bytes();
  });
  const house = new HouseService(repository, vault, env, pdf, {
    async sync(records, entries) {
      return houseNative.syncReminders(
        JSON.stringify(
          records
            .filter((r) => r.reminder)
            .map((r) => {
              const latest = entries
                .filter((e) => e.recordId === r.id)
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
              return {
                ...r.reminder,
                recordId: r.id,
                label: r.name,
                category: 'house',
                categoryLabel: r.category || 'Akte',
                latestValue: latest?.activity ?? null,
                latestUnit: null,
              };
            }),
        ),
      );
    },
  });
  const media = new ExpoMedia(house);
  // Only clean startup orphans after SQLite and persistent drafts are available.
  await house.cleanup(await vault.list());
  const interrupted = (await repository.drafts()).find(
    (d) => d.external === 'camera' || d.external === 'gallery',
  );
  if (interrupted) {
    const recovered = await media.recoverPhotos();
    interrupted.form.attachments.push(
      ...recovered.attachments.filter(
        (a) =>
          !interrupted.form.attachments.some((old) => old.sha256 === a.sha256),
      ),
    );
    interrupted.external = null;
    await repository.saveDraft(interrupted);
  }
  await house.syncReminders();
  return {
    house,
    backup: new BackupService(house, new BackupCodec(env, androidPasswordKey)),
    media,
    native: houseNative,
  };
}
export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Services>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    boot ??= createServices();
    boot.then(setServices).catch((e) => {
      boot = undefined;
      setError(
        e instanceof Error
          ? e.message
          : 'Lokale Daten konnten nicht geladen werden.',
      );
    });
  }, [attempt]);
  if (!services)
    return (
      <View
        style={{
          flex: 1,
          padding: 32,
          justifyContent: 'center',
          backgroundColor: '#FAF8F1',
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 28, color: '#12666B', fontWeight: '700' }}>
          Hausakte
        </Text>
        {error ? (
          <>
            <Text accessibilityRole="alert">{error}</Text>
            <Pressable
              onPress={() => {
                setError('');
                setAttempt((n) => n + 1);
              }}
              style={{ minHeight: 48, padding: 14 }}
            >
              <Text>Erneut versuchen</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            color="#12666B"
            accessibilityLabel="Lokale Daten werden geladen"
          />
        )}
      </View>
    );
  return (
    <Context.Provider
      value={{
        ...services,
        revision,
        refresh: () => setRevision((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useServices() {
  const value = useContext(Context);
  if (!value) throw new Error('Composition Root fehlt.');
  return value;
}
