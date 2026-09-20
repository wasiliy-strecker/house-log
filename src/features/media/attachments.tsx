import { useState } from 'react';
import { Image, Pressable, View, Text } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Body,
  Button,
  Card,
  IconButton,
  useTheme,
} from '../../core/ui/components';
import { Icon } from '../../core/ui/icon';
import { Sortable } from '../../core/ui/sortable';
import { useServices } from '../../core/composition';
import { useFeedback, type MenuAnchor } from '../../core/ui/feedback';
import type { Attachment, EntryDraft } from '../../core/domain/models';
type Source = NonNullable<EntryDraft['external']>;
export type AttachmentActions = {
  busy: boolean;
  pick: (source: Source, replaceId?: string) => Promise<unknown>;
  remove: (id: string) => void;
  move: (id: string, delta: number) => void;
  reorder: (items: Attachment[]) => void;
};
function PhotoThumbnail(props: React.ComponentProps<typeof Image>) {
  const [failed, setFailed] = useState(false),
    c = useTheme();
  return failed ? (
    <View
      style={[
        props.style,
        { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
      ]}
    >
      <Icon name="error_outline" color={c.danger} />
      <Body>Foto nicht verfügbar</Body>
    </View>
  ) : (
    <Image {...props} onError={() => setFailed(true)} />
  );
}
export function PhotoGallery({
  photos,
  actions,
}: {
  photos: Attachment[];
  actions?: AttachmentActions;
}) {
  const { house } = useServices();
  const c = useTheme(),
    feedback = useFeedback(),
    safe = useSafeAreaInsets();
  const [gallery, setGallery] = useState<number | null>(null),
    [page, setPage] = useState(0);
  async function menu(a: Attachment, index: number, anchor?: MenuAnchor) {
    const selected = await feedback.choose({
      title: `Foto ${index + 1} bearbeiten`,
      anchor,
      options: [
        {
          value: 'earlier',
          label: 'Nach vorne',
          icon: 'chevron_left',
          disabled: index === 0,
        },
        {
          value: 'later',
          label: 'Nach hinten',
          icon: 'chevron_right',
          disabled: index + 1 === photos.length,
        },
        { value: 'replace', label: 'Foto ersetzen', icon: 'image_outlined' },
        {
          value: 'remove',
          label: 'Foto entfernen',
          icon: 'delete_outline',
          danger: true,
        },
      ],
    });
    if (selected === 'earlier') actions?.move(a.id, -1);
    if (selected === 'later') actions?.move(a.id, 1);
    if (selected === 'remove') actions?.remove(a.id);
    if (selected === 'replace') {
      const source = await feedback.choose({
        title: 'Foto ersetzen',
        options: [
          {
            value: 'camera',
            label: 'Neu fotografieren',
            icon: 'photo_camera_outlined',
          },
          {
            value: 'gallery',
            label: 'Aus Galerie wählen',
            icon: 'photo_library_outlined',
          },
        ],
      });
      if (source) await actions?.pick(source as Source, a.id);
    }
  }
  function show(index: number) {
    setPage(index);
    setGallery(index);
  }
  return (
    <>
      {!photos.length ? (
        <Body>Keine aktuellen Fotos</Body>
      ) : (
        <Sortable
          items={photos}
          columns={photos.length === 1 ? 1 : 2}
          disabled={actions?.busy}
          onReorder={actions?.reorder}
          render={(a, index, canTap) => (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Foto ${index + 1} von ${photos.length} ansehen`}
                disabled={actions?.busy}
                onPress={() => {
                  if (canTap()) show(index);
                }}
              >
                <PhotoThumbnail
                  accessibilityLabel={`Foto ${index + 1}`}
                  source={{ uri: house.vault.uri(a.file) }}
                  resizeMethod="resize"
                  resizeMode="contain"
                  style={{
                    aspectRatio: 4 / 3,
                    width: '100%',
                    borderRadius: 14,
                    backgroundColor: c.input,
                  }}
                />
              </Pressable>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 48,
                }}
              >
                <Body style={{ textAlign: 'center', flex: 1 }}>
                  Foto {index + 1}
                </Body>
                {actions && (
                  <IconButton
                    icon="more_vert"
                    menu
                    label={`Foto ${index + 1} bearbeiten`}
                    disabled={actions.busy}
                    onPress={(anchor) => void menu(a, index, anchor)}
                  />
                )}
              </View>
            </View>
          )}
        />
      )}
      <ImageViewing
        images={photos.map((a) => ({ uri: house.vault.uri(a.file) }))}
        imageIndex={gallery ?? 0}
        visible={gallery !== null}
        backgroundColor={c.background}
        swipeToCloseEnabled={false}
        onRequestClose={() => setGallery(null)}
        onImageIndexChange={setPage}
        HeaderComponent={({ imageIndex }) => (
          <View style={{ paddingTop: safe.top, backgroundColor: c.background }}>
            <View
              style={{
                height: 56,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <IconButton
                icon="arrow_back"
                label="Fotogalerie schließen"
                onPress={() => setGallery(null)}
              />
              <Text
                style={{ fontFamily: 'Roboto', fontSize: 22, color: c.ink }}
              >
                Foto {imageIndex + 1} von {photos.length}
              </Text>
            </View>
          </View>
        )}
        FooterComponent={() => (
          <View
            style={{
              paddingBottom: safe.bottom,
              backgroundColor: c.background,
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
            }}
          >
            <IconButton
              icon="chevron_left"
              label="Vorheriges Foto"
              disabled={page === 0}
              onPress={() => show(page - 1)}
            />
            <Body>
              {page + 1} / {photos.length}
            </Body>
            <IconButton
              icon="chevron_right"
              label="Nächstes Foto"
              disabled={page + 1 === photos.length}
              onPress={() => show(page + 1)}
            />
          </View>
        )}
      />
    </>
  );
}
export function PhotoEditor({
  photos,
  actions,
}: {
  photos: Attachment[];
  actions: AttachmentActions;
}) {
  return (
    <Card style={{ padding: 14, overflow: 'visible' }}>
      <Body strong style={{ fontSize: 16 }}>
        Aktuelle Fotos ({photos.length})
      </Body>
      {photos.length > 1 && (
        <Body>
          Zum Sortieren ein Foto länger gedrückt halten und verschieben.
        </Body>
      )}
      <PhotoGallery photos={photos} actions={actions} />
      <Button
        secondary
        icon="add_a_photo_outlined"
        title={photos.length ? 'Weiteres Foto aufnehmen' : 'Foto aufnehmen'}
        disabled={actions.busy}
        onPress={() => void actions.pick('camera')}
      />
      <Button
        secondary
        icon="photo_library_outlined"
        title="Fotos aus Galerie hinzufügen"
        disabled={actions.busy}
        onPress={() => void actions.pick('gallery')}
      />
    </Card>
  );
}
export function Documents({
  documents,
  actions,
}: {
  documents: Attachment[];
  actions?: AttachmentActions;
}) {
  const c = useTheme(),
    feedback = useFeedback();
  async function add(replaceId?: string) {
    const source = await feedback.choose({
      title: replaceId ? 'Dokument ersetzen' : 'PDF hinzufügen',
      options: [
        {
          value: 'pdf',
          label: 'PDF auswählen',
          icon: 'upload_file_outlined',
          description: replaceId
            ? undefined
            : 'Mehrere PDFs: Erste Datei länger gedrückt halten, dann weitere auswählen.',
        },
        {
          value: 'scanner',
          label: 'Dokument scannen',
          icon: 'document_scanner_outlined',
          description: 'Mehrere Seiten als eine PDF erfassen',
        },
      ],
    });
    if (source) await actions?.pick(source as Source, replaceId);
  }
  async function menu(a: Attachment, index: number, anchor?: MenuAnchor) {
    const action = await feedback.choose({
      title: 'Dokument bearbeiten',
      anchor,
      options: [
        {
          value: 'earlier',
          label: 'Nach vorne',
          icon: 'chevron_left',
          disabled: index === 0,
        },
        {
          value: 'later',
          label: 'Nach hinten',
          icon: 'chevron_right',
          disabled: index + 1 === documents.length,
        },
        {
          value: 'replace',
          label: 'Dokument ersetzen',
          icon: 'description_outlined',
        },
        {
          value: 'remove',
          label: 'Dokument entfernen',
          icon: 'delete_outline',
          danger: true,
        },
      ],
    });
    if (action === 'earlier') actions?.move(a.id, -1);
    if (action === 'later') actions?.move(a.id, 1);
    if (action === 'remove') actions?.remove(a.id);
    if (action === 'replace') await add(a.id);
  }
  return (
    <Card style={{ padding: 14, overflow: 'visible' }}>
      <Body strong style={{ fontSize: 16 }}>
        Aktuelle PDFs ({documents.length})
      </Body>
      {!!documents.length && (
        <Body>
          {documents.reduce((n, a) => n + (a.pages ?? 0), 0)} PDF-Seiten ·{' '}
          {(documents.reduce((n, a) => n + a.size, 0) / 1000000).toFixed(1)} MB
        </Body>
      )}
      {actions && <Body muted>Maximal 50 MB je PDF</Body>}
      {documents.length > 1 && actions && (
        <Body>
          Zum Sortieren eine PDF länger gedrückt halten und verschieben.
        </Body>
      )}
      {!documents.length ? (
        <Body>Keine aktuellen PDF-Dokumente</Body>
      ) : (
        <Sortable
          items={documents}
          onReorder={actions?.reorder}
          disabled={actions?.busy}
          render={(a, index, canTap) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 64,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`PDF ${a.name} öffnen`}
                disabled={actions?.busy}
                onPress={() => {
                  if (canTap())
                    router.push({
                      pathname: '/pdf/[id]',
                      params: { id: a.id },
                    });
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 8,
                }}
              >
                <Icon name="description_outlined" color={c.primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Body style={{ fontSize: 16 }}>{a.name}</Body>
                  <Body muted>
                    {a.pages} {a.pages === 1 ? 'Seite' : 'Seiten'}
                  </Body>
                </View>
              </Pressable>
              {actions && (
                <IconButton
                  icon="more_vert"
                  menu
                  label={`Dokument ${index + 1} bearbeiten`}
                  disabled={actions.busy}
                  onPress={(anchor) => void menu(a, index, anchor)}
                />
              )}
            </View>
          )}
        />
      )}
      {actions && (
        <Button
          secondary
          icon="upload_file_outlined"
          title="PDF hinzufügen oder scannen"
          disabled={actions.busy}
          onPress={() => void add()}
        />
      )}
    </Card>
  );
}
