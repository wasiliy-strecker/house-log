# Verlaufskarten an Fahrzeugakte angleichen

Die letzten beiden Smartphone-Screenshots zeigen fehlende Fotovorschauen und
abweichende Angaben in Hausakte. Eine gemeinsame Verlaufskarte übernimmt jetzt
Datumsleiste, erstes Foto, Fotoanzahl ab zwei Bildern, Aktivität, hervorgehobenen
Messstand und zweizeilige Notiz aus der Flutter-Referenz. Abstände und Schriftgrößen
sind angeglichen. Ohne Messwert erscheint „Ohne Messangabe“.

Kosten, Dienstleister und PDFs bleiben in den Eintragsdetails zugänglich.
Vorhandene Differenzen gleicher Einheit zeigen beide Vergleichswerte. Während
der Suche wird die Differenz wie bei Fahrzeugakte ausgeblendet. Dateizugriff
bleibt hinter dem FileVault-Port im View-Model. Keine Änderung gespeicherter Daten.

Format, ESLint und TypeScript strict bestanden. Manuelle Prüfschritte und die
tatsächliche Android-Übergabe werden in `docs/VALIDATION.md` dokumentiert.
Der eigenständige Dev-Release benötigt für das eingebettete JavaScript ein
APK-Update. Keine umfangreiche Testsuite auf ausdrücklichen Nutzerwunsch.

Preview-Build und datenbewahrendes Update auf dem HONOR-Smartphone bestanden.
Paket und Signatur geprüft, App gestartet. Gerät gesperrt, daher bleibt die
visuelle Abnahme beim Nutzer. Installierte APK:
`build/releases/dev/Hausakte-Dev-1.0.0-1-history-cards-20260928-0733.apk`.
