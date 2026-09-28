# Kurze Bestätigungen an Fahrzeugakte angleichen

Die schwebende Meldung mit Schließen-Kreuz wird durch eine flache Snackbar am
unteren Bildschirmrand ersetzt. Zentrierter Text, vier Sekunden Anzeigedauer
und kurze Ein- und Ausblendung entsprechen der Flutter-Vorlage. Identische
Folgemeldungen erhalten einen neuen Timer, ältere Timer schließen sie nicht.

Letzten Smartphone-Screenshot und aktuelle Flutter-Implementierung verglichen.
Formatprüfung, ESLint und TypeScript strict bestanden. Keine umfangreiche
Testsuite oder zusätzliche Bedienprüfung auf Nutzerwunsch. Manuelle Prüfschritte
und tatsächlicher Android-Übergabestand stehen in `docs/VALIDATION.md`.

Preview-APK erfolgreich gebaut. Das Smartphone wurde während der Umsetzung
getrennt, deshalb noch keine Installation oder visuelle Android-Abnahme der
Snackbar. Fertige APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-snackbar-20260928-2141.apk`.
