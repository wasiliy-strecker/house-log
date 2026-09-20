# Hausakte als eigenständige Android-App implementieren

Neue App unter `hausakte/` mit React Native, TypeScript strict, Expo Development
Build, Expo Router und eigener SQLite-Datenbank. Akten und chronologische Einträge,
Centbeträge, optionale Messwerte, Fotos, PDF-Mehrfachimport, ML-Kit-Scanner,
unveränderliche PDF-Protokolle mit Originalseiten, lokale Erinnerungen und
AES-256-GCM-Backups mit atomarer Wiederherstellung implementiert.

Dauerhafte Entwürfe, sichere Dateireferenzen und Transaktionen schützen vorhandene
Daten bei Abbruch und Speicherfehlern. Separate Dev- und Store-Varianten, eigener
lokaler Dev-Schlüssel, Installationshelfer mit Paket- und Signaturprüfung sowie
README, app-lokale Anweisungen, Funktionszuordnung und Prüfprotokoll ergänzt.

Formatierung, Lint, Typecheck, 40 TypeScript-Tests, 35 native Tests, Expo Doctor,
Android-Hermes-Export und Dev-APK-Build erfolgreich. Echte SQLite-, PDF- und
Backup-Implementierungen einschließlich unabhängiger OpenSSL- und Poppler-Prüfung
getestet. Vollständiger Android-Diagnoseablauf und reale UI-Prüfungen im Emulator
erfolgreich, einschließlich Ziehsortierung, Prozessverlust mit Entwurfswiederkehr,
Testbenachrichtigung und Berechtigungswiderruf.

Dev-App datenbewahrend auf Emulator und angeschlossenem HONOR-Telefon installiert.
Das gesperrte Telefon wurde nicht als bediengeprüft ausgegeben. Google-Scanner-
Komponentendownload scheiterte im Emulator. Erfolgreicher Mehrseitenscan,
Kameraaufnahme und weitere reale Lifecycle-Prüfungen bleiben ausdrücklich offen.
Technische Google-Metriken und Größenlimits sind dokumentiert.

APK: `hausakte/build/releases/Hausakte-1.0.0-1-dev-debug.apk`.
Development-APK benötigt Metro auf Port 8083. Keine Store-Signierung, kein Push,
keine Veröffentlichung. Bestehende Flutter-Apps wurden von dieser Aufgabe nicht
bearbeitet. Hausakte besitzt ein eigenes Git-Repository. Da der Workspace kein
Repository ist, wird diese Changelog-Datei zusätzlich in `hausakte/docs/changelog/`
versioniert.
