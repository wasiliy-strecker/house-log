import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  Card,
  Field,
  Heading,
  Notice,
  Page,
  Title,
  colors,
  styles,
} from '../../core/ui/components';
import { useRecords, useRecordDetail } from './use-records';
import { PAGE_SIZE, money } from '../../core/domain/models';

export function RecordsScreen() {
  const vm = useRecords();
  return (
    <Page>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          accessibilityLabel="Hausakte Haus-Symbol"
        />
        <Button
          secondary
          title="Einstellungen"
          onPress={() => router.push('/settings')}
        />
      </View>
      <Title subtitle="Wartung, Reparatur und Unterlagen. Alles an einem Ort, direkt auf deinem Gerät.">
        Dein Zuhause. Gut dokumentiert.
      </Title>
      <Button
        title="Neue Akte anlegen"
        onPress={() => router.push('/record/edit')}
      />
      <Field
        label="Akten durchsuchen"
        value={vm.search}
        onChangeText={vm.setSearch}
        placeholder="Name, Kategorie oder Standort"
      />
      <Notice error text={vm.error} />
      {vm.loading && <Busy label="Akten werden geladen …" />}
      {!vm.loading && !vm.records.length && (
        <Card>
          <Heading>
            {vm.search
              ? 'Keine passenden Akten'
              : 'Hier beginnt deine Hausakte'}
          </Heading>
          <Body>
            Lege eine Akte für dein Haus, eine Wohnung oder eine Anlage an. Zum
            Beispiel für die Heizung oder das Dach.
          </Body>
        </Card>
      )}
      {vm.records.map((record) => (
        <Pressable
          key={record.id}
          accessibilityRole="button"
          accessibilityLabel={`Akte ${record.name} öffnen`}
          onPress={() =>
            router.push({ pathname: '/record/[id]', params: { id: record.id } })
          }
        >
          <Card>
            <Text
              style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}
            >
              {record.category.toLocaleUpperCase('de-DE') || 'AKTE'}
            </Text>
            <Heading>{record.name}</Heading>
            {record.location ? <Body>{record.location}</Body> : null}
            <Text style={styles.subtitle}>
              {vm.drafts.some((d) => d.recordId === record.id)
                ? 'Gesicherter Formularentwurf vorhanden'
                : 'Einträge und Unterlagen ansehen'}{' '}
              ›
            </Text>
          </Card>
        </Pressable>
      ))}
      <Text style={styles.subtitle}>Kostenlos. Ohne Konto. Ohne Werbung.</Text>
    </Page>
  );
}
export function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = useRecordDetail(id);
  function report(entryId: string | null) {
    Alert.alert(
      'PDF-Protokoll speichern',
      'Die gespeicherte PDF bleibt unverändert, auch wenn du Einträge später bearbeitest.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Kompakt ohne Anhänge',
          onPress: () => {
            void vm.createReport(entryId, false);
          },
        },
        {
          text: 'Mit Fotos und PDFs',
          onPress: () => {
            void vm.createReport(entryId, true);
          },
        },
      ],
    );
  }
  function remove(kind: 'record' | 'entry' | 'report', itemId: string) {
    Alert.alert(
      kind === 'record'
        ? 'Akte löschen?'
        : kind === 'entry'
          ? 'Eintrag löschen?'
          : 'Protokoll löschen?',
      kind === 'record'
        ? 'Die Akte, ihre Einträge und gespeicherten Protokolle werden gelöscht. Exportierte Kopien bleiben erhalten.'
        : kind === 'entry'
          ? 'Der Eintrag und seine Einzelprotokolle werden gelöscht. Gespeicherte Gesamtprotokolle bleiben erhalten.'
          : 'Die gespeicherte PDF wird entfernt. Exportierte Kopien bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            void vm.remove(kind, itemId);
          },
        },
      ],
    );
  }
  if (!vm.record)
    return (
      <Page>
        <Notice error text={vm.error} />
        {vm.loading ? (
          <Busy />
        ) : (
          <Body>Diese Akte ist nicht mehr vorhanden.</Body>
        )}
      </Page>
    );
  const record = vm.record;
  return (
    <Page>
      <Title
        subtitle={[record.category, record.location]
          .filter(Boolean)
          .join(' · ')}
      >
        {record.name}
      </Title>
      <View style={styles.row}>
        <Button
          title="Eintrag erfassen"
          disabled={vm.busy}
          onPress={() =>
            router.push({ pathname: '/entry/edit', params: { recordId: id } })
          }
        />
        <Button
          secondary
          title="Akte bearbeiten"
          disabled={vm.busy}
          onPress={() =>
            router.push({ pathname: '/record/edit', params: { id } })
          }
        />
      </View>
      {[
        record.manufacturer,
        record.model,
        record.serial,
        record.installedOn,
        record.note,
      ].some(Boolean) && (
        <Card>
          {record.manufacturer || record.model ? (
            <Body>
              {[record.manufacturer, record.model].filter(Boolean).join(' · ')}
            </Body>
          ) : null}
          {record.serial ? <Body>Seriennummer: {record.serial}</Body> : null}
          {record.installedOn ? (
            <Body>
              Einbau / Anschaffung:{' '}
              {new Date(record.installedOn).toLocaleDateString('de-DE')}
            </Body>
          ) : null}
          {record.note ? <Body>{record.note}</Body> : null}
        </Card>
      )}
      <Notice error text={vm.error} />
      <Notice text={vm.notice} />
      {vm.busy && <Busy />}
      <Heading>Verlauf</Heading>
      <Field
        label="Einträge durchsuchen"
        value={vm.search}
        onChangeText={vm.setSearch}
        placeholder="Aktivität, Dienstleister, Notiz oder PDF"
      />
      {vm.loading && <Busy label="Verlauf wird geladen …" />}
      {!vm.loading && !vm.entries.length && (
        <Card>
          <Body>
            {vm.search
              ? 'Keine passenden Einträge gefunden.'
              : 'Noch keine Einträge. Halte die nächste Wartung, Reparatur oder Anschaffung fest.'}
          </Body>
        </Card>
      )}
      {vm.entries.map((entry) => {
        const delta = vm.deltas[entry.id] ?? null;
        return (
          <Card key={entry.id}>
            <Text style={styles.subtitle}>
              {new Date(entry.occurredAt).toLocaleString('de-DE')}
            </Text>
            <Heading>{entry.activity}</Heading>
            {entry.provider ? <Body>{entry.provider}</Body> : null}
            {entry.costCents !== null && (
              <Text
                style={{
                  fontSize: 23,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                {money(entry.costCents)}
              </Text>
            )}
            {entry.measurement && (
              <Body>
                {entry.measurement.value.toLocaleString('de-DE')}{' '}
                {entry.measurement.unit}
                {delta !== null
                  ? ` · Differenz ${delta.toLocaleString('de-DE')} ${entry.measurement.unit}`
                  : ''}
              </Body>
            )}
            {entry.note ? <Body>{entry.note}</Body> : null}
            <Body>
              {entry.attachments.filter((a) => a.kind === 'photo').length} Fotos
              · {entry.attachments.filter((a) => a.kind === 'pdf').length} PDFs
            </Body>
            <View style={styles.row}>
              <Button
                secondary
                title="Bearbeiten / Anhänge"
                disabled={vm.busy}
                onPress={() =>
                  router.push({
                    pathname: '/entry/edit',
                    params: { recordId: id, entryId: entry.id },
                  })
                }
              />
              <Button
                secondary
                title="Einzelprotokoll"
                disabled={vm.busy}
                onPress={() => report(entry.id)}
              />
              <Button
                secondary
                danger
                title="Löschen"
                disabled={vm.busy}
                onPress={() => remove('entry', entry.id)}
              />
            </View>
          </Card>
        );
      })}
      <Pagination offset={vm.offset} total={vm.total} onChange={vm.setOffset} />
      <Heading>Gespeicherte PDF-Protokolle ({vm.reportTotal})</Heading>
      <Button
        title="Gesamtprotokoll erstellen"
        disabled={vm.busy}
        onPress={() => report(null)}
      />
      {vm.busy && <Busy label="Protokoll wird verarbeitet …" />}
      <Notice text={vm.notice} />
      <Notice error text={vm.error} />
      {!vm.reportTotal && <Body>Noch keine gespeicherten Protokolle.</Body>}
      {vm.reports.map((saved) => (
        <Card key={saved.id}>
          <Heading>{saved.name}</Heading>
          <Body>{new Date(saved.createdAt).toLocaleString('de-DE')}</Body>
          <View style={styles.row}>
            <Button
              secondary
              title="Öffnen"
              disabled={vm.busy}
              onPress={() => {
                void vm.open(saved);
              }}
            />
            <Button
              secondary
              title="Teilen"
              disabled={vm.busy}
              onPress={() => {
                void vm.share(saved);
              }}
            />
            <Button
              secondary
              danger
              title="Löschen"
              disabled={vm.busy}
              onPress={() => remove('report', saved.id)}
            />
          </View>
        </Card>
      ))}
      <Pagination
        offset={vm.reportOffset}
        total={vm.reportTotal}
        onChange={vm.setReportOffset}
      />
      <Button
        secondary
        danger
        title="Akte löschen"
        disabled={vm.busy}
        onPress={() => remove('record', id)}
      />
    </Page>
  );
}
function Pagination({
  offset,
  total,
  onChange,
}: {
  offset: number;
  total: number;
  onChange(n: number): void;
}) {
  return total > PAGE_SIZE ? (
    <View style={{ gap: 10 }}>
      <Body>
        Seite {Math.floor(offset / PAGE_SIZE) + 1} von{' '}
        {Math.ceil(total / PAGE_SIZE)}
      </Body>
      <View style={styles.row}>
        <Button
          secondary
          title="Zurück"
          disabled={offset === 0}
          onPress={() => onChange(Math.max(0, offset - PAGE_SIZE))}
        />
        <Button
          secondary
          title="Weiter"
          disabled={offset + PAGE_SIZE >= total}
          onPress={() => onChange(offset + PAGE_SIZE)}
        />
      </View>
    </View>
  ) : null;
}
