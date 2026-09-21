import { View, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  Card,
  Notice,
  Page,
  useTheme,
} from '../../core/ui/components';
import { money } from '../../core/domain/models';
import { dateTime, entrySummary } from '../records/presentation-model';
import { Reports } from '../records/record-screens';
import { PhotoGallery, Documents } from '../media/attachments';
import { useEntryDetail } from './use-entry-detail';
export function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = useEntryDetail(id),
    c = useTheme();
  const e = vm.entry;
  if (!e)
    return (
      <Page>
        <Notice error text={vm.error} />
        {vm.loading ? <Busy /> : <Body>Eintrag nicht gefunden.</Body>}
      </Page>
    );
  const photos = e.attachments.filter((a) => a.kind === 'photo');
  return (
    <Page>
      <Stack.Screen options={{ title: 'Eintrag' }} />
      {!!photos.length && (
        <View style={{ gap: 8 }}>
          <Body strong style={{ fontSize: 16 }}>
            Aktuelle Fotos ({photos.length})
          </Body>
          <PhotoGallery photos={photos} />
        </View>
      )}
      <Text
        style={{
          fontFamily: 'RobotoBlack',
          fontSize: 36,
          lineHeight: 44,
          color: c.ink,
        }}
      >
        {entrySummary(e)}
      </Text>
      <Body>
        {vm.record?.category} · {vm.record?.name}
      </Body>
      <View style={{ gap: 12, marginTop: 4, marginBottom: 6 }}>
        <Button
          secondary
          icon="edit_outlined"
          title="Bearbeiten"
          onPress={() =>
            router.push({
              pathname: '/entry/edit',
              params: { recordId: e.recordId, entryId: id },
            })
          }
        />
        <Button
          secondary
          danger
          icon="delete_outline"
          title="Eintrag löschen"
          disabled={vm.busy}
          onPress={() => void vm.remove()}
        />
      </View>
      <Notice error text={vm.error} />
      <Card>
        <Body strong>Eintragsinformationen</Body>
        <Body>{dateTime(e.occurredAt)}</Body>
        {!!e.provider && <Body>Dienstleister: {e.provider}</Body>}
        {e.costCents !== null && <Body>Kosten: {money(e.costCents)}</Body>}
        {!!e.note && <Body>{e.note}</Body>}
        <Body muted style={{ fontSize: 12 }}>
          Zuletzt bearbeitet: {dateTime(e.updatedAt)}
        </Body>
      </Card>
      <Documents documents={e.attachments.filter((a) => a.kind === 'pdf')} />
      <Reports
        recordId={e.recordId}
        entryId={e.id}
        hasAttachments={!!e.attachments.length}
      />
    </Page>
  );
}
