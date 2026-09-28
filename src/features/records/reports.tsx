import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ActionRow,
  Body,
  Button,
  Busy,
  BusyOverlay,
  Card,
  IconButton,
  Notice,
  useTheme,
} from '../../core/ui/components';
import { Icon } from '../../core/ui/icon';
import { PAGE_SIZE, type SavedReport } from '../../core/domain/models';
import { dateTime } from './presentation-model';
import { useReports } from './use-records';

function ReportCard({
  report,
  summary,
  available,
  busy,
  deleting,
  onOpen,
  onDelete,
}: {
  report: SavedReport;
  summary: string;
  available: boolean;
  busy: boolean;
  deleting: boolean;
  onOpen(): void;
  onDelete(): void;
}) {
  const c = useTheme();
  const backgroundColor = available ? c.soft : c.errorContainer;
  const color = available ? c.onSoft : c.onErrorContainer;
  return (
    <Card
      onPress={available && !busy ? onOpen : undefined}
      style={[s.reportCard, { backgroundColor: c.secondaryContainer }]}
    >
      <View style={[s.pdfIcon, { backgroundColor }]}>
        <Icon
          name={available ? 'picture_as_pdf_outlined' : 'file_present_outlined'}
          color={color}
        />
      </View>
      <View style={s.reportBody}>
        <Body style={[s.reportTitle, { color: c.onSecondaryContainer }]}>
          Hausprotokoll ·{' '}
          {report.entryId ? 'Einzelner Eintrag' : 'Aktenverlauf'}
        </Body>
        <Body style={{ color: c.onSecondaryContainer, marginTop: 3 }}>
          Erstellt am {dateTime(report.createdAt)} Uhr
        </Body>
        <Body strong style={{ color: c.onSecondaryContainer, marginTop: 4 }}>
          {summary}
          {'\n'}
          {report.full ? 'Mit Fotos und PDFs' : 'Kompakt ohne Anhänge'}
        </Body>
        <View style={[s.status, { backgroundColor }]}>
          <Icon
            name={available ? 'verified_outlined' : 'error_outline'}
            size={17}
            color={color}
          />
          <Text numberOfLines={1} style={[s.statusText, { color }]}>
            {available ? 'Lokal gespeichert' : 'Datei fehlt'}
          </Text>
        </View>
      </View>
      <View style={s.deleteAction}>
        {deleting ? (
          <ActivityIndicator
            accessibilityLabel="Protokoll wird gelöscht"
            color={c.primary}
          />
        ) : (
          <IconButton
            icon="delete_outline"
            label="Hausprotokoll löschen"
            color={c.danger}
            disabled={busy}
            onPress={onDelete}
          />
        )}
      </View>
    </Card>
  );
}

export function Reports({
  recordId,
  entryId = null,
  hasAttachments,
  summary,
}: {
  recordId: string;
  entryId?: string | null;
  hasAttachments: boolean;
  summary: string;
}) {
  const vm = useReports(recordId, entryId, hasAttachments);
  const c = useTheme();
  const saved = (
    <View>
      {vm.loading || (!vm.availableFiles && !vm.loadError) ? (
        <Busy label="PDF-Dateien werden geprüft …" />
      ) : vm.loadError ? (
        <View style={s.loadError}>
          <Notice error text={vm.loadError} />
          <Button textOnly title="Erneut versuchen" onPress={vm.retry} />
        </View>
      ) : (
        <>
          {vm.reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              summary={summary}
              available={vm.availableFiles?.has(report.file) === true}
              busy={vm.busy}
              deleting={vm.deletingId === report.id}
              onOpen={() => vm.open(report)}
              onDelete={() => void vm.remove(report)}
            />
          ))}
          {vm.total > PAGE_SIZE && (
            <View style={{ gap: 8 }}>
              <Body style={{ textAlign: 'center' }}>
                Seite {Math.floor(vm.offset / PAGE_SIZE) + 1} von{' '}
                {Math.ceil(vm.total / PAGE_SIZE)}
              </Body>
              <ActionRow>
                {[
                  <Button
                    key="previous"
                    secondary
                    title="Zurück"
                    icon="chevron_left"
                    disabled={vm.offset === 0 || vm.busy}
                    onPress={() => vm.setOffset(vm.offset - PAGE_SIZE)}
                  />,
                  <Button
                    key="next"
                    secondary
                    title="Weiter"
                    icon="chevron_right"
                    disabled={vm.offset + PAGE_SIZE >= vm.total || vm.busy}
                    onPress={() => vm.setOffset(vm.offset + PAGE_SIZE)}
                  />,
                ]}
              </ActionRow>
            </View>
          )}
        </>
      )}
    </View>
  );
  return (
    <View style={entryId ? { marginTop: 8 } : undefined}>
      {!!entryId && (
        <Body strong style={s.heading}>
          Gespeicherte Hausprotokolle
        </Body>
      )}
      <Card style={[s.createCard, { backgroundColor: c.secondaryContainer }]}>
        <View style={s.purposeRow}>
          <Icon name="picture_as_pdf_outlined" color={c.onSecondaryContainer} />
          <View style={{ flex: 1, gap: 4 }}>
            <Body strong style={{ color: c.onSecondaryContainer }}>
              {entryId
                ? 'Hausprotokoll dieses Eintrags'
                : 'Hausprotokoll · Aktenverlauf'}
            </Body>
            <Body style={{ color: c.onSecondaryContainer }}>
              {entryId
                ? 'Du wählst vor dem Erstellen: kompakt ohne Anhänge oder mit aktuellen Fotos und PDFs. Eintrag, Zeitpunkt und Notizen sind in beiden Varianten enthalten – zum Speichern, Drucken oder Teilen.'
                : 'Die PDF bündelt alle Einträge der Akte mit Messständen und Notizen. Du wählst: kompakt ohne Anhänge oder mit aktuellen Fotos und PDFs jedes Eintrags – zum Speichern, Drucken oder Teilen.'}
            </Body>
          </View>
        </View>
        <Button
          icon="picture_as_pdf_outlined"
          title={
            entryId
              ? 'Hausprotokoll als PDF erstellen'
              : 'Hausprotokoll für den Aktenverlauf erstellen'
          }
          disabled={vm.busy}
          onPress={() => void vm.create()}
        />
      </Card>
      {!!vm.error && <Notice error text={vm.error} />}
      {entryId ? (
        <View style={{ marginTop: vm.total ? 12 : 0 }}>{saved}</View>
      ) : vm.total > 0 || vm.loading || vm.loadError ? (
        <Card style={s.historySection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: vm.expanded }}
            onPress={() => vm.setExpanded(!vm.expanded)}
            android_ripple={{ color: c.primary + '22' }}
            style={s.historyHeading}
          >
            <Icon name="folder_copy_outlined" color={c.primary} />
            <View style={{ flex: 1 }}>
              <Body strong style={s.sectionTitle}>
                Gespeicherte Hausprotokolle
              </Body>
              <Body>
                {vm.loadError
                  ? 'Hausprotokolle konnten nicht geladen werden'
                  : vm.loading
                    ? 'Hausprotokolle werden geladen …'
                    : `${vm.total} ${vm.total === 1 ? 'Hausprotokoll' : 'Hausprotokolle'}`}
              </Body>
            </View>
            <Icon
              name={vm.expanded ? 'expand_less' : 'expand_more'}
              color={c.muted}
            />
          </Pressable>
          {vm.expanded && <View style={s.historyChildren}>{saved}</View>}
        </Card>
      ) : null}
      <BusyOverlay
        visible={vm.busy && !vm.deletingId}
        label="Hausprotokoll wird verarbeitet …"
      />
    </View>
  );
}

const s = StyleSheet.create({
  heading: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    marginBottom: 8,
  },
  createCard: { margin: 4, padding: 15, gap: 14 },
  purposeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reportCard: {
    padding: 13,
    marginBottom: 10,
    gap: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pdfIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBody: { flex: 1, marginLeft: 10, marginRight: 4 },
  reportTitle: {
    fontFamily: 'RobotoBlack',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    maxWidth: '100%',
  },
  statusText: {
    fontFamily: 'RobotoBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  deleteAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: { margin: 4, marginTop: 14, padding: 0, gap: 0 },
  historyHeading: {
    minHeight: 80,
    paddingHorizontal: 15,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionTitle: { fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  historyChildren: { paddingHorizontal: 7, paddingBottom: 7 },
  loadError: { padding: 16, gap: 8 },
});
