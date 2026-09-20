import { ActivityField } from './activity-field';
import { PhotoHints } from '../media/photo-hints';
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Body,
  Button,
  Busy,
  Card,
  DateField,
  Field,
  Notice,
  Page,
  SelectField,
} from '../../core/ui/components';
import { units } from '../../core/domain/models';
import {
  PhotoEditor,
  Documents,
  type AttachmentActions,
} from '../media/attachments';
import { useEntryEditor } from './use-entry-editor';
export function EntryEditorScreen() {
  const { recordId, entryId } = useLocalSearchParams<{
    recordId: string;
    entryId?: string;
  }>();
  const vm = useEntryEditor(recordId, entryId);
  const [customUnit, setCustomUnit] = useState(false);
  const draft = vm.draft;
  if (!draft)
    return (
      <Page>
        <Notice error text={vm.error} />
        {!vm.error && <Busy />}
      </Page>
    );
  const form = draft.form,
    photos = form.attachments.filter((a) => a.kind === 'photo'),
    documents = form.attachments.filter((a) => a.kind === 'pdf');
  const actions: AttachmentActions = {
    busy: vm.busy,
    pick: vm.pick,
    remove: vm.remove,
    move: vm.move,
    reorder: vm.reorderKind,
  };
  return (
    <Page>
      <Stack.Screen
        options={{ title: entryId ? 'Eintrag bearbeiten' : 'Eintrag erfassen' }}
      />
      <Notice error text={vm.error} />
      <Notice text={vm.notice} />
      {vm.phase === 'choose' ? (
        <>
          <Card>
            <Body strong style={{ fontSize: 16 }}>
              Veränderungen festhalten
            </Body>
            <View style={{ gap: 4 }}>
              <Body>• Haus, Anlage oder Beleg gut lesbar fotografieren</Body>
              <Body>• Spiegelungen und Schatten vermeiden</Body>
              <Body>• Für Vergleiche einen ähnlichen Blickwinkel wählen</Body>
            </View>
            <Body muted>
              Fotos werden für die lokale Speicherung auf maximal 1920 Pixel
              verkleinert und als JPEG optimiert. Aufnahme- und
              Standortmetadaten werden nicht übernommen. Einen Mess- oder
              Betriebsstand kannst du optional selbst eintragen.
            </Body>
          </Card>
          <PhotoHints disabled={vm.busy} />
          <Button
            icon="edit_note_outlined"
            title="Ohne Foto erfassen"
            disabled={vm.busy}
            onPress={() => void vm.chooseManual()}
          />
          <Button
            secondary
            icon="photo_camera_outlined"
            title="Haus oder Anlage fotografieren"
            disabled={vm.busy}
            onPress={() => void vm.pick('camera')}
          />
          <Button
            secondary
            icon="photo_library_outlined"
            title="Fotos aus Galerie"
            disabled={vm.busy}
            onPress={() => void vm.pick('gallery')}
          />
          <Documents documents={documents} actions={actions} />
        </>
      ) : (
        <View style={{ gap: 16, paddingTop: 8 }}>
          <ActivityField
            value={form.activity}
            suggestions={vm.activities}
            disabled={vm.busy}
            autoFocus={
              !entryId && draft.captureSource === 'manual' && !form.activity
            }
            onChange={(v) => vm.change('activity', v)}
          />
          <PhotoEditor photos={photos} actions={actions} />
          <Documents documents={documents} actions={actions} />
          <SelectField
            label="Einheit des Eintrags"
            icon="straighten"
            value={customUnit ? '__custom' : form.unit}
            options={[...new Set([...units, form.unit])]
              .map((value) => ({ value, label: value }))
              .concat([{ value: '__custom', label: 'Eigene Einheit' }])}
            disabled={vm.busy}
            onChange={(v) => {
              setCustomUnit(v === '__custom');
              if (v !== '__custom') vm.change('unit', v);
            }}
          />
          {customUnit && (
            <Field
              label="Eigene Einheit"
              value={form.unit}
              onChangeText={(v) => vm.change('unit', v)}
              editable={!vm.busy}
            />
          )}
          <Field
            label="Mess- / Betriebsstand (optional)"
            suffix={form.unit}
            keyboardType="decimal-pad"
            value={form.value}
            onChangeText={(v) => vm.change('value', v)}
            editable={!vm.busy}
          />
          <Field
            label="Handwerker / Dienstleister (optional)"
            value={form.provider}
            onChangeText={(v) => vm.change('provider', v)}
            editable={!vm.busy}
          />
          <Field
            label="Kosten (optional)"
            suffix="€"
            keyboardType="decimal-pad"
            value={form.cost}
            onChangeText={(v) => vm.change('cost', v)}
            editable={!vm.busy}
          />
          <Card>
            <Body strong>Datum und Uhrzeit</Body>
            <DateField
              label="Zeitpunkt des Eintrags"
              time
              value={form.occurredAt}
              onChange={(v) => vm.change('occurredAt', v)}
              disabled={vm.busy}
            />
          </Card>
          <Field
            label="Notiz"
            multiline
            value={form.note}
            onChangeText={(v) => vm.change('note', v)}
            editable={!vm.busy}
          />
          <Button
            icon={
              entryId || draft.captureSource !== 'photo'
                ? 'save_outlined'
                : 'verified_outlined'
            }
            title={
              vm.busy
                ? 'Wird gespeichert …'
                : entryId
                  ? 'Änderungen speichern'
                  : draft.captureSource === 'photo'
                    ? 'Eintrag bestätigen und speichern'
                    : 'Eintrag speichern'
            }
            disabled={vm.busy}
            onPress={() => void vm.save()}
          />
        </View>
      )}
      {vm.busy && <Busy label="Eingaben und Anhänge werden verarbeitet …" />}
    </Page>
  );
}
