import { useState } from 'react';
import { Alert, Image, Modal, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  NestableDraggableFlatList,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import ImageViewing from 'react-native-image-viewing';
import {
  Body,
  Button,
  Busy,
  Card,
  Choices,
  DateField,
  Field,
  Heading,
  Notice,
  Page,
  Title,
  colors,
  styles,
} from '../../core/ui/components';
import { units, type Attachment } from '../../core/domain/models';
import { useEntryEditor } from './use-entry-editor';

export function EntryEditorScreen() {
  const { recordId, entryId } = useLocalSearchParams<{
    recordId: string;
    entryId?: string;
  }>();
  const vm = useEntryEditor(recordId, entryId);
  const [gallery, setGallery] = useState<number | null>(null);
  const [actionItem, setActionItem] = useState<Attachment | null>(null);
  const draft = vm.draft;
  if (!draft)
    return (
      <Page>
        <Notice error text={vm.error} />
        {!vm.error && <Busy />}
      </Page>
    );
  const form = draft.form;
  const photos = form.attachments.filter((a) => a.kind === 'photo');
  const documents = form.attachments.filter((a) => a.kind === 'pdf');
  function menu(item: Attachment) {
    setActionItem(item);
  }
  function row({ item, drag, isActive }: RenderItemParams<Attachment>) {
    return (
      <View
        style={{
          backgroundColor: isActive ? '#D2E8E1' : '#FFF',
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.kind === 'photo'
              ? `Foto ${item.name} ansehen. Lange drücken zum Sortieren.`
              : `PDF ${item.name} öffnen. Lange drücken zum Sortieren.`
          }
          disabled={vm.busy}
          onLongPress={drag}
          delayLongPress={300}
          onPress={() =>
            item.kind === 'photo'
              ? setGallery(photos.findIndex((p) => p.id === item.id))
              : void vm.open(item)
          }
          style={{ gap: 10 }}
        >
          {item.kind === 'photo' && (
            <Image
              source={{ uri: vm.uri(item) }}
              style={{ height: 150, width: '100%', borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
          <Text style={styles.text}>{item.name}</Text>
          {item.pages && (
            <Text style={styles.subtitle}>
              {item.pages} {item.pages === 1 ? 'Seite' : 'Seiten'}
            </Text>
          )}
        </Pressable>
        <Button
          secondary
          title="Anhang-Aktionen"
          disabled={vm.busy || isActive}
          onPress={() => menu(item)}
        />
      </View>
    );
  }
  return (
    <Page nested>
      <Stack.Screen
        options={{ headerBackVisible: !vm.busy, gestureEnabled: !vm.busy }}
      />
      <Title subtitle={vm.recordName}>
        {entryId ? 'Eintrag bearbeiten' : 'Eintrag erfassen'}
      </Title>
      <Notice error text={vm.error} />
      <Notice text={vm.notice} />
      <Field
        label="Aktivität *"
        editable={!vm.busy}
        value={form.activity}
        onChangeText={(v) => vm.change('activity', v)}
        placeholder="Was wurde gemacht?"
      />
      <Choices
        values={vm.activities}
        selected={form.activity}
        onSelect={(v) => {
          if (!vm.busy) vm.change('activity', v);
        }}
      />
      <DateField
        time
        label="Datum und Uhrzeit"
        value={form.occurredAt}
        onChange={(v) => {
          if (!vm.busy) vm.change('occurredAt', v);
        }}
      />
      <Field
        label="Handwerker / Dienstleister"
        editable={!vm.busy}
        value={form.provider}
        onChangeText={(v) => vm.change('provider', v)}
      />
      <Field
        label="Kosten in Euro"
        editable={!vm.busy}
        value={form.cost}
        onChangeText={(v) => vm.change('cost', v)}
        keyboardType="decimal-pad"
        placeholder="Optional, zum Beispiel 123,45"
      />
      <Field
        label="Mess- / Betriebsstand"
        editable={!vm.busy}
        value={form.value}
        onChangeText={(v) => vm.change('value', v)}
        keyboardType="decimal-pad"
        placeholder="Optional, zum Beispiel 1200"
      />
      <Field
        label="Einheit des Messwerts"
        editable={!vm.busy}
        value={form.unit}
        onChangeText={(v) => vm.change('unit', v)}
      />
      <Choices
        values={units}
        selected={form.unit}
        onSelect={(v) => {
          if (!vm.busy) vm.change('unit', v);
        }}
      />
      <Field
        label="Notiz"
        editable={!vm.busy}
        multiline
        value={form.note}
        onChangeText={(v) => vm.change('note', v)}
      />
      <Card>
        <Heading>Fotos ({photos.length})</Heading>
        <Body>
          {photos.length
            ? 'Lange drücken und ziehen zum Sortieren. Alternativ die Anhang-Aktionen verwenden. Tippen öffnet die Galerie mit Wischen und Vergrößern.'
            : 'Noch keine Fotos. Du kannst Kamera und Galerie kombinieren.'}
        </Body>
        <NestableDraggableFlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={row}
          onDragEnd={({ data }) => vm.setAttachments([...data, ...documents])}
        />
        <View style={styles.row}>
          <Button
            secondary
            title="Kamera"
            disabled={vm.busy}
            onPress={() => {
              void vm.pick('camera');
            }}
          />
          <Button
            secondary
            title="Galerie auswählen"
            disabled={vm.busy}
            onPress={() => {
              void vm.pick('gallery');
            }}
          />
        </View>
        <Text style={styles.subtitle}>
          Fotos werden auf höchstens 1920 Pixel verkleinert. Aufnahme- und
          Standortmetadaten werden entfernt.
        </Text>
      </Card>
      <Card>
        <Heading>PDF-Dokumente ({documents.length})</Heading>
        <Body>
          {documents.length
            ? 'Lange drücken und ziehen oder über die Anhang-Aktionen verschieben.'
            : 'Noch keine PDFs. Rechnungen, Anleitungen oder Prüfberichte hier hinzufügen.'}
        </Body>
        <NestableDraggableFlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={row}
          onDragEnd={({ data }) => vm.setAttachments([...photos, ...data])}
        />
        <View style={styles.row}>
          <Button
            secondary
            title="PDF auswählen"
            disabled={vm.busy}
            onPress={() => {
              void vm.pick('pdf');
            }}
          />
          <Button
            secondary
            title="Dokument scannen"
            disabled={vm.busy}
            onPress={() => {
              void vm.pick('scanner');
            }}
          />
        </View>
        <Text style={styles.subtitle}>
          Scan mit bis zu 20 Seiten. Beim ersten Start kann Google Play Services
          Scannerkomponenten herunterladen.
        </Text>
      </Card>
      {vm.busy && (
        <Busy label="Bitte kurz warten. Der Entwurf ist gesichert …" />
      )}
      <Notice error text={vm.error} />
      <Button
        title={entryId ? 'Änderungen speichern' : 'Eintrag speichern'}
        disabled={vm.busy}
        onPress={() => {
          void vm.save();
        }}
      />
      <Button
        secondary
        title="Entwurf verwerfen"
        disabled={vm.busy}
        onPress={() =>
          Alert.alert(
            'Entwurf verwerfen?',
            'Nur neue, ungespeicherte Eingaben und Anhänge werden verworfen. Bereits gespeicherte Dateien bleiben erhalten.',
            [
              { text: 'Weiter bearbeiten', style: 'cancel' },
              {
                text: 'Verwerfen',
                style: 'destructive',
                onPress: () => {
                  void vm.discard();
                },
              },
            ],
          )
        }
      />
      <Modal
        visible={!!actionItem}
        animationType="slide"
        onRequestClose={() => setActionItem(null)}
      >
        {actionItem && (
          <Page>
            <Title>{actionItem.name}</Title>
            <Button
              secondary
              title="Schließen"
              onPress={() => setActionItem(null)}
            />
            <Button
              title={
                actionItem.kind === 'photo'
                  ? 'Aus Galerie ersetzen'
                  : 'PDF ersetzen'
              }
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                void vm.pick(
                  item.kind === 'photo' ? 'gallery' : 'pdf',
                  item.id,
                );
              }}
            />
            {actionItem.kind === 'photo' && (
              <Button
                secondary
                title="Mit Kamera ersetzen"
                onPress={() => {
                  const item = actionItem;
                  setActionItem(null);
                  void vm.pick('camera', item.id);
                }}
              />
            )}
            <Button
              secondary
              title="Teilen"
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                void vm.share(item);
              }}
            />
            <Button
              secondary
              title="Nach vorne"
              onPress={() => {
                vm.move(actionItem.id, -1);
                setActionItem(null);
              }}
            />
            <Button
              secondary
              title="Nach hinten"
              onPress={() => {
                vm.move(actionItem.id, 1);
                setActionItem(null);
              }}
            />
            <Button
              secondary
              danger
              title="Entfernen"
              onPress={() => {
                vm.setAttachments(
                  form.attachments.filter((a) => a.id !== actionItem.id),
                );
                setActionItem(null);
              }}
            />
          </Page>
        )}
      </Modal>
      <ImageViewing
        images={photos.map((a) => ({ uri: vm.uri(a) }))}
        imageIndex={gallery ?? 0}
        visible={gallery !== null}
        onRequestClose={() => setGallery(null)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        FooterComponent={({ imageIndex }) => (
          <Text style={{ color: '#FFF', textAlign: 'center', padding: 24 }}>
            Foto {imageIndex + 1} von {photos.length}
          </Text>
        )}
      />
    </Page>
  );
}
