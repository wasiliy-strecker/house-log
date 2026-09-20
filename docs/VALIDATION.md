# Prüfprotokoll Hausakte

Stand 20.09.2026. Ausschließlich synthetische Dokumente und Testdaten.
Dieses Protokoll unterscheidet automatisierte Tests, tatsächliche Android-Prüfungen
und noch offene Gerätetests. Ein erfolgreicher Build ersetzt keine Scannerprüfung.

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
