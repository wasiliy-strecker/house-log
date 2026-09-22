# Prüfprotokoll Hausakte

Stand 20.09.2026. Ausschließlich synthetische Dokumente und Testdaten.
Dieses Protokoll unterscheidet automatisierte Tests, tatsächliche Android-Prüfungen
und noch offene Gerätetests. Ein erfolgreicher Build ersetzt keine Scannerprüfung.

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
