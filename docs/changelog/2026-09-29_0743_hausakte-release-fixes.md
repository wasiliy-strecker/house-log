# Hausakte Release-Korrekturen

Backup-Export und Import verwenden dieselben Größen- und Inhaltsgrenzen.
PDF-Protokolle zählen erzeugte und übernommene Seiten gemeinsam bis 2000.
Übergroße ältere Protokolle bleiben erhalten und werden im Backupfehler benannt.
Galerienavigation nach Wischen und Pfeilwechsel korrigiert. Android-7-Kalender-
APIs werden desugared und Benachrichtigungseinstellungen öffnen dort die App-Seite.
Expo-SDK-57-Patchstände aktualisiert. Native Prüfungen und API-24-kompatible
Installer-Auskunft dokumentiert. Store-Signierung bleibt ausgenommen.

Bestanden: Format, ESLint, TypeScript, 59 App-Tests, 40 native Tests, eigene
native Lint-Prüfung, Expo Doctor 20/20, Audit ohne Schwachstellen, Hermes-Export,
Dev-Release-Build und APK-Ausrichtung. Abhängigkeits-Lint benötigt den dokumentierten
Workaround für zwei SDK-Analysetasks. Android 7 real im Emulator geprüft:
Erinnerungsplanung einschließlich Neustart, Benachrichtigung, Einstellungen,
Mehrfachfotoimport, Galerie, PDF-Vorschau, Druckdialog und Backup-Export.

Dev-APK datenbewahrend auf dem HONOR aktualisiert, Signatur identisch.
Weitere aufwendige Gerätetests auf ausdrücklichen Nutzerwunsch beendet.
Scanner, vollständiger Kamera-Speicherablauf und Backup-Wiederherstellung bleiben
in der kurzen manuellen Abnahme. Details in docs/VALIDATION.md.
