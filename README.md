# Hausakte

Eigenständige Android-App für Wartungen, Reparaturen, Renovierungen und Unterlagen
zu Häusern, Wohnungen und Anlagen. React Native, TypeScript strict, Expo Development
Build und Expo Router. Kostenlos, ohne Konto, Werbung, eigene Analytics oder Cloud.
Der optionale Google-Scanner verarbeitet Dokumente lokal. Seine technischen
Google-Metriken sind in der lokalen Datenschutzerklärung offengelegt.

GitHub-Repository: [wasiliy-strecker/house-log](https://github.com/wasiliy-strecker/house-log).

## Funktionen

Flache Aktenliste mit Stammdaten, Standort, Hersteller, Modell, Seriennummer und
Einbau- oder Anschaffungsdatum. Chronologische Einträge mit freien Aktivitäten,
Zeitpunkt, Dienstleister, exakten Euro-Centbeträgen, Notizen und optionalem Messstand.
Verglichen werden nur Messwerte derselben Einheit. Suche und zehn Einträge pro Seite.
Bearbeiten ersetzt den aktuellen Stand ohne Revisionsverlauf.
Oberfläche und Bildschirmfolge folgen der Fahrzeugakte mit blauem Material-3-
Design, System-Hell/Dunkelmodus, separater Eintragsdetailseite und Verlauf.

Kamera und Galerie-Mehrfachauswahl, JPEG-Optimierung auf höchstens 1920 Pixel bei
Qualität 88 ohne übernommene EXIF-Daten. Großansicht mit Wischen und Zoom.
Fotos und PDFs lassen sich hinzufügen, ersetzen, entfernen und durch langes
Drücken ziehen. Menüaktionen bieten dieselbe Sortierung ohne Ziehgesten.

PDF-Mehrfachimport und Google-ML-Kit-Scan mit bis zu 20 Seiten. Unveränderte
Originaldateien mit Prüfsummen, Strukturprüfung und unabhängiger Prüfung durch
Android PdfRenderer. Einzel- und Gesamtprotokolle, kompakt oder mit Fotos und
direkt zugeordneten Original-PDF-Seiten. Gespeicherte Protokolle bleiben unverändert.
Interne Vorschau mit Zoom, Android-Druckdialog und Teilen. Backups werden über
die Android-Speicherortauswahl abgelegt, mit Wiederholen nach einem Abbruch.

Dauerhafte Formularentwürfe vor externen Medienaufrufen, lokale wiederholte
Erinnerungen und passwortgeschützte `.habackup`-Sicherungen. Wiederherstellung
führt Akten zusammen und erhält neuere lokale Änderungen.

## Voraussetzungen

Node 22.13 oder neuer. Der Lockfile wurde mit Node 22.23.2 und npm 12 erstellt.
Ein vollständiges JDK 21 mit `javac`, Android SDK Platform 36, Build Tools 36.0.0,
NDK 28.2.13676358, CMake und freigegebene Android-SDK-Lizenzen.
Poppler (`pdftotext`, `pdfinfo`) wird für unabhängige PDF-Inhaltsprüfungen benötigt.
Unter Ubuntu beispielsweise `sudo apt install poppler-utils`.

```bash
cd /home/unknown/dev/app_factory/hausakte
npm ci
npm run check
export ANDROID_HOME="$HOME/.local/android-sdk"
export JAVA_HOME="$HOME/.local/jdk-21"
npm run build:preview
```

Die Pfade sind Beispiele für diesen Arbeitsplatz. Auf anderen Rechnern die
eigenen SDK- und JDK-Verzeichnisse einsetzen. Der Build-Helfer führt Prebuild
aus, damit die versionierten Android-Dateien und Config-Plugins übereinstimmen.
Er erzeugt beim ersten Build einen eigenen lokalen Dev-Schlüssel. Schlüssel,
lokale Konfiguration und Build-Ausgaben werden nicht eingecheckt.

## Android starten

Die aktuelle Smartphone-Testversion ist eigenständig. Sie startet mit einer
einheitlichen Fläche in der Icon-Hintergrundfarbe `#315E80` und zeigt danach
die geladene App. Es gibt keinen zusätzlichen „Hausakte“-Ladebildschirm.
Schriften, lokale Initialisierung, Daten der ersten Route und deren Layout
geben die Startfläche gemeinsam frei. Fehler bleiben mit Wiederholen sichtbar.

```bash
npm run build:preview
npm run install:preview -- DEVICE
```

Die APK liegt unter `android/app/build/outputs/apk/dev/release/app-dev-release.apk`.
Ein eigener APK-Pfad kann als zweites Argument an `install:preview` übergeben
werden. Der Helfer prüft Dev-Paket, Version, Release-Eigenschaft, eingebettetes
JavaScript, bisherige Installation und identische Signatur. Danach verwendet er
`adb install -r -t -g --no-streaming` und startet die App über ihre normale Activity.
Akten, Anhänge und Entwürfe bleiben im selben privaten App-Verzeichnis.

Dieser `devRelease` läuft ohne Metro und ohne Entwicklungsmenü. Auch Änderungen
an TypeScript und UI benötigen für diese installierte Version ein APK-Update.
Signiert wird ausschließlich mit dem vorhandenen app-lokalen Dev-Schlüssel.
Die Store-Variante bleibt unsigniert. Keine Veröffentlichung.

### Optionaler Live-Build mit Fast Refresh

Für Live-Entwicklung bleibt `devDebug` verfügbar. Er verwendet dieselbe Dev-
Installation, ersetzt also bei Installation die eigenständige Testversion.
Beide können nicht gleichzeitig unter derselben Paketkennung installiert sein.
Der Wechsel ist ausdrücklich über den jeweiligen Build- und Installationshelfer
möglich. Nicht zur Beurteilung des endgültigen Kaltstarts verwenden.

```bash
npm run build:dev
npm start
```

Metro läuft auf Port 8083. Keine fremden Testsitzungen beenden. Port 53545 wird
nicht benötigt. In einem zweiten Terminal das Zielgerät prüfen und installieren:

```bash
export ANDROID_HOME="$HOME/.local/android-sdk"
"$ANDROID_HOME/platform-tools/adb" devices -l
"$ANDROID_HOME/platform-tools/adb" -s DEVICE shell pm list packages -i com.appfactory.house_log.dev
"$ANDROID_HOME/platform-tools/adb" -s DEVICE shell dumpsys package com.appfactory.house_log.dev
"$ANDROID_HOME/platform-tools/adb" -s DEVICE install -r -t -g --no-streaming android/app/build/outputs/apk/dev/debug/app-dev-debug.apk
"$ANDROID_HOME/platform-tools/adb" -s DEVICE reverse tcp:8083 tcp:8083
"$ANDROID_HOME/platform-tools/adb" -s DEVICE shell am start -a android.intent.action.VIEW -d 'exp+hausakte://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083' com.appfactory.house_log.dev
```

Bei vorhandener Installation zusätzlich die Zertifikate vergleichen. Der Helfer
`scripts/install-dev.sh DEVICE` erledigt Paket-, Versions-, Debug-, Installer-
und Zertifikatsprüfung vor dem datenbewahrenden Update. Nie deinstallieren oder
App-Daten löschen, um Signaturprobleme zu lösen.

Alternativ verwendet `npm run android` den Expo-Startablauf für eine Erstinstallation.
Für Updates auf Geräten mit vorhandenen Daten ausschließlich den geprüften
Installationshelfer verwenden. TypeScript- und UI-Änderungen kommen über Fast Refresh.
Native Änderungen benötigen einen neuen Build. Die Development-APK benötigt Metro.
Ein Fast-Refresh-Stand wird nicht als dauerhaft eingebettete APK ausgegeben.

Dev: `com.appfactory.house_log.dev`, Name `Hausakte Dev`.
Store: `com.appfactory.house_log`, Name `Hausakte`. Store-Debug ist deaktiviert.
Store-Release ist absichtlich unsigniert. Veröffentlichung und Signierung sind
nicht eingerichtet. Andere Apps und deren Signierschlüssel werden nicht verwendet.

## Architektur

`src/app` enthält ausschließlich Routen und Layout. Bildschirmzustand und Aktionen
liegen in Feature-Hooks. `HouseService` koordiniert Fachregeln, Entwürfe, Dateischutz
und Protokolle. `Repository`, `FileVault`, `MediaPort` und `ReminderPort` trennen
Daten- und Gerätefunktionen. Der Context in `src/core/composition.tsx` verdrahtet
die Implementierungen. Es gibt kein gemeinsames Runtime-Paket mit Nachbar-Apps.

SQLite-Schema 2 verwendet Fremdschlüssel, WAL, Transaktionen und Indizes. Datensätze
haben UUIDs und ISO-Zeitstempel. Attachment-Dateinamen sind relative UUID-Schlüssel.
Prüfsummen sind SHA-256. Geldbeträge sind sichere ganze Centbeträge.

Das app-lokale Expo-Modul in `modules/house-native` enthält Android-Scanner,
PDF-Prüfung, Vorschau, Drucken, Speicherortauswahl und Alarmplanung. PDF-Erstellung und Seitenübernahme verwenden
`pdf-lib`. AES-GCM verwendet Noble Ciphers. PBKDF2 verwendet ab Android 8 den nativen
JCA-Provider und unter Android 7 Noble Hashes als langsameren Fallback.
Es gibt keine selbst implementierten kryptografischen Primitive.

## Prüfungen

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform android --output-dir build/metro-check
cd android
./gradlew :house-native:testDebugUnitTest --max-workers=4
```

Die Tests verwenden echte SQLite-Dateien über Node SQLite mit derselben
Repository- und Migrationsimplementierung wie Android. PDF-Prüfungen verwenden
echte PDFs, eingebettete Fotos und Poppler. Backup-Tests verwenden echte Dateien,
AES-256-GCM und PBKDF2 mit 600000 Runden. Eine unabhängige OpenSSL-Entschlüsselung
über Node Crypto prüft die Kompatibilität.

Für den Android-Ablauf im laufenden Dev-Build öffnen:

```bash
"$ANDROID_HOME/platform-tools/adb" -s DEVICE shell am start -a android.intent.action.VIEW -d 'hausakte://dev-check' com.appfactory.house_log.dev
```

„Prüfung starten“ führt denselben Geschäftsablauf mit echten Expo-SQLite-Dateien,
privaten Dateien, nativer Fotooptimierung und Android PdfRenderer aus. Er benutzt
eine eigene synthetische Testdatenbank. Ergebnis im privaten App-Verzeichnis
`files/android-check-result.json`. Testdateien liegen separat in `files/vault/check-*`.
Diese Diagnose ist nur im Dev-Build ausführbar und nicht Teil des normalen Menüs.

Ein grundlegender UI-Ablauf lässt sich im laufenden Emulator wiederholen:

```bash
python3 scripts/android-ui-smoke.py emulator-5556
```

Der Helfer legt synthetische Akten und Einträge an. Die weiteren Medien-,
Prozessverlust- und Berechtigungsprüfungen stehen im Prüfprotokoll.

Die bewusste Expo-Doctor-Ausnahme `appConfigFieldsNotSyncedCheck` ist für versionierte
native Projekte gesetzt. Der Build-Helfer erzwingt den Prebuild-Schritt.
Gezielte Overrides für `uuid` und `decode-uri-component` schließen bekannte
transitive Sicherheitslücken. Expo Doctor, Metro und Android prüfen diese Kombination.

## Grenzen

Android ab API 24. Kein iOS- oder Browser-Funktionsnachweis. Expo Go reicht wegen
des eigenen nativen Moduls nicht aus. Scanner benötigt Google Play Services,
ausreichend RAM und beim ersten Start möglicherweise einen Komponenten-Download.
Ein unterbrochener Scan muss nach Prozessverlust neu gestartet werden.

Importdateien höchstens 50 MB, maximal 200 Anhänge pro Eintrag. Protokolle dürfen
höchstens 64 MB Quelldateien und 50 MB Ausgabe umfassen. Backup derzeit höchstens
128 MB und zehn Zeichen Mindestpasswort. Große Bestände benötigen eine spätere
Streaming-Erweiterung. Diese Grenzen werden ausdrücklich gemeldet.

Die Abweichungen zur Fahrzeugakte stehen in
[PROCESSING_PARITY.md](docs/PROCESSING_PARITY.md). Tatsächlich ausgeführte Prüfungen
und offene Gerätetests stehen in [VALIDATION.md](docs/VALIDATION.md).
