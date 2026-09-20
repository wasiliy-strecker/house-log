import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  PixelRatio,
  Pressable,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import ImageViewing from 'react-native-image-viewing';
import {
  ActionRow,
  Body,
  Button,
  Busy,
  IconButton,
  Notice,
  Page,
  useTheme,
} from '../../core/ui/components';
import type { OpenPdf } from '../../core/pdf/viewer-service';
import { usePdfPreview } from './use-pdf-preview';
const viewabilityConfig = { itemVisiblePercentThreshold: 1 };
function PdfPage({
  pdf,
  index,
  width,
  visible,
  render,
  zoom,
}: {
  pdf: OpenPdf;
  index: number;
  width: number;
  visible: boolean;
  render: (pdf: OpenPdf, i: number, w: number) => Promise<string>;
  zoom: (uri: string) => void;
}) {
  const [uri, setUri] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const p = pdf.preview.pages[index]!;
  useEffect(() => {
    let active = true;
    if (visible) {
      render(pdf, index, Math.round(Math.min(2048, width * PixelRatio.get())))
        .then((v) => {
          if (active) {
            setUri(v);
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('Diese Seite konnte nicht dargestellt werden.');
        });
    }
    return () => {
      active = false;
    };
  }, [pdf, index, width, render, visible, retry]);
  return (
    <View style={{ gap: 6, marginBottom: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`PDF-Seite ${index + 1} vergrößern`}
        disabled={!uri || !!error}
        onPress={() => zoom(uri)}
        style={{
          width,
          height: (width * p.height) / p.width,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {error ? (
          <>
            <Notice error text={error} />
            <Button
              secondary
              title="Erneut versuchen"
              onPress={() => setRetry((n) => n + 1)}
            />
          </>
        ) : uri ? (
          <Image
            source={{ uri }}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : visible ? (
          <Busy label={`Seite ${index + 1} wird geladen …`} />
        ) : null}
      </Pressable>
      <Body muted style={{ textAlign: 'center', fontSize: 12 }}>
        Seite {index + 1} von {pdf.preview.pages.length}
      </Body>
    </View>
  );
}
export function PdfPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = usePdfPreview(id),
    c = useTheme();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState([0, 1]),
    [zoom, setZoom] = useState<string | null>(null);
  const callback = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) =>
      setVisible(
        viewableItems.flatMap((v) =>
          v.index === null ? [] : [v.index - 1, v.index, v.index + 1],
        ),
      ),
    [],
  );
  const pdf = vm.pdf;
  const pageWidth = Math.min(width - 32, 768);
  const openZoom = useCallback((uri: string) => setZoom(uri), []);
  return (
    <Page
      scroll={false}
      bottom={
        pdf?.kind === 'report' ? (
          <ActionRow>
            {[
              <Button
                key="print"
                secondary
                icon="print_outlined"
                title="Drucken"
                disabled={vm.busy}
                onPress={() => void vm.print()}
              />,
              <Button
                key="share"
                icon="ios_share_outlined"
                title="Teilen"
                disabled={vm.busy}
                onPress={() => void vm.share()}
              />,
            ]}
          </ActionRow>
        ) : undefined
      }
    >
      <Stack.Screen
        options={{
          title: pdf?.kind === 'attachment' ? pdf.name : 'Hausprotokoll',
          headerRight:
            pdf?.kind === 'attachment'
              ? () => (
                  <IconButton
                    icon="ios_share_outlined"
                    label="PDF teilen"
                    onPress={() => void vm.share()}
                  />
                )
              : undefined,
        }}
      />
      {!!vm.error && (
        <View style={{ padding: 16, gap: 8 }}>
          <Notice error text={vm.error} />
          {!pdf && (
            <Button secondary title="Erneut versuchen" onPress={vm.retry} />
          )}
        </View>
      )}
      {vm.loading ? (
        <Busy label="PDF wird geöffnet …" />
      ) : (
        pdf && (
          <FlatList
            key={pdf.preview.session}
            data={pdf.preview.pages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ alignItems: 'center', padding: 16 }}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={5}
            onViewableItemsChanged={callback}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ index }) => (
              <PdfPage
                pdf={pdf}
                index={index}
                width={pageWidth}
                visible={visible.includes(index)}
                render={vm.render}
                zoom={openZoom}
              />
            )}
          />
        )
      )}
      <ImageViewing
        images={zoom ? [{ uri: zoom }] : []}
        imageIndex={0}
        visible={!!zoom}
        backgroundColor={c.background}
        onRequestClose={() => setZoom(null)}
        HeaderComponent={() => (
          <View style={{ paddingTop: 32, backgroundColor: c.background }}>
            <IconButton
              icon="arrow_back"
              label="PDF-Vergrößerung schließen"
              onPress={() => setZoom(null)}
            />
          </View>
        )}
      />
    </Page>
  );
}
