import { View, type ViewProps } from 'react-native';
import { requireNativeView } from 'expo';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActionRow,
  Button,
  Busy,
  IconButton,
  Notice,
  Page,
  SelectField,
  useTheme,
} from '../../core/ui/components';
import { usePdfPreview } from './use-pdf-preview';

const DocumentView = requireNativeView<ViewProps & { session: string }>(
  'HouseNative',
);
export function PdfPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vm = usePdfPreview(id),
    c = useTheme();
  const pdf = vm.pdf;
  const partCount = pdf?.parts[0]?.partCount ?? 1;
  const multipart = partCount > 1;
  return (
    <Page
      ready={!vm.loading}
      scroll={false}
      bottom={
        pdf?.kind === 'report' ? (
          <>
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
                  title={multipart ? 'Diesen Teil teilen' : 'Teilen'}
                  disabled={vm.busy}
                  onPress={() => void vm.share()}
                />,
              ]}
            </ActionRow>
            {multipart && (
              <Button
                title="Alle teilen"
                icon="share_outlined"
                disabled={vm.busy || pdf.parts.length !== partCount}
                onPress={() => void vm.shareAll()}
              />
            )}
          </>
        ) : undefined
      }
    >
      <Stack.Screen
        options={{
          title:
            pdf?.kind === 'attachment'
              ? pdf.name
              : multipart
                ? `Hausprotokoll · ${partCount} Teile`
                : 'Hausprotokoll',
          headerRight:
            pdf?.kind === 'attachment'
              ? () => (
                  <IconButton
                    icon="share_outlined"
                    label="PDF teilen"
                    onPress={() => void vm.share()}
                  />
                )
              : undefined,
        }}
      />
      {multipart && pdf && (
        <View style={{ padding: 12, gap: 8 }}>
          <SelectField
            label="PDF-Teil auswählen"
            value={pdf.id}
            disabled={vm.busy || vm.loading}
            options={pdf.parts.map((part) => ({
              value: part.id,
              label: `Teil ${part.partIndex} von ${part.partCount}`,
            }))}
            onChange={vm.selectPart}
          />
          {pdf.parts.length !== partCount && (
            <Notice text="Ein Teil dieses Protokolls wurde gelöscht. Die vorhandenen Teile kannst du einzeln öffnen und teilen." />
          )}
        </View>
      )}
      {!!vm.error && (
        <View style={{ padding: 12, gap: 8 }}>
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
          <DocumentView
            session={pdf.preview.session}
            style={{ flex: 1, backgroundColor: c.background }}
          />
        )
      )}
    </Page>
  );
}
