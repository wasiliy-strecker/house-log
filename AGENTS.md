# Hausakte

Eigenständige React-Native-App mit TypeScript und Expo Development Build.
Root-Regeln gelten mit der vom Nutzer beauftragten React-Native-Ausnahme.
Keine Runtime-Abhängigkeit zu Nachbar-Apps. Änderungen bleiben in diesem Repo.

## Entwicklung

`npm ci`, `npm run check`, `npm run build:dev`.
`npm start` verwendet Port 8083. Bestehende Testsitzungen erhalten.
Für TypeScript und UI Fast Refresh verwenden. Native Änderungen erfordern
einen neuen Dev-Build. `android/` ist versioniert. Änderungen an generierten
Varianten müssen auch im Plugin `plugins/with-house-android.js` stehen.

Dev ist `com.appfactory.house_log.dev`. Store ist `com.appfactory.house_log`
und darf nur als unsigniertes Release vorbereitet werden. Keine Veröffentlichung.
Vor Installation Paket, Version, Debug-Flag, Installer und Signatur prüfen.
Ausschließlich `adb install -r -t -g --no-streaming` für APK-Updates verwenden.

## Architektur und Prüfung

Schlanke Routen in `src/app`, View-Model-Hooks in Features. Geschäftsregeln
in Services, Gerätezugriff hinter Ports. SQLite-Transaktionen gehen jedem
Löschen von Dateien voraus. Entwürfe und andere Dateireferenzen berücksichtigen.
Keine Revisionen beim Bearbeiten, keine Server-KI, keine eigene Telemetrie.
Die technischen Google-Metriken des optionalen Scanners transparent erklären.

Vor Commit `npm run check`, native JVM-Tests bei Kotlin-Änderungen und den
zusammenhängenden Integrationstest ausführen. Native Gerätegrenzen dokumentieren.
Changelog unter Workspace `CODEX/changelog/` und Kopie unter `docs/changelog/`
ablegen, da der Workspace kein Git-Repository ist. Nur dieses Repo committen.
