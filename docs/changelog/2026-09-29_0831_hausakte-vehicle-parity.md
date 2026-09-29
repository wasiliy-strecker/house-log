# Hausakte an Fahrzeugakte angleichen

Datum: 29.09.2026 08:31 Europe/Berlin.
Referenz: Fahrzeugakte `78abe0247f026c5078f99792d175398c40baa47a`.

Eigene Material-Kalender- und Uhrzeitdialoge, durchgehender nativer PDF-Viewer
mit Pinch-Zoom, Galerie mit horizontalem 200-ms-Pager, schwebende Sortiervorschau
und frei ziehbare Fotohinweise implementiert. PDF-Herkunft und schlichte Menüs
angeglichen. Erneutes Speichern fehlgeschlagener Erinnerungsplanungen ermöglicht.

Mehrteilige Protokolle mit maximal 100 Seiten je Teil einschließlich eigenem
Deckblatt, Teilwahl und gemeinsamem Teilen ergänzt. Atomare Speicherung,
Bereinigung bei Fehlern und Backup-Übernahme der optionalen Metadaten geprüft.
Die bisherigen Gesamtgrenzen bleiben bestehen, einschließlich 2000 Seiten
über alle Teile und Deckblätter. Bestehende PDFs und unbekannte alte Herkunft
bleiben unverändert. Unbenutzte Picker-/Viewer-Abhängigkeiten entfernt.

Prüfung: Format, ESLint, TypeScript strict, 43 gezielte Tests und 40 native
JVM-Tests bestanden. Nach Deckblatt-Ergänzung sieben PDF-Tests erneut bestanden.
Eigene native Lint-Prüfung ohne Fehler mit bekannten Abhängigkeits-Ausnahmen.
Preview-Build und abschließender inkrementeller Dev-Release-Build erfolgreich.
Datenbewahrend auf HONOR installiert und App-Prozess geprüft. Auf Nutzerwunsch
keine umfangreiche Geräteprüfung. Visuelle Abnahme, Gesten und Mehrfach-Teilen
bleiben als konkrete manuelle Schritte in VALIDATION dokumentiert.

APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-ui-parity-20260929-0830.apk`.
Keine Store-Signierung, keine Versionsanhebung, keine Veröffentlichung.
Fahrzeugakte wurde nicht geändert. Lokaler Commit ohne Push.
