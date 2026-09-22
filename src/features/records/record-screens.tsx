import { View, Text } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  BusyOverlay,
  Card,
  Field,
  Heading,
  Page,
  Title,
  Fab,
  IconButton,
  Notice,
  useTheme,
} from '../../core/ui/components';
import { Icon, categoryIcon } from '../../core/ui/icon';
import { useFeedback } from '../../core/ui/feedback';
import { useRecords, useRecordDetail, useReports } from './use-records';
import {
  dateTime,
  entrySummary,
  reminderSummary,
  sortLabels,
  type RecordSort,
} from './presentation-model';
import {
  money,
  PAGE_SIZE,
  type HouseEntry,
  type HouseRecord,
} from '../../core/domain/models';
import type { ReminderStatus } from '../../core/native/house-native';
export function ReminderInfo({
  record,
  status,
}: {
  record: HouseRecord;
  status?: ReminderStatus;
}) {
  const c = useTheme();
  const r = record.reminder;
  const s = status?.schedules.find((s) => s.recordId === record.id);
  if (!r) return null;
  return (
    <View style={{ gap: 6 }}>
      <Body strong style={{ fontSize: 12 }}>
        Erinnern: {reminderSummary(r)}
      </Body>
      <Body muted style={{ fontSize: 12 }}>
        {s?.nextTriggerAtMillis
          ? `Nächste Erinnerung: ${dateTime(s.nextTriggerAtMillis)} Uhr`
          : 'Erinnerung noch nicht bestätigt'}
        {status && !status.notifications ? ' · In Android blockiert' : ''}
        {s?.planningState && s.planningState !== 'scheduled'
          ? ' · Planung prüfen'
          : ''}
        {s?.deliveryFailed ? ' · Zustellfehler' : ''}
      </Body>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: c.soft,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="notifications_active_outlined" size={19} color={c.onSoft} />
        <Body strong style={{ fontSize: 12, color: c.onSoft, flex: 1 }}>
          Letzte Erinnerung:{' '}
          {s?.lastTriggeredAtMillis
            ? `${dateTime(s.lastTriggeredAtMillis)} Uhr`
            : 'noch keine'}
        </Body>
      </View>
    </View>
  );
}
export function RecordsScreen() {
  const vm = useRecords(),
    c = useTheme(),
    feedback = useFeedback();
  const create = () => router.push('/record/edit');
  return (
    <Page
      ready={!vm.loading}
      fab={<Fab title="Akte anlegen" onPress={create} />}
    >
      {vm.loading ? (
        <Busy label="Akten werden geladen …" />
      ) : vm.error ? (
        <>
          <Notice error text={vm.error} />
          <Button title="Erneut laden" onPress={vm.retry} />
        </>
      ) : vm.empty ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 20,
          }}
        >
          <Icon name="house_outlined" size={72} color={c.primary} />
          <Title>Erste Akte anlegen</Title>
          <Body style={{ textAlign: 'center' }}>
            Dokumentiere Wartungen, Reparaturen und Renovierungen für dein Haus,
            deine Wohnung oder eine Anlage. Ergänze Fotos und PDF-Unterlagen und
            setze Erinnerungen. Deine Akten werden lokal auf deinem Gerät
            gespeichert.
          </Body>
        </View>
      ) : (
        <>
          <Title subtitle="Wartungen, Reparaturen und Unterlagen deiner Akten dokumentieren.">
            Deine Akten
          </Title>
          <View style={{ marginTop: 4 }}>
            <Field
              label="Akten suchen"
              leading="search"
              value={vm.search}
              onChangeText={vm.setSearch}
              trailing={vm.search ? 'close' : undefined}
              onTrailingPress={() => vm.setSearch('')}
              returnKeyType="search"
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Body muted>
              {vm.items.length}{' '}
              {vm.search ? 'Treffer' : vm.items.length === 1 ? 'Akte' : 'Akten'}
            </Body>
            <Button
              secondary
              icon="sort"
              menu
              title={sortLabels[vm.sort]}
              onPress={(anchor) =>
                void feedback
                  .choose({
                    title: 'Akten sortieren',
                    anchor,
                    options: (Object.keys(sortLabels) as RecordSort[]).map(
                      (value) => ({
                        value,
                        label: sortLabels[value],
                        icon: value === vm.sort ? 'check' : undefined,
                      }),
                    ),
                  })
                  .then((value) => {
                    if (value) vm.setSort(value as RecordSort);
                  })
              }
            />
          </View>
          {!vm.items.length && (
            <Card>
              <Icon name="search" size={42} color={c.primary} />
              <Body>Keine passenden Akten gefunden.</Body>
            </Card>
          )}
          {vm.items.map(({ record, latest, lastEdited }) => (
            <Card
              key={record.id}
              onPress={() =>
                router.push({
                  pathname: '/record/[id]',
                  params: { id: record.id },
                })
              }
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c.primary + '1F',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name={categoryIcon(record.category)}
                    color={c.primary}
                  />
                  {vm.status?.schedules.find((s) => s.recordId === record.id)
                    ?.isNotificationActive && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -2,
                        top: -4,
                        backgroundColor: c.danger,
                        borderRadius: 10,
                        paddingHorizontal: 5,
                      }}
                    >
                      <Text style={{ color: c.background, fontSize: 11 }}>
                        1
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Body strong style={{ fontSize: 16, lineHeight: 24 }}>
                    {record.name}
                  </Body>
                  <Body muted>
                    {[record.category, record.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </Body>
                  <Text
                    style={{
                      fontFamily: 'RobotoBlack',
                      fontSize: 22,
                      lineHeight: 28,
                      color: c.ink,
                      marginTop: 2,
                    }}
                  >
                    {entrySummary(latest)}
                  </Text>
                  <Body muted style={{ fontSize: 12, lineHeight: 16 }}>
                    Zuletzt bearbeitet: {dateTime(lastEdited)}
                  </Body>
                  {vm.drafts.some((d) => d.recordId === record.id) && (
                    <Body muted style={{ fontSize: 12 }}>
                      Gesicherter Formularentwurf
                    </Body>
                  )}
                  <ReminderInfo record={record} status={vm.status} />
                </View>
                <Icon name="chevron_right" />
              </View>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
export function HistoryTile({
  entry,
  delta,
}: {
  entry: HouseEntry;
  delta?: number | null;
}) {
  const c = useTheme();
  return (
    <Card
      onPress={() =>
        router.push({ pathname: '/entry/[id]', params: { id: entry.id } })
      }
      style={{ padding: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon
          name={
            entry.attachments.some((a) => a.kind === 'photo')
              ? 'photo_camera_outlined'
              : 'edit_note_outlined'
          }
          color={c.primary}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Body strong style={{ fontSize: 16 }}>
            {entrySummary(entry)}
          </Body>
          <Body muted>{dateTime(entry.occurredAt)}</Body>
          {!!entry.provider && <Body muted>{entry.provider}</Body>}
          {entry.costCents !== null && (
            <Body>Kosten: {money(entry.costCents)}</Body>
          )}
          {delta !== null && delta !== undefined && (
            <Body muted>
              Differenz: {delta.toLocaleString('de-DE')}{' '}
              {entry.measurement?.unit}
            </Body>
          )}
          {entry.attachments.length > 0 && (
            <Body muted>
              {entry.attachments.filter((a) => a.kind === 'photo').length} Fotos
              · {entry.attachments.filter((a) => a.kind === 'pdf').length} PDFs
            </Body>
          )}
        </View>
        <Icon name="chevron_right" />
      </View>
    </Card>
  );
}
export function Pager({
  offset,
  total,
  onChange,
}: {
  offset: number;
  total: number;
  onChange(n: number): void;
}) {
  return total > PAGE_SIZE ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <IconButton
        icon="chevron_left"
        label="Vorherige Seite"
        disabled={offset === 0}
        onPress={() => onChange(Math.max(0, offset - PAGE_SIZE))}
      />
      <Body>
        Seite {Math.floor(offset / PAGE_SIZE) + 1} von{' '}
        {Math.ceil(total / PAGE_SIZE)}
      </Body>
      <IconButton
        icon="chevron_right"
        label="Nächste Seite"
        disabled={offset + PAGE_SIZE >= total}
        onPress={() => onChange(offset + PAGE_SIZE)}
      />
    </View>
  ) : null;
}
export function Reports({
  recordId,
  entryId = null,
  hasAttachments,
}: {
  recordId: string;
  entryId?: string | null;
  hasAttachments: boolean;
}) {
  const vm = useReports(recordId, entryId, hasAttachments),
    c = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Card style={{ backgroundColor: c.soft }}>
        <View
          style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
        >
          <Icon name="description_outlined" color={c.onSoft} />
          <View style={{ flex: 1, gap: 4 }}>
            <Body strong style={{ color: c.onSoft }}>
              Hausprotokoll {entryId ? 'dieses Eintrags' : 'der gesamten Akte'}
            </Body>
            <Body style={{ color: c.onSoft }}>
              Einträge und Unterlagen als gespeichertes PDF zusammenstellen.
            </Body>
          </View>
        </View>
        <Button
          icon="description_outlined"
          title="Hausprotokoll als PDF erstellen"
          disabled={vm.busy}
          onPress={() => void vm.create()}
        />
      </Card>
      <Notice error text={vm.error} />
      <Body strong>Gespeicherte Hausprotokolle ({vm.total})</Body>
      {!vm.total && <Body muted>Noch keine Hausprotokolle gespeichert.</Body>}
      {vm.reports.map((r) => (
        <Card key={r.id} onPress={() => vm.open(r)} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="description_outlined" color={c.primary} />
            <View style={{ flex: 1, gap: 4 }}>
              <Body strong>
                {entryId ? 'Einzelner Eintrag' : 'Gesamte Akte'}
              </Body>
              <Body muted>
                {r.full
                  ? 'Mit Fotos und PDF-Dokumenten'
                  : 'Kompakt ohne Anhänge'}
                {'\n'}
                {dateTime(r.createdAt)}
              </Body>
            </View>
            <IconButton
              icon="delete_outline"
              label="Protokoll löschen"
              onPress={() => void vm.remove(r)}
            />
            <Icon name="chevron_right" />
          </View>
        </Card>
      ))}
      <Pager offset={vm.offset} total={vm.total} onChange={vm.setOffset} />
      <BusyOverlay visible={vm.busy} label="Hausprotokoll wird verarbeitet …" />
    </View>
  );
}
export function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = useRecordDetail(id),
    c = useTheme(),
    feedback = useFeedback();
  const r = vm.record;
  const edit = () => router.push({ pathname: '/record/edit', params: { id } });
  const capture = () =>
    router.push({ pathname: '/entry/edit', params: { recordId: id } });
  if (!r)
    return (
      <Page ready={!vm.loading}>
        <Notice error text={vm.error} />
        {vm.loading ? <Busy /> : <Body>Akte nicht gefunden.</Body>}
      </Page>
    );
  return (
    <Page
      ready={!vm.loading}
      fab={
        <Fab
          title="Eintrag erfassen"
          icon="add_a_photo_outlined"
          onPress={capture}
        />
      }
    >
      <Stack.Screen options={{ title: r.name }} />
      <Card onPress={edit} style={{ margin: 4, padding: 17, gap: 0 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: c.primary + '1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={categoryIcon(r.category)} color={c.primary} />
          </View>
          <Body
            strong
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 24,
              letterSpacing: 0.15,
            }}
          >
            {r.category || 'Akte'}
          </Body>
          <Icon name="chevron_right" color={c.muted} />
        </View>
        <Body
          style={{
            marginTop: 14,
            fontFamily: 'RobotoBlack',
            fontSize: 28,
            lineHeight: 36,
            letterSpacing: 0,
          }}
        >
          {entrySummary(vm.entries[0] ?? null)}
        </Body>
        {!!vm.entries[0] && (
          <Body>Zuletzt am {dateTime(vm.entries[0].occurredAt)}</Body>
        )}
        <View style={{ marginTop: 10 }}>
          {!!r.location && <Body>Standort / Adresse: {r.location}</Body>}
          {!!(r.manufacturer || r.model) && (
            <Body>
              Hersteller / Modell:{' '}
              {[r.manufacturer, r.model].filter(Boolean).join(' · ')}
            </Body>
          )}
          {!!r.serial && <Body>Seriennummer: {r.serial}</Body>}
          {!!r.installedOn && (
            <Body>
              Einbau / Anschaffung:{' '}
              {new Date(r.installedOn).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Body>
          )}
          {!!r.note && <Body>{r.note}</Body>}
          <ReminderInfo record={r} status={vm.status} />
        </View>
      </Card>
      <View style={{ gap: 12 }}>
        <Button
          secondary
          icon="edit_outlined"
          title="Akte & Erinnerung bearbeiten"
          onPress={edit}
        />
        <Button
          secondary
          danger
          icon="delete_outline"
          title="Akte löschen"
          disabled={vm.busy}
          onPress={() =>
            void feedback
              .confirm(
                'Akte löschen?',
                'Die Akte, ihre Einträge und gespeicherten Protokolle werden gelöscht. Exportierte Dateien bleiben erhalten.',
              )
              .then((ok) => {
                if (ok) void vm.remove();
              })
          }
        />
      </View>
      <Notice error text={vm.error} />
      {vm.total > 0 && (
        <Reports recordId={id} hasAttachments={vm.hasAttachments} />
      )}
      <View style={{ marginTop: vm.total > 0 ? 6 : 18, gap: 8 }}>
        <Heading>Aktenverlauf</Heading>
        {vm.total > 0 && (
          <Body>
            {vm.total === 1
              ? '1 Eintrag'
              : `${vm.entries.length} von ${vm.total} Einträgen`}
          </Body>
        )}
        {!vm.total && (
          <Card
            onPress={capture}
            style={{ margin: 4, padding: 23, gap: 0, alignItems: 'center' }}
          >
            <Icon name="add_a_photo_outlined" size={44} color={c.primary} />
            <Body style={{ marginTop: 10, textAlign: 'center' }}>
              Noch kein Eintrag. Halte Wartungen, Reparaturen und Renovierungen
              mit Fotos, PDFs oder Notizen fest.
            </Body>
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Body
                strong
                style={{ color: c.primary, textAlign: 'center', flexShrink: 1 }}
              >
                Ersten Eintrag erfassen
              </Body>
              <Icon name="chevron_right" color={c.primary} />
            </View>
          </Card>
        )}
      </View>
      {vm.entries.map((e) => (
        <HistoryTile key={e.id} entry={e} delta={vm.deltas[e.id]} />
      ))}
      {vm.total > PAGE_SIZE && (
        <Button
          secondary
          icon="manage_search_outlined"
          title="Alle Einträge anzeigen"
          onPress={() =>
            router.push({ pathname: '/record/history', params: { id } })
          }
        />
      )}
    </Page>
  );
}
export function RecordHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = useRecordDetail(id, true),
    c = useTheme();
  return (
    <Page
      ready={!vm.loading}
      top={
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
            gap: 12,
            backgroundColor: c.background,
          }}
        >
          <Body strong>{vm.record?.name ?? ''}</Body>
          <Field
            label="Einträge suchen"
            leading="search"
            value={vm.search}
            onChangeText={vm.setSearch}
            trailing={vm.search ? 'close' : undefined}
            onTrailingPress={() => vm.setSearch('')}
          />
        </View>
      }
      bottom={
        <Pager offset={vm.offset} total={vm.total} onChange={vm.setOffset} />
      }
    >
      <Stack.Screen options={{ title: 'Aktenverlauf' }} />
      <Notice error text={vm.error} />
      {vm.loading ? (
        <Busy />
      ) : (
        <>
          <Body strong>
            {vm.total === 0
              ? 'Keine Einträge gefunden'
              : `${vm.offset + 1}–${Math.min(vm.offset + PAGE_SIZE, vm.total)} von ${vm.total} ${vm.search ? 'Treffern' : 'Einträgen'}`}
          </Body>
          {vm.entries.map((e) => (
            <HistoryTile key={e.id} entry={e} delta={vm.deltas[e.id]} />
          ))}
        </>
      )}
    </Page>
  );
}
