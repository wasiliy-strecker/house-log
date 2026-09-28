# Protokollbereich an Fahrzeugakte angleichen

Die Erstellen-Karte und gespeicherten Protokollkarten übernehmen Farben,
PDF-Symbole, Typografie, Anordnung und Erklärungstexte der Flutter-Referenz.
Einzelprotokolle zeigen Eintragszusammenfassung, Erstellungszeitpunkt und Modus.
Gesamtprotokolle stehen wie bei Fahrzeugakte in einer aufklappbaren Sektion.

„Lokal gespeichert“ wird erst nach einer Dateiprüfung angezeigt. Fehlende PDFs
erhalten einen Fehlerstatus. Die Prüfung erfolgt über den FileVault-Port im
View-Model. Die vorhandene Integritätsprüfung beim Öffnen bleibt bestehen.
Historische PDFs werden nicht verändert. Für ältere Gesamtprotokolle wird keine
nicht gespeicherte historische Eintragsanzahl erfunden.

Format, ESLint und TypeScript strict bestanden. Manuelle Abnahme und konkrete
Android-Übergabe sind in `docs/VALIDATION.md` dokumentiert. Keine umfangreiche
Testsuite auf Nutzerwunsch. Die eigenständige Smartphone-Version benötigt ein
APK-Update für die geänderte Oberfläche.

Preview-Build und datenbewahrende Installation auf HONOR bestanden. Paket und
Signatur geprüft, App gestartet. Das Gerät war danach wieder gesperrt, deshalb
keine ausgeführte visuelle Abnahme. APK:
`build/releases/dev/Hausakte-Dev-1.0.0-1-report-cards-20260928-0748.apk`.
