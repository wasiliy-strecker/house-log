import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { PhotoViewer } from './photo-viewer';
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
  const feedback = useFeedback();
  const [gallery, setGallery] = useState<number | null>(null);
  async function menu(a: Attachment, index: number, anchor?: MenuAnchor) {
    const selected = await feedback.choose({
      title: `Foto ${index + 1} bearbeiten`,
      anchor,
      optionStyle: 'plain',
      options: [
        ...(photos.length > 1
          ? [
              {
                value: 'earlier',
                label: 'Nach vorne',
                disabled: index === 0,
              },
              {
                value: 'later',
                label: 'Nach hinten',
                disabled: index + 1 === photos.length,
              },
            ]
          : []),
        { value: 'replace', label: 'Foto ersetzen' },
        {
          value: 'remove',
          label: 'Foto entfernen',
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
          preview={(a) => (
            <PhotoThumbnail
              source={{ uri: house.vault.uri(a.file) }}
              resizeMode="contain"
              style={{ width: '100%', aspectRatio: 4 / 3 }}
            />
          )}
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
      {gallery !== null && (
        <PhotoViewer
          images={photos.map((a) => ({
            id: a.id,
            uri: house.vault.uri(a.file),
          }))}
          initialIndex={gallery}
          close={() => setGallery(null)}
        />
      )}
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
    <Card style={{ margin: 4, padding: 13, gap: 0, overflow: 'visible' }}>
      <Body
        strong
        style={{ fontSize: 16, lineHeight: 24, letterSpacing: 0.15 }}
      >
        Aktuelle Fotos ({photos.length})
      </Body>
      {photos.length > 1 && (
        <Body style={{ marginTop: 6 }}>
          Zum Sortieren ein Foto länger gedrückt halten und verschieben.
        </Body>
      )}
      <View style={{ marginTop: 10 }}>
        <PhotoGallery photos={photos} actions={actions} />
      </View>
      <View style={{ marginTop: 12, gap: 8 }}>
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
      </View>
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
      optionStyle: 'cards',
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
      optionStyle: 'plain',
      options: [
        ...(documents.length > 1
          ? [
              { value: 'earlier', label: 'Nach vorne', disabled: index === 0 },
              {
                value: 'later',
                label: 'Nach hinten',
                disabled: index + 1 === documents.length,
              },
            ]
          : []),
        { value: 'replace', label: 'Dokument ersetzen' },
        { value: 'remove', label: 'Dokument entfernen' },
      ],
    });
    if (action === 'earlier') actions?.move(a.id, -1);
    if (action === 'later') actions?.move(a.id, 1);
    if (action === 'remove') actions?.remove(a.id);
    if (action === 'replace') await add(a.id);
  }
  return (
    <Card style={{ margin: 4, padding: 13, gap: 0, overflow: 'visible' }}>
      <Body
        strong
        style={{ fontSize: 16, lineHeight: 24, letterSpacing: 0.15 }}
      >
        Aktuelle PDFs ({documents.length})
      </Body>
      <Body style={{ marginTop: 6 }}>
        {documents.reduce((n, a) => n + (a.pages ?? 0), 0)} PDF-Seiten ·{' '}
        {(documents.reduce((n, a) => n + a.size, 0) / 1000000).toFixed(1)} MB
      </Body>
      {actions && <Body>Maximal 50 MB je PDF</Body>}
      {documents.length > 1 && actions && (
        <Body style={{ marginTop: 6 }}>
          Zum Sortieren eine PDF länger gedrückt halten und verschieben.
        </Body>
      )}
      <View style={{ marginTop: 10 }}>
        {!documents.length ? (
          <Body>Keine aktuellen PDFs</Body>
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
                      {a.source
                        ? ` · ${a.source === 'scanned' ? 'Gescannt' : 'Importiert'}`
                        : ''}
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
      </View>
      {actions && (
        <View style={{ marginTop: 12 }}>
          <Button
            secondary
            icon="upload_file_outlined"
            title="PDF hinzufügen oder scannen"
            disabled={actions.busy}
            onPress={() => void add()}
          />
        </View>
      )}
    </Card>
  );
}
