import { Body, Card, Heading, Page, Title } from '../../core/ui/components';
export function PrivacyScreen() {
  return (
    <Page>
      <Title subtitle="Stand: 20. September 2026">
        Datenschutz bei Hausakte
      </Title>
      <Card>
        <Heading>Lokale Daten</Heading>
        <Body>
          Hausakte speichert Akten, Adressen, Anlagenangaben, Einträge, Kosten,
          Notizen, Fotos, Dokumente, Formularentwürfe und Erinnerungen im
          privaten Speicher der App auf deinem Android-Gerät. Ein Konto ist
          nicht nötig. Die App betreibt keine eigenen Server, Werbung, Analytics
          oder Cloud-Synchronisierung.
        </Body>
      </Card>
      <Card>
        <Heading>Fotos und Dokumente</Heading>
        <Body>
          Die Kamera wird nur nach deiner Auswahl und Freigabe verwendet. Über
          die Systemauswahl bestimmst du selbst, welche Fotos und PDFs
          importiert werden. Fotos werden als JPEG auf höchstens 1920 Pixel
          verkleinert. Aufnahme- und Standortmetadaten werden nicht übernommen.
          Original-PDFs bleiben unverändert und können selbst personenbezogene
          Inhalte und Metadaten enthalten.
        </Body>
      </Card>
      <Card>
        <Heading>Google-Dokumentscanner</Heading>
        <Body>
          Der optionale Android-Scanner verwendet Google ML Kit über Google Play
          Services. Die Dokumentverarbeitung erfolgt auf dem Gerät. Beim ersten
          Start können Scannerkomponenten von Google heruntergeladen werden.
          Google ML Kit übermittelt technische Angaben zu Gerät, App,
          API-Nutzung, Leistung und Fehlern an Google. Dokumentbilder, Texte und
          Ergebnisse werden laut Google nicht an Google-Server gesendet. Für
          Google Play Services gelten zusätzlich Googles
          Datenschutzbestimmungen. Es findet keine Hausakte-Server-KI und keine
          automatische Auswertung von Rechnungsfeldern statt. PDF-Import ist
          auch ohne Scanner nutzbar.
        </Body>
      </Card>
      <Card>
        <Heading>Erinnerungen</Heading>
        <Body>
          Optionale Benachrichtigungen werden mit Android lokal geplant.
          Aktenname und letzte Aktivität können in einer Benachrichtigung
          erscheinen. Du kannst die Anzeige auf dem Sperrbildschirm und die
          Berechtigungen in Android einstellen.
        </Body>
      </Card>
      <Card>
        <Heading>Export und Backup</Heading>
        <Body>
          Erst wenn du Öffnen, Teilen oder Backup speichern auswählst, erhält
          die von dir gewählte andere App Zugriff auf die ausgewählte Datei. Für
          diese App und den gewählten Speicherort gelten deren eigene Regeln.
          PDF-Exporte sind unverschlüsselt. Hausakte-Backups werden mit
          AES-256-GCM und einem aus deinem Passwort abgeleiteten Schlüssel
          verschlüsselt. Das Passwort wird nicht gespeichert.
          Android-Systembackups der App sind deaktiviert.
        </Body>
      </Card>
      <Card>
        <Heading>Löschen</Heading>
        <Body>
          Du kannst Einträge und Akten in der App löschen. Beim Löschen eines
          Eintrags verschwinden seine Einzelprotokolle, während gespeicherte
          Gesamtprotokolle erhalten bleiben. Beim Löschen der ganzen Akte werden
          auch deren gespeicherte Protokolle entfernt. Exportierte Dateien und
          Backups an anderen Orten bleiben unberührt. Eine Deinstallation
          entfernt den privaten App-Speicher.
        </Body>
      </Card>
      <Card>
        <Heading>Entwicklungsversion</Heading>
        <Body>
          Der Dev-Build verbindet sich während der Entwicklung mit einem lokalen
          Metro-Entwicklungsserver. Das ist für Fast Refresh erforderlich.
          Debugger und lokale Diagnoseprotokolle sind Entwicklungswerkzeuge.
          Hausakte übermittelt keine Nutzungsdaten an einen eigenen
          Analysedienst.
        </Body>
      </Card>
    </Page>
  );
}
