# Prüfprotokoll Hausakte

Fortlaufendes Prüfprotokoll. Automatisierte Tests verwenden ausschließlich
synthetische Dokumente und Testdaten. Visuelle Vergleiche am Nutzergerät sind
in den jeweiligen Abschnitten gesondert beschrieben.
Dieses Protokoll unterscheidet automatisierte Tests, tatsächliche Android-Prüfungen
und noch offene Gerätetests. Ein erfolgreicher Build ersetzt keine Scannerprüfung.

## PDF-Abgleich vom 27.09.2026

Die aktuelle Fahrzeug-Verlaufs-PDF und ein gespeichertes Einzelprotokoll wurden
lokal mit Poppler gerendert und angesehen. Die bisherige Hausakte-PDF wurde auf
dem entsperrten HONOR in der internen Vorschau auf beiden Seiten angesehen.
Vier neu erzeugte synthetische Hausakte-Ausgaben decken Einzel-/Verlaufsprotokoll
und kompakt/vollständig ab. Gerenderte Seiten wurden mit der Fahrzeug-Vorlage
verglichen. Schriftdateien sind bytegleich mit deren Roboto Regular und Bold.

Gezielt automatisiert bestanden:

- Fünf vorhandene Prüfungen unter „Real PDF processing“ mit echten PDF-Dateien,
  Dateispeicher und SQLite. Originaltext, Querformat, Zuordnung der Anhänge,
  bytegleiche Originale und ältere Protokolle, beschädigte/geschützte Dateien,
  Prüfsummen-/Seitenzahlfehler und Bereinigung nach Speicherfehlern.
- Drei neue Layout-Prüfungen mit echten PDFs und Poppler. Beide Protokollarten
  und Ausgabevarianten, gemeinsamer Seitenaufbau, gepaarte Fotos, Originalseiten,
  mehrzeilige Standorte, 100 Notizzeilen, 30 Verlaufseinträge, wiederholte
  Tabellenköpfe, Text innerhalb der Seitenränder und vergleichbare Messwerte.

Reproduktion ohne vollständige Testsuite:

```bash
npx vitest run tests/workflows.test.ts -t 'Real PDF processing'
HAUSAKTE_PDF_REVIEW_DIR=/tmp/hausakte-pdf-review npx vitest run tests/pdf-layout.test.ts
```

Die optionale Umgebungsvariable legt ausschließlich synthetische Muster-PDFs im
angegebenen lokalen Verzeichnis ab. Auf Nutzerwunsch keine umfangreiche Testsuite
oder erneute Scanner-, Backup- und Erinnerungsabnahme für diese Layoutänderung.
Der Android-Testhelfer verwendet ebenfalls die neuen Schriften und die angepasste
Seitenzahl seines Musters. Sein vollständiger Ablauf wurde hier nicht erneut
ausgeführt.

Manuelle Abnahme durch den Nutzer: Für eine vorhandene Akte ein neues kompaktes
und vollständiges Verlaufsprotokoll sowie beide Einzelprotokolle erzeugen.
Stammdaten, Kosten, mehrzeiligen Standort, Fotoreihenfolge und Zuordnung der
Original-PDF-Seiten vergleichen. Ein zuvor gespeichertes Protokoll erneut öffnen
und dessen unveränderten alten Inhalt prüfen.

Formatprüfung, ESLint und TypeScript strict bestanden. `npm run build:preview`
erfolgreich. Die eigenständige Dev-APK wurde nach Prüfung von Kennung, Version,
fehlendem Debug-Flag, Installer und übereinstimmendem Zertifikat datenbewahrend
auf dem HONOR BVL-N49 aktualisiert und gestartet. Version bleibt 1.0.0 (1),
Paket `com.appfactory.house_log.dev`. Fahrzeugakte und Emulator unverändert.

Auf dem HONOR wurde ein neues vollständiges Verlaufsprotokoll der vorhandenen
Akte erzeugt. Die native Vorschau zeigt zwei Seiten mit neuem Tabellenlayout,
Roboto-Schrift, Eintragsdaten und Foto. Beide Seiten wurden angesehen. Das ist
eine kurze reale Android-Kontrolle, keine vollständige erneute Geräteabnahme.
Einzelprotokolle und mehrseitige Originalanhänge wurden für diese Änderung mit
den beschriebenen synthetischen PDFs lokal geprüft. Deren zusätzliche visuelle
Abnahme auf dem Smartphone übernimmt der Nutzer.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-pdf-layout-20260927-1925.apk`.

## UX-Abgleich am 20.09.2026 abends

Referenz Fahrzeugakte `78abe02`. Sicherungs-Commit vor Änderungen `28ee63d`.
Die vier Smartphone-Vergleichsbilder wurden lokal angesehen. Kein privates
Screenshot wurde ins Repository übernommen.

Automatisch bestanden sind Formatprüfung, ESLint, TypeScript strict und 45 Tests.
Fünf zusätzliche Tests decken Übersichtssortierung mit echten SQLite-Daten,
Entwurfsphasen, Anhänge außerhalb der Vorschauseite, Sortierung und die
Integritätsprüfung vor interner PDF-Vorschau und Druck ab. Native JVM-Tests:
37 bestanden, keine Fehler oder übersprungenen Tests. Zusätzlich bestanden
Expo Doctor mit 20/20 Prüfungen, Android-Hermes-Export und Dev-APK-Build.

Die Dev-APK wurde nach Paket-, Versions-, Debug-, Installer- und Zertifikatsprüfung
mit `adb install -r -t -g --no-streaming` auf den Emulator Android 15/API 35 und
das HONOR BVL-N49 mit Android 16 aktualisiert. Keine Deinstallation oder Löschung
privater Daten. Fahrzeugakte wurde weder verändert noch neu installiert.
Die laufende Hausakte-Metro-Sitzung verwendet weiterhin Port 8083.

Der erweiterte isolierte Android-Datentest bestand auf beiden Geräten. Er verwendet
echte Expo-SQLite-Dateien, native Fotooptimierung, PDF-Prüfung, neun gerenderte
Vorschauseiten, Querformat, Cache-Verdrängung und erneutes Laden, native PBKDF2-
Ableitung, AES-Backup, Wiederherstellung und erneute Datenbanköffnung. Originale
und ältere Protokolle bleiben bytegleich. Ergebniszeiten UTC:
Emulator `2026-09-20T20:11:47.642Z`, HONOR `2026-09-20T20:15:18.368Z`.

Zusätzlich tatsächlich im Emulator bedient:

- Akte anlegen, Eintrag ohne Foto mit Kosten und Dienstleister erfassen, separate
  Eintragsdetailseite öffnen, bearbeiten und Galerieauswahl abbrechen.
- Gespeichertes Protokoll intern anzeigen. Android-Druckdialog mit zwei sichtbaren
  Seiten öffnen. Es wurde kein physischer Druckauftrag gesendet.
- Passwortdialog, Android-Speicherortauswahl abbrechen, erneut speichern und den
  erfolgreichen Export als echte `.habackup`-Datei im Download-Verzeichnis prüfen.
- Zwei synthetische Fotos importieren. Reihenfolge per langer Berührung und Ziehen
  ändern. SQLite-Entwurf vor und nach der Geste vergleichen. Menüaktion „Nach hinten“
  prüfen. Großansicht öffnen und mit korrekter Seitenzählung zum zweiten Foto wischen.
- Hell- und Dunkelmodus prüfen. Auf dem HONOR Startseite und Aktenformular mit den
  Fahrzeugakte-Screenshots vergleichen und Eingaberahmen sowie Titelabstände angleichen.

Bei den ersten Automationsläufen mussten Wartezeiten für die externe Galerie und
Treffer auf gruppierte Android-Buttons korrigiert werden. Während Fast Refresh
neu startende Testläufe wurden nicht als erfolgreich gewertet. Der Testhelfer ist
an die neue Bildschirmfolge angepasst.

Auf Nutzerwunsch wurden weitere umfangreiche Tests am Ende eingestellt. Der letzte
zusammenhängende UI-Smoke-Lauf fand nach dem Anlegen den nächsten Erfassungsbutton
nicht rechtzeitig. Dieser Automationslauf gilt ausdrücklich als nicht bestanden.
Die oben einzeln bedienten Abläufe und beide isolierten Android-Datentests sind
separat bestanden. Die abschließende manuelle Bedienabnahme übernimmt der Nutzer.

Offen bleiben ein physischer Drucker, vollständige neue Kamera-/Scanner-Aufnahmen
im Rahmen dieser UI-Änderung und ein Pixel-für-Pixel-Golden-Test beider Frameworks.
Die vorhandenen Scanner- und Erinnerungsprüfungen der Erstimplementierung stehen
unten. Die neue Oberfläche übernimmt Struktur, Theme und Bedienabläufe. Hausfelder
und Android-Systemdialoge enthalten weiterhin die fachlich passenden Unterschiede.

## Erstimplementierung am 20.09.2026 vormittags

Die folgenden Ergebnisse dokumentieren den vorherigen Basisstand. Der damalige
Drag-Listen-Patch wurde beim UX-Abgleich durch ein app-lokales Raster ersetzt.

## Automatisiert bestanden

| Prüfung                                                             | Ergebnis                                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run check`                                                     | Formatprüfung, ESLint, TypeScript strict und 40 Tests bestanden                                 |
| `npx expo-doctor`                                                   | 20 von 20 aktivierten Prüfungen bestanden                                                       |
| `npm audit --audit-level=low`                                       | Keine gemeldeten Schwachstellen                                                                 |
| `npx expo export --platform android --output-dir build/metro-check` | Android-Hermes-Bundle erfolgreich erzeugt                                                       |
| `:house-native:testDebugUnitTest`                                   | 35 Tests, keine Fehler und keine übersprungenen Tests                                           |
| `:app:assembleDevDebug`                                             | Erfolgreiche native APK für arm64-v8a und x86_64                                                |
| `zipalign -c -P 16 4`                                               | APK-Ausrichtung erfolgreich geprüft                                                             |
| Android-Variantentasks                                              | Store Release vorhanden. Store Debug und DebugOptimized gesperrt                                |
| Installationshelfer                                                 | Neue Installation und Update mit Zertifikatsvergleich erfolgreich                               |
| Shell-Syntax und Dependency-Patch                                   | Beide Shell-Helfer syntaktisch gültig. Fabric-Patch wiederholt ohne weitere Änderung ausführbar |

Die Doctor-Ausnahme für versionierte Android-Projekte ist in der README erklärt.
Node 22 meldet SQLite noch als experimentell. Vitest meldet eine künftige Änderung
seines Konfigurationsladers. Beide Hinweise verhindern die aktuellen Prüfungen nicht.

Die TypeScript-Tests verwenden echte SQLite-Dateien, Migrationen und Transaktionen.
Sie prüfen CRUD, Pflichtfelder, freie Aktivitäten, exakte Centbeträge, Suche,
Seitengröße zehn, Messwertvergleich unabhängig von sichtbarer Seite und Suche,
gesicherte Entwürfe, Anhangaustausch, Sortierung und Abbruch. Durch echte
SQLite-Trigger ausgelöste Speicher- und Löschfehler erhalten bestehende Daten
und Dateien. Nachgelagerte Erinnerungsfehler machen einen Commit nicht rückgängig.

PDF-Tests übernehmen echte Originalseiten. Poppler prüft separat Text,
Seitenreihenfolge und Querformat. Tests prüfen außerdem unveränderte Originalbytes,
unveränderte ältere Protokolle, leere, beschädigte, abgeschnittene und geschützte
Dokumente sowie fehlende, veränderte und falsch gezählte Anhänge.

Der zusammenhängende Integrationstest erstellt eine Akte und einen Eintrag mit
Kosten, Foto und zwei PDFs. Er bearbeitet und sortiert den Eintrag, erstellt ein
vollständiges Protokoll, verschlüsselt ein Backup und stellt es in einer zweiten
echten Datenbank wieder her. Weitere Tests prüfen falsches Passwort, Manipulation,
unvollständige authentifizierte Inhalte, SQL-Fehler, teilweise gescheiterte
Dateivorbereitung, neuere lokale Änderungen und vorhandene Entwürfe. Node Crypto
mit OpenSSL entschlüsselt ein Backup unabhängig von Noble.

Die Kotlin-Tests decken Kalenderintervalle, Monatsende, Schaltjahr, Zeitzonen,
Alarm- und Berechtigungszustände, Wiederplanung, Benachrichtigungskanäle,
Testbenachrichtigungen, Scanner-Rückgabetoken und die native Passwortableitung ab.
Robolectric simuliert Android API 24, 25 und 35. Das ist kein tatsächlicher
Geräteneustart und kein Google-Scannerlauf.

## Tatsächlich im Android-Emulator geprüft

Pixel-Tablet-AVD mit Android 15 / API 35, x86_64, `emulator-5556`.
Metro auf Port 8083. Vorhandene andere Apps und Dateien wurden nicht entfernt.

Die Dev-Diagnose führte am 20.09.2026 um 12:18 CEST den vollständigen Ablauf mit
Expo SQLite und privaten Android-Dateien aus. Ergebnis `success: true` in
`build/validation/android-check-result.json`. Darin bestätigt sind native
Fotooptimierung auf 1920 Pixel ohne EXIF, native PDF-Prüfung einschließlich
Passwortschutz, Entwurfserhalt nach Datenbank-Neuöffnung, Bearbeiten und Sortieren,
vollständiges Protokoll mit neun Seiten, unveränderte ältere Protokolle,
Unicode-PBKDF2-Abgleich mit OpenSSL, verschlüsselter Backup-Roundtrip und
Wiederherstellung nach erneuter Datenbank-Neuöffnung.

Zusätzlich wurden über die tatsächliche Oberfläche geprüft:

- Akte mit Standort anlegen, Eintrag mit Tätigkeit, Dienstleister, Notiz und
  123,45 Euro speichern und erneut bearbeiten.
- Galerie abbrechen und ein synthetisches Foto über die Systemauswahl importieren.
  Foto-Großansicht öffnen und schließen.
- Zwei PDFs gemeinsam über Androids Dokumentauswahl importieren. Durch langes
  Drücken und Ziehen umsortieren. Über das Aktionsmenü erneut umsortieren.
- Kompaktes und vollständiges Gesamtprotokoll erfolgreich speichern.
- Google-Scanner aufrufen. Während der externen Activity ausschließlich den
  Hausakte-Prozess mit `run-as ... kill -9 <pid>` beenden. Anschließend die App
  neu öffnen. Eingaben, Foto, zwei PDFs und deren Reihenfolge wurden aus dem
  dauerhaften Entwurf wiederhergestellt. Der unterbrochene Scan wurde gemeldet.
  PDF-Auswahl und Speichern funktionierten anschließend weiter.
- Lokale Testbenachrichtigung auslösen. Androids NotificationManager bestätigte
  die tatsächlich zugestellte Benachrichtigung im Hausakte-Kanal.
- Benachrichtigungsberechtigung im Emulator widerrufen. Der erneute Test zeigte
  verständlich die fehlende Berechtigung. Danach die ursprüngliche Freigabe
  wiederherstellen.
- Übersicht mit 150 Prozent Systemschrift visuell prüfen. Texte und Schaltflächen
  blieben lesbar. Danach den ursprünglichen Wert 100 Prozent wiederherstellen.
  Screenshot unter `build/validation/overview-font150.png`.

Der reproduzierbare grundlegende UI-Ablauf steht in
`scripts/android-ui-smoke.py`. Er lässt sich nur gegen einen Emulator ausführen
und legt zusätzliche synthetische Datensätze an. Medienauswahl, Ziehgesten und
Prozessabbruch wurden zusätzlich über ADB und die reale Oberfläche geprüft.

## Angeschlossenes Telefon

HONOR BVL-N49 mit Android 16. Vor der Installation existierte kein Hausakte-Dev-Paket.
Paketkennung, Version 1.0.0 / Code 1, Debug-Flag und Installer wurden geprüft.
Installation mit `adb install -r -t -g --no-streaming` war erfolgreich.
Die App wurde mit Metro verbunden gestartet. Ihr Android-Prozess lief.

Das Telefon war gesperrt. Es wurde weder entsperrt noch als visuell oder mit
Kamera und Scanner getestet ausgegeben. Keine andere Installation wurde ersetzt.
Es gab keine Deinstallation, Datenlöschung oder Übernahme fremder Signierschlüssel.

## Konkrete offene Prüfungen und Grenzen

Der Google-Scanner erreichte im Emulator die Google-Play-Services-Activity für den
erstmaligen Komponenten-Download. Diese meldete „Something went wrong“ und
„Try again later“. Daher ist eine erfolgreiche Aufnahme einschließlich mehrerer
Seiten, Zuschneiden, Drehen und Bereinigen auf einem geeigneten Gerät noch offen.
Abbruch, Prozessverlust und der unabhängige PDF-Import sind geprüft.

Eine echte Kameraaufnahme, mehrere Fotos mit Wisch- und Pinch-Gesten und die
Übergabe an verschiedene externe PDF-Anzeige- und Speicher-Apps müssen noch auf
einem entsperrten Gerät geprüft werden. Hausakte verwendet zum Öffnen von PDFs
eine installierte PDF-App und meldet deren Fehlen verständlich.

Kalender- und Lifecycle-Regeln sind nativ automatisiert geprüft. Ein tatsächlicher
Neustart des Telefons, Zeitzonenwechsel mit fälligem Alarm und herstellerspezifische
Energiesparregeln wurden nicht praktisch durchgespielt. Die Zustellung einer
Testbenachrichtigung und der Berechtigungswiderruf wurden im Emulator geprüft.

Browser, iOS, Play-Upload, Store-Signierung und Store-Installation wurden nicht
ausgeführt. Die Google-Metriken des optionalen ML-Kit-Scanners sind eine ausdrücklich
dokumentierte Grenze zur gewünschten Telemetriefreiheit. Größenlimits und der
langsamere PBKDF2-Fallback unter Android 7 stehen in der README.

## Dev-Artefakt

`build/releases/Hausakte-1.0.0-1-dev-debug.apk`

Paket `com.appfactory.house_log.dev`, App-Name `Hausakte Dev`, Version 1.0.0,
VersionCode 1, minSdk 24, targetSdk 36, debuggable. Dateigröße 153130176 Bytes.

SHA-256:

```text
dfc9e4adf64ee5b54f8efeb37bdc64a8e4504c2f6ef1c527160e504302daac8f
```

Die Development-APK enthält die geprüften nativen Module und benötigt den
laufenden Metro-Server. Der aktuelle TypeScript-Stand wird per Fast Refresh
geladen. Das Artefakt ist kein eigenständig gebündeltes Store-Release.

## Aktenseite und Stammdaten vom 21.09.2026

Diese UI-Runde verwendet die drei vom Nutzer bereitgestellten Smartphone-
Screenshots als Referenz. Sie sind keine Nachher-Prüfung der neuen Implementierung.
Auf Wunsch des Nutzers keine umfangreichen Tests und keine automatisierte Bedienung
von Telefon oder Emulator. Frühere Geräteprüfungen oben gelten für ihren damaligen
Stand und sind kein Nachweis für diese Änderungen.

Bestanden: `npm run format:check`, `npm run lint` ohne Warnungen und
`npm run typecheck`. Zusätzlich `git diff --check` ohne Befund.
Die bestehende Metro-Sitzung auf Port 8083 bleibt für Fast Refresh erhalten.
Die laufende Hausakte-Dev-Activity auf dem HONOR wurde in den Vordergrund geholt.
Metro bestätigt die Verbindung des Telefons. Kein Prozessabbruch, kein erzwungenes
Neuladen und keine APK gebaut oder installiert. Die geänderte Oberfläche wurde
nicht durchgeklickt oder als visuell abgenommen ausgegeben.

Manuelle Abnahme durch den Nutzer, noch offen:

- Leere Akte mit der Fahrzeugakte vergleichen. Name in Titelleiste, runder
  Symbolbereich, Kategorie, große Statuszeile, Aktionen untereinander und
  Leerzustandskarte mit Kamerasymbol prüfen. Auch Hellmodus und große Schrift
  ohne abgeschnittene Inhalte prüfen.
- Sowohl die gesamte Karte „Ersten Eintrag erfassen“ als auch den schwebenden
  Button antippen. Beide müssen dieselbe Quellenwahl öffnen. Zurück führt zur
  Akte. Nach dem Speichern eines Eintrags zeigt die Kopfkarte die letzte Aktivität
  und deren Datum. Bestehende Einträge und Protokolle bleiben erreichbar.
- Kategorie fokussieren, Vorschläge scrollen und auswählen. Mit „hei“ filtern,
  anschließend eine eigene Kategorie eingeben, Akte speichern und beim nächsten
  Formular unter den Vorschlägen wiederfinden. Freie Eingabe ohne Vorschlagswahl,
  Tastatur, Verlassen des Felds und Vorschläge bei großer Schrift prüfen.
- Eine dreizeilige Adresse eingeben. Speichern und Bearbeiten müssen die
  Zeilenumbrüche erhalten. Detailansicht und ein neu erzeugtes kompaktes Protokoll
  auf dieselben Zeilenumbrüche prüfen.
- Neue Akte mit eingeklappten Anlagendaten öffnen. Bereich aufklappen, nur ein
  Modell beziehungsweise technische Angaben eingeben, einklappen und speichern.
  Detailansicht muss auch ein Modell ohne Hersteller anzeigen. Beim erneuten
  Bearbeiten ist der Bereich geöffnet. Kategorie ändern und erneut speichern,
  dabei müssen die technischen Angaben erhalten bleiben.
- Tätigkeit im Eintragsformular weiterhin frei eingeben und per Vorschlag wählen.
  Änderungen verwerfen und vorhandene Angaben erneut öffnen.

## Kürzere Bildschirmwechsel vom 21.09.2026

Änderung: Die vier nativen Slide-Ressourcen für Vorwärts und Zurück beziehen ihre
Dauer aus dem app-lokalen Integer `hausakte_screen_transition_duration` mit 200 ms.
Prüfumfang: Format, Lint einschließlich des Config-Plugins, Typecheck, nativer
Dev-Build und Kontrolle der tatsächlich in der APK enthaltenen Ressourcen.
Keine Testsuiten, Smartphone-Automation oder Leistungsmessung beauftragt.

Manuell noch offen: Übersicht → Akte → Eintrag sowie Einstellungen → Datenschutz
öffnen und mit Zurück-Button beziehungsweise Android-Zurück zurückgehen.
Die Wechsel sollen kürzer wirken und die bisherige Richtung behalten. Flüssigkeit
auch auf einem langsameren Smartphone beurteilen. Normale und reduzierte
Systemanimationen sollen weiterhin respektiert werden.

Ergebnis dieser Runde: Formatprüfung, ESLint einschließlich Config-Plugin,
Typecheck, `git diff --check` und `npm run build:dev` bestanden.
AAPT bestätigt die Dev-Kennung `com.appfactory.house_log.dev`, Version 1.0.0 / Code 1,
Debug-Flag und den Integerwert 200. Alle vier gepackten Slide-Animationen verweisen
auf diesen Integer. Nur bereits bestehende Abhängigkeits- und Gradle-Warnungen
im Build. Keine Kotlin-Änderungen und keine zusätzlichen Testsuiten.

Artefakt: `build/releases/dev/Hausakte-Dev-1.0.0-1-navigation-200ms-20260921.apk`.
Das HONOR-Telefon war bei der Bereitstellung nicht per ADB verbunden. Daher keine
Installation oder Sichtprüfung auf dem Telefon. Die vorhandene Emulator-Sitzung
blieb unverändert. Metro läuft weiter auf Port 8083. Die APK benötigt diesen
Server für den TypeScript-Teil, die Animationsdauer ist nativ in der APK enthalten.

Nach Anschluss des Telefons datenbewahrend installieren. Der Helfer prüft auch die
vorhandene Installation und Signatur:

```bash
cd /home/unknown/dev/app_factory/hausakte
bash scripts/install-dev.sh A5CS024205005243 build/releases/dev/Hausakte-Dev-1.0.0-1-navigation-200ms-20260921.apk
```

## Eintragsaktionen vom 21.09.2026

Grundlage: letzter Smartphone-Screenshot von 19:49 sowie `_ReadingActions` und
`AppTheme.actionTextStyle` der aktuellen Fahrzeugakte. Anordnung jetzt untereinander
mit identischen Vorgaben für Buttonhöhe, Textgröße und Gewicht.

Manuelle Abnahme durch den Nutzer, noch offen: Gespeicherten Eintrag öffnen.
Bearbeiten und Eintrag löschen müssen untereinander die volle Breite nutzen.
Normale und große Systemschrift dürfen keine abgeschnittenen Beschriftungen
verursachen. Bearbeiten öffnet weiterhin das Formular, Löschen weiterhin die
Bestätigung. Die Löschbestätigung kann zur Prüfung abgebrochen werden.
Keine automatisierte Smartphone-Bedienprüfung oder zusätzliche Testsuite.

Formatprüfung, Lint ohne Warnungen, Typecheck und Diff-Prüfung dieser UI-Änderung
bestanden. Das nun wieder angeschlossene HONOR erhielt außerdem das zuvor
vorbereitete native 200-ms-Update aus Commit 312c329. Der Installationshelfer
bestätigte Dev-Paket, Version, Debug-Flag, bisherigen Installer und gleiche
Signatur. `adb install -r -t -g --no-streaming` war erfolgreich. Keine Deinstallation
oder Datenlöschung. Die Dev-App wurde mit dem bestehenden Metro-Server gestartet.
Die Button-Änderungen werden von Metro geladen und sind kein neu gebündelter
APK-Stand. Die visuelle Abnahme bleibt offen.

## Entfernung des Expo-Menüs vom 21.09.2026

Prüfumfang dieser Änderung: Format, ESLint einschließlich Config-Plugin,
Typecheck, nativer Dev-Build, Paket- und Signaturprüfung vor dem Update und eine
kurze Startkontrolle. Keine umfangreiche Testsuite oder automatisierte fachliche
Bedienprüfung. Beim Update ausschließlich `adb install -r -t -g --no-streaming`.

Manuelle Nachkontrolle: Hausakte öffnen und anschließend normal bedienen.
Kein „Hausakte Dev / Continue“-Bereich oder Expo-Floating-Button. Schütteln und
Drei-Finger-Berührung dürfen das Menü nicht zurückbringen. Ein Fast Refresh soll
weiterhin die Oberfläche aktualisieren, ohne ein Menü einzublenden.

Bestanden: Formatprüfung, ESLint einschließlich Config-Plugin, Typecheck,
Diff-Prüfung und nativer Dev-Build. AAPT bestätigt die drei Menü-Defaults in der
gepackten APK. Paket `com.appfactory.house_log.dev`, Version 1.0.0 / Code 1,
Debug-Flag, Installer und identische Signatur vor dem Update geprüft.
Datenbewahrende Installation mit `adb install -r -t -g --no-streaming` erfolgreich.

Kurze Startkontrolle auf dem HONOR: Activity und ReactSurfaceView vorhanden,
kein aktives DevMenuFragment. Die gespeicherten Menü-Flags bestätigen ausgeschaltete
Startanzeige, FAB und Gesten sowie abgeschlossene Einführung. Metro bestätigt die
Verbindung. Das Telefon war gesperrt, daher keine visuelle Abnahme oder tatsächliche
Schüttel- und Drei-Finger-Prüfung. Keine fremde Emulator-Sitzung verändert.

Dev-APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-no-dev-menu-20260921.apk`.
Die Dev-App benötigt weiterhin Metro. Kein Store-Build oder Push.

## Einheitlicher Start und eigenständige Testversion vom 22.09.2026

Vereinbarter Umfang: Format, Lint, Typecheck, notwendiger nativer Release-Build
für die Dev-Kennung und eine kurze Startkontrolle. Keine umfangreiche Testsuite,
keine automatisierten Medien-, Backup- oder Scannerabläufe. Die visuelle Abnahme
übernimmt der Nutzer.

Manuelle Abnahme:

1. Die eigenständige Hausakte Dev über ihr Icon kalt starten. Bis zur fertigen
   Übersicht nur die Fläche `#315E80`, kein Logo, „Hausakte“-Loader oder Wechsel
   über weiße und graue Zwischenflächen. Die allgemeine Android-Launcher-Animation
   ist kein eigener App-Bildschirm.
2. In Hell- und Dunkelmodus wiederholen. Der Start bleibt blau, anschließend gilt
   das gewählte Systemthema. Nach Rückkehr aus dem Hintergrund kein neuer Loader.
3. Start ohne USB und Entwicklungsserver. Vorhandene Akten, Einträge und Anhänge
   müssen sichtbar bleiben. Direktes Öffnen einer Aktenerinnerung muss die
   zugehörige Akte anzeigen.
4. Bei einem lokal nachgestellten Initialisierungsfehler muss die Fehleransicht
   mit „Erneut versuchen“ erscheinen. Keinen Fehler durch Löschen oder Manipulieren
   von Nutzerdaten auf dem Telefon provozieren.

Die nativen Startressourcen sind in beiden Farbmodi gleich. Das installierte
Expo-Modul 57.0.9 ist im SDK-57-Kompatibilitätskatalog enthalten. Der zusätzliche
Dev-Launcher wird in der eigenständigen Version nicht verwendet. Der bisherige
Live-Build bleibt optional, wird aber nicht als Nachweis für den Preview-Start
behandelt.

Ergebnis dieser Runde: Formatprüfung, Typecheck, ESLint einschließlich Config-
Plugin, Shell-Syntaxprüfung der Build-/Installationshelfer und `git diff --check`
bestanden. `npm run build:preview` erfolgreich in 4 min 19 s. AAPT bestätigt
Dev-Kennung, Version 1.0.0 / Code 1, fehlendes Debug-Flag, `#315E80` und das
transparente Splash-Drawable in der gepackten Startkonfiguration. JavaScript und
Assets sind eingebettet. Der native Build meldet Abhängigkeits- und Gradle-
Deprecation-Warnungen, aber keinen Buildfehler.

Auf dem HONOR mit Android 16 wurde vor Installation die vorhandene Debug-Version,
ihr Installer und die identische Signatur geprüft. Datenbewahrendes Update mit
`adb install -r -t -g --no-streaming` erfolgreich. UID 10515 bleibt gleich,
Berechtigungen bleiben erhalten. Keine Deinstallation oder Datenlöschung.

Die ausschließlich für Hausakte eingerichtete ADB-Weiterleitung auf Port 8083
wurde auf diesem Telefon entfernt. Ein anschließender Kaltstart über die normale
Launcher-Activity erzeugt MainActivity und ReactSurfaceView. Das Prozesslog meldet
„Running main“ ohne React-Native-JavaScript-Fehler oder fatalen Startfehler.
Metro und die fremde Emulator-Sitzung wurden nicht beendet oder verändert.

Das Telefon blieb gesperrt. Deshalb sind der tatsächlich sichtbare Übergang zur
fertigen Übersicht, deren Dateninhalt, Hell-/Dunkelmodus, Erinnerungs-Direkteinstieg
und Fehler/Wiederholen noch nicht visuell geprüft. Die technische Startkontrolle
ist kein Ersatz für diese manuelle Abnahme. Keine Scanner- oder vollständige
Fachablaufprüfung in dieser Runde.

Installierte APK:
`build/releases/dev/Hausakte-Dev-1.0.0-1-preview-startup-20260922-0551.apk`.

## Schließen der unteren PDF-Auswahl vom 26.09.2026

Prüfumfang wie gewünscht ohne umfangreiche Testsuiten: Format, Typecheck, Lint,
Diff-Prüfung und erforderlicher Preview-Build. Manuelle Abnahme:

1. In einer vorhandenen Akte „Hausprotokoll als PDF erstellen“ öffnen. Den Griff
   oder Titel nach unten ziehen. Die Auswahl muss folgen und schließen, ohne ein
   Protokoll zu erzeugen. Danach erneut öffnen.
2. Nur kurz und langsam ziehen und loslassen. Die Auswahl muss zurückgleiten.
   Mit einer deutlichen Abwärtsbewegung auch im Listenbereich schließen.
3. Bei großer Systemschrift oder einer längeren Auswahl normal hochscrollen.
   Beim Herunterscrollen darf eine noch nicht oben angelangte Liste nicht schließen.
   Nach Erreichen der Oberkante neu nach unten ziehen. Der Kopf bleibt immer
   ziehbar. Tippen auf Optionen, außerhalb und Android-Zurück separat prüfen.
4. Einen mittigen Bestätigungsdialog und ein verankertes Menü öffnen. Dort soll
   keine Ziehgeste schließen. Eine Löschbestätigung zur Prüfung nur abbrechen.

Ergebnis: Format, Typecheck und ESLint ohne Warnungen bestanden. Die von Expo
Prebuild erneut eingefügte Leerzeile mit Leerzeichen in settings.gradle wurde
auf den bisherigen Stand zurückgesetzt. Anschließend `git diff --check` sauber.
Preview-Build erfolgreich in 2 min 56 s. Keine neuen Abhängigkeiten.

Das Update auf dem HONOR war erfolgreich. Dev-Paket, Version 1.0.0 / Code 1,
Release-Eigenschaft, Installer, eingebettetes JavaScript und identische Signatur
wurden vorab geprüft. Ausschließlich `adb install -r -t -g --no-streaming`, keine
Deinstallation oder Datenlöschung. Die normale MainActivity wurde gestartet.
Das Smartphone blieb gesperrt. Der tatsächliche Wischtest, Listenscrollen und
Abbruch ohne PDF-Erstellung bleiben deshalb manuell durch den Nutzer zu prüfen.
Keine umfangreichen automatisierten Tests und keine fremde Testsitzung verändert.

Installierte APK:
`build/releases/dev/Hausakte-Dev-1.0.0-1-sheet-dismiss-20260926-2250.apk`.

## Kartenoptik der PDF-Auswahl vom 27.09.2026

Die zwei neuesten Smartphone-Screenshots von Hausakte und Fahrzeugakte sowie
Flutter-Kartenstil und PDF-Auswahl wurden verglichen. Die Überarbeitung ist auf
die Darstellung der PDF-Inhaltsauswahl begrenzt.

Manuelle Abnahme durch den Nutzer: PDF-Auswahl eines Einzel- oder Gesamtprotokolls
öffnen. Zwei abgerundete Karten mit feinem Rand, Symbol, kräftigem Titel,
Untertitel und Chevron prüfen. Mit Hell-/Dunkelmodus und großer Schrift sollen
Texte vollständig lesbar bleiben. Bei einer Akte ohne Anhänge bleibt die zweite
Karte deaktiviert, ihr Hinweis lesbar und der Chevron fehlt. Herunterziehen,
Android-Zurück und Tippen außerhalb sollen weiterhin ohne PDF-Erstellung schließen.
Keine umfangreiche Testsuite für diese Darstellungsänderung.

Bestanden: Typecheck, ESLint ohne Warnungen, Formatprüfung, Diff-Prüfung und
Preview-Build in 2 min 20 s. Keine umfangreiche Testsuite ausgeführt.
Vor dem datenbewahrenden Update wurden Dev-Kennung, Version 1.0.0 / Code 1,
Release-Eigenschaft, Installer, eingebettetes JavaScript und identische Signatur
geprüft. `adb install -r -t -g --no-streaming` erfolgreich. Keine Deinstallation
oder Datenlöschung. Hausakte Dev wurde über die normale Activity gestartet.

Das Telefon war bei der Übergabe gesperrt. Die neue Kartenansicht sowie die
Hell-/Dunkel- und Großschrift-Abnahme bleiben daher visuell durch den Nutzer zu
prüfen. Fremde Testsitzungen und die Flutter-Referenz wurden nicht verändert.

Installierte APK:
`build/releases/dev/Hausakte-Dev-1.0.0-1-pdf-cards-20260927-1901.apk`.

## Fotohinweise als zusammenhängende Fläche vom 27.09.2026

Die beiden Smartphone-Screenshots von 19:30 wurden angesehen. Referenz ist die
Flutter-Implementierung `meter_photo_examples.dart` mit gemeinsamer Liste für
Titel und Karten. Hausakte verwendet dafür jetzt eine integrierte Scrollfläche
mit vergrößerbarer Höhe und Schließgeste.

Formatprüfung, ESLint und TypeScript strict bestanden. Die neue Abhängigkeit
`@gorhom/bottom-sheet` 5.2.14 ist exakt fixiert. `npm ls` bestätigt die Verwendung
der vorhandenen Versionen von Gesture Handler und Reanimated ohne Konflikt.
Auf Nutzerwunsch keine umfangreiche Testsuite und keine neuen Gesten-Mocktests.

Manuelle Prüfschritte: Fotohinweise öffnen. Auf einer Karte nach oben ziehen,
bis die Fläche groß ist und auch die Überschrift mitscrollt. Anschließend aus
leicht gescrollter Position in einer durchgehenden Bewegung nach unten ziehen,
bis die Fläche schließt. Erneut öffnen und prüfen, dass die Hinweise wieder
oben beginnen. Schließen über X, Android-Zurück und den Hintergrund prüfen.
Der Erfassungsentwurf soll dabei erhalten bleiben.

Tatsächlich auf HONOR BVL-N49 mit Android 16 geprüft: eigenständigen Preview-Build
nach Identitäts- und Signaturprüfung datenbewahrend installiert. Vorhandene Akte
und gesicherter Erfassungsentwurf sind weiterhin vorhanden. Fotohinweise geöffnet,
auf einer Karte nach oben gezogen und die mitgescrollte Überschrift kontrolliert.
Aus dieser gescrollten Position schließt eine einzige Abwärtsgeste den Modal.
Wiederöffnen setzt die Liste zurück. X-Button, Android-Zurück und Tippen auf den
Hintergrund schließen ebenfalls korrekt.
Die weitere persönliche Bedienabnahme übernimmt der Nutzer. Fahrzeugakte und
Emulator wurden nicht verändert, kein Datensatz gespeichert oder gelöscht.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-photo-sheet-20260927-1936.apk`.

## Kleine visuelle Anpassungen des Fotoformulars vom 27.09.2026

Die vier Smartphone-Screenshots von 19:53/19:54 wurden angesehen und mit der
aktuellen Flutter-Implementierung verglichen. Änderungen betreffen das
Aktivitätslabel und seinen Hilfstext, Kartenabstände, Fotohintergrund,
PDF-Leerzustand und das schlichte Foto-Kontextmenü. Pflichtfeldvalidierung,
Dateigrenzen und Anhänge werden fachlich nicht geändert.

ESLint und TypeScript strict bestanden. Der Selektor des bestehenden manuellen
Android-Smoke-Skripts wurde an „Aktivität“ angepasst. Keine umfangreiche Testsuite
und kein neuer Datensatz für diese Darstellungsänderung.

Manuelle Abnahme: Vorhandenen Erfassungsentwurf mit einem Foto öffnen. Das Foto
muss ohne zusätzliche dunkle Fläche erscheinen. Im Dreipunkt-Menü stehen nur
„Foto ersetzen“ und „Foto entfernen“. Bei mehreren Fotos sind „Nach vorne“ am
Anfang und „Nach hinten“ am Ende grau und nicht auswählbar. Kartenabstände und
PDF-Zähler bei null Dokumenten mit den Referenzbildern vergleichen.

Formatprüfung und Preview-Build bestanden. Paket, Version, Release-Eigenschaft,
Installer und Signatur vor dem datenbewahrenden Update auf HONOR geprüft.
Installation erfolgreich, App-Prozess gestartet. Das Gerät war gesperrt, deshalb
wurde die geänderte Darstellung in dieser Aufgabe nicht erneut auf Android
bedient oder visuell abgenommen. Diese Prüfung übernimmt der Nutzer.
Keine Änderungen an Fahrzeugakte und kein Update des Emulators.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-photo-visual-20260927-2001.apk`.

## Aktenverlauf mit Fotovorschau vom 28.09.2026

Beide Smartphone-Screenshots von 07:24 wurden angesehen und mit der aktuellen
Flutter-Verlaufskarte verglichen. Formatprüfung, ESLint und TypeScript strict
bestanden nach der Anpassung. Keine umfangreiche Testsuite und keine neuen
Testdatensätze auf dem Smartphone, entsprechend dem Nutzerwunsch.

Manuelle Abnahme: Im Aktenverlauf eine vorhandene Karte mit Foto ansehen.
Datumsleiste, erstes Foto, Aktivität, Messstand und vorhandene Notiz vergleichen.
Tippen öffnet weiterhin den Eintrag mit Dienstleister, Kosten und Anhängen.
Ab zwei Fotos muss die Anzahl im Bild erscheinen. Nach Umsortieren und Speichern
muss das neue erste Foto auch im Verlauf vorne stehen. Ein Eintrag ohne Foto
zeigt das Erfassungssymbol, ein fehlendes Foto das Bildfehlersymbol. Ohne Messwert
muss „Ohne Messangabe“ statt einer künstlichen Null erscheinen. Zwei Messwerte
gleicher Einheit zeigen ihre Vergleichszeile. Die Suche blendet diese Zeile aus.
Dieselben Karten auf der separaten Verlaufsseite sowie Hellmodus und große
Systemschrift prüfen. Noch nicht ausgeführte Schritte sind keine bestandenen Tests.

Preview-Build bestanden. Auf HONOR BVL-N49 wurden Paket
`com.appfactory.house_log.dev`, Version 1.0.0 (1), nicht debuggbarer Preview-Modus,
Installer und übereinstimmende Signatur geprüft. Datenbewahrendes APK-Update
erfolgreich, App-Prozess gestartet. Das Smartphone blieb gesperrt. Deshalb keine
Behauptung einer ausgeführten visuellen Abnahme der neuen Verlaufskarten.
Fahrzeugakte und gespeicherte Einträge wurden nicht bearbeitet.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-history-cards-20260928-0733.apk`.

## Protokollbereich nach Screenshot-Vorlage vom 28.09.2026

Die beiden Smartphone-Screenshots von 07:38 und die zugehörigen Flutter-Karten
wurden verglichen. Formatprüfung, ESLint und TypeScript strict bestanden.
Keine umfangreiche Testsuite auf Nutzerwunsch. Die Dokumente selbst werden bei
dieser UI-Änderung nicht neu erzeugt oder überschrieben.

Manuelle Abnahme: Vorhandenen Eintrag mit gespeichertem Einzelprotokoll öffnen.
Überschrift vor der Erstellen-Karte, Erklärungstext, PDF-Symbol, gedämpfte
Kartenfarbe und gespeicherte Karte mit Erstellungsdatum, Eintragszusammenfassung,
Modus und Speicherstatus vergleichen. Vorhandene PDF öffnen und zurückkehren.
Löschdialog öffnen und abbrechen. In der Akte die Sektion mit Gesamtprotokollen
auf- und zuklappen. Dateien erst nach der Verfügbarkeitsprüfung als gespeichert
kennzeichnen. Zusätzlich fehlende Datei, Ladefehler mit Wiederholen, mehr als
zehn Protokolle, große Systemschrift und Hellmodus bei Bedarf prüfen.

Preview-Build bestanden. Auf dem HONOR-Smartphone wurden Dev-Paket, Version,
nicht debuggbarer Preview-Modus, Installer und übereinstimmende Signatur geprüft.
Das Update wurde mit den datenbewahrenden Installationsflags erfolgreich
installiert und Hausakte gestartet. Vorher war der vorhandene Eintrag geöffnet.
Während des Builds sperrte sich das Smartphone wieder. Die angekündigte kurze
Bedienkontrolle von Karten, PDF-Öffnen und Löschabbruch konnte deshalb nicht
ausgeführt werden und bleibt bei der Nutzerabnahme. Kein Datensatz gelöscht,
keine neue PDF erzeugt und keine Flutter-App geändert.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-report-cards-20260928-0748.apk`.
