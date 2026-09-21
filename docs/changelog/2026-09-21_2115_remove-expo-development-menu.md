# Expo-Menü aus dem Dev-Betrieb entfernen

Expo-Einführung, automatische Menüanzeige und Floating-Button deaktiviert.
Vorhandene Menüeinstellungen werden beim Debug-Start ebenfalls zurückgesetzt.
Das Expo-Menüfragment wird vor der Darstellung verborgen und entfernt, damit
seine Gesten- und Sensorlistener enden. Menü-Key zusätzlich abgefangen.
Metro und Fast Refresh bleiben erhalten. Kein Patch an node_modules.

Native Änderung in MainActivity und Android-Manifest. Das Expo-Config-Plugin
regeneriert die Anpassung. Neuer Dev-Build und datenbewahrendes Update notwendig.
Keine umfangreiche Testsuite. Manuelle Prüfschritte in VALIDATION dokumentiert.

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
