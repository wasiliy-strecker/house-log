# Eintragsaktionen an Fahrzeugakte angleichen

Bearbeiten und Eintrag löschen auf der Eintragsdetailseite untereinander in voller
Breite mit 12 Punkten Abstand angeordnet. Außenabstände und Bearbeiten-Symbol nach
Flutter-Referenz. Gemeinsame Button- und FAB-Schrift fordert Gewicht 600 bei Größe
16 und Zeilenhöhe 20 an. Mindesthöhe 56 und Systemschrift-Skalierung bleiben erhalten.

Die Änderung verwendet Metro. Keine neuen nativen Änderungen oder APK-Builds.
Manuelle Abnahme beim Nutzer. Keine umfangreichen Tests oder Smartphone-Automation.

Formatprüfung, Lint ohne Warnungen, Typecheck und Diff-Prüfung dieser UI-Änderung
bestanden. Das nun wieder angeschlossene HONOR erhielt außerdem das zuvor
vorbereitete native 200-ms-Update aus Commit 312c329. Der Installationshelfer
bestätigte Dev-Paket, Version, Debug-Flag, bisherigen Installer und gleiche
Signatur. `adb install -r -t -g --no-streaming` war erfolgreich. Keine Deinstallation
oder Datenlöschung. Die Dev-App wurde mit dem bestehenden Metro-Server gestartet.
Die Button-Änderungen werden von Metro geladen und sind kein neu gebündelter
APK-Stand. Die visuelle Abnahme bleibt offen.
