# Datenschutzerklärung für Hausakte

Stand: 28. September 2026

Hausakte ist eine App von Wasiliy Strecker, AppFabrik AI. Sie dokumentiert
Wartungen, Reparaturen, Renovierungen, Prüfungen und zugehörige Unterlagen für
Häuser, Wohnungen und Anlagen und verarbeitet die Einträge lokal auf dem Gerät.

## Verantwortlicher und Kontakt

Wasiliy Strecker · AppFabrik AI
E-Mail: contact@appfabrik-ai.de

## Verarbeitete Daten und Zweck

Die App speichert Aktenname, Kategorie, optionalen Standort beziehungsweise
Adresse, Hersteller und Modell, Seriennummer, Einbau- oder Anschaffungsdatum,
Aktivität, optionalen Mess- oder Betriebsstand mit Einheit, Dienstleister,
Kosten, Zeitpunkte, Notizen, Fotos, PDF-Dokumente und freiwillige Erinnerungen.
Dazu kommen lokal gespeicherte Formularentwürfe, erstellte PDF-Protokolle,
Prüfsummen und auf Wunsch verschlüsselte Backups. Die Verarbeitung erfolgt
auf Wunsch des Nutzers zur Bereitstellung dieser App-Funktionen.

Beim Bearbeiten wird der aktuelle Stand ersetzt. Es werden keine neuen
Korrekturverläufe angelegt. Bereits gespeicherte PDF-Protokolle bleiben bei
späteren Änderungen unverändert.

## Verarbeitung auf dem Gerät

Die App betreibt keinen Server und sendet Hausangaben, Fotos, Dokumente oder
Einträge nicht an den Entwickler. Es gibt keine Konten, Werbung, eigene
Nutzungsanalyse oder Cloud-Synchronisation. Fotos werden lokal verkleinert
und ohne Aufnahme- und Standortmetadaten gespeichert. Importierte PDFs werden
unverändert einschließlich vorhandener Dokumentmetadaten gespeichert.
Es findet keine automatische Auswertung von Rechnungsbeträgen oder
Messständen statt.

Der Android-Dokumentscanner verwendet Google ML Kit über Google Play Services.
Die Dokumentverarbeitung erfolgt auf dem Gerät. Beim ersten Aufruf kann
Google Play Services Scannerkomponenten herunterladen. Für die Dienste von
Google gelten deren [Datenschutzbedingungen](https://policies.google.com/privacy).
Die App überträgt gescannte Dokumente nicht an einen eigenen Server.

Google dokumentiert für ML Kit außerdem technische Diagnose- und
Nutzungsmetriken. Dazu gehören Informationen über Gerät und App,
Installations- oder Gerätekennungen, Laufzeiten, verwendete Funktionen und
Fehlercodes. Google nutzt diese Daten zur Diagnose, Wartung und Verbesserung
seiner Dienste. Nach Angaben von Google werden die Übertragungen mit HTTPS
verschlüsselt. Dokumentbilder, erkannter Text und Verarbeitungsergebnisse
werden laut ML-Kit-Dokumentation auf dem Gerät verarbeitet und nicht als
Scaninhalt an Google übertragen.

Der Scanner wird freiwillig gestartet. Vorhandene PDFs lassen sich auch ohne
Scanner importieren. Die lokale Verarbeitung bedeutet nicht, dass die separat
installierten Google Play Services keine technischen Daten übertragen.
Weitere Informationen stehen in den
[ML-Kit-Datenschutzhinweisen](https://developers.google.com/ml-kit/terms) und
[Angaben zur Datensicherheit](https://developers.google.com/ml-kit/android-data-disclosure).

## Teilen und externe Links

Nur wenn Sie selbst eine PDF oder ein Backup speichern, teilen oder drucken,
wird die Datei an den von Ihnen gewählten Speicherort, die gewählte App oder
den Android-Druckdienst übergeben. Dort gelten deren Bedingungen. Die
PDF-Vorschau bleibt innerhalb der App. PDF-Exporte sind unverschlüsselt.
Vorschauseiten und vorbereitete Exportdateien werden vorübergehend im privaten
App-Cache gespeichert.

Die Links zur Datenschutzerklärung und zum Quellcode öffnen das eigene
Hausakte-Repository auf GitHub im externen Browser oder in der GitHub-App.
Dabei gelten die Datenschutzbedingungen von GitHub und des verwendeten
Browsers beziehungsweise der GitHub-App.

## Berechtigungen

Kamera und Fotomediathek werden für selbst angeforderte Fotos verwendet.
Der Dokumentscanner verwendet die Kamerafunktion von Google Play Services.
Benachrichtigungen und gegebenenfalls die Android-Berechtigung für Alarme
ermöglichen freiwillig eingerichtete Erinnerungen. Aktenname und letzte
Aktivität können in einer Benachrichtigung erscheinen. Berechtigungen und die
Anzeige auf dem Sperrbildschirm lassen sich in den Systemeinstellungen ändern.

## Speicherdauer und Löschung

Einträge bleiben im privaten App-Speicher, bis Sie diese in der App löschen,
die App-Daten entfernen oder die App deinstallieren. Beim Löschen einer Akte
werden deren lokale Einträge, Fotos, PDF-Anhänge und PDF-Protokolle entfernt,
sobald Dateien nicht mehr von anderen gespeicherten Daten referenziert werden.
Beim Löschen eines einzelnen Eintrags werden seine Einzelprotokolle entfernt.
Gespeicherte Gesamtprotokolle bleiben erhalten.
Extern gespeicherte oder geteilte Dateien müssen am jeweiligen Speicherort
separat gelöscht werden. Android-Systembackups der privaten App-Daten sind
deaktiviert.

## Backups

Dateien mit der Endung .habackup werden mit Ihrem Passwort und AES-256-GCM
verschlüsselt. Das Passwort wird nicht gespeichert oder an den Entwickler
übertragen und kann nicht wiederhergestellt werden. Die Sicherung enthält
gespeicherte Akten, Einträge, Anhänge und PDF-Protokolle. Formularentwürfe
gehören nicht zum Backup. Bei der Wiederherstellung werden die Inhalte lokal
geprüft und mit vorhandenen Daten zusammengeführt.

## Android- und Entwicklungsversion

Hausakte ist für Android vorgesehen. Die eigenständige Smartphone-Testversion
enthält den App-Code und benötigt keinen Entwicklungsserver. Nur der optionale
Live-Entwicklungsbuild verbindet sich für Fast Refresh mit einem lokalen
Metro-Entwicklungsserver. Debugger und lokale Diagnoseprotokolle sind
Entwicklungswerkzeuge. Hausakte übermittelt keine Nutzungsdaten an einen
eigenen Analysedienst.

## Rechte und Kontakt

Lokal gespeicherte Inhalte können Sie direkt in der App beziehungsweise in
den Systemeinstellungen einsehen, korrigieren und löschen. Fragen zum
Datenschutz richten Sie an den oben genannten Kontakt. Gesetzliche Rechte
auf Auskunft, Berichtigung, Löschung, Einschränkung und Beschwerde bei einer
Datenschutzaufsichtsbehörde bleiben unberührt, soweit sie anwendbar sind.

## Änderungen

Diese Erklärung wird angepasst, wenn sich die Datenverarbeitung ändert.
Die aktuelle Fassung ist im
[Hausakte-Repository](https://github.com/wasiliy-strecker/house-log/blob/main/PRIVACY.md)
öffentlich abrufbar und über die Einstellungen der App erreichbar.
