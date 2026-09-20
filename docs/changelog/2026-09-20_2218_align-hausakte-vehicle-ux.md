# Hausakte an die Fahrzeugakte-Oberfläche angleichen

Vorherigen sauberen Stand auf Nutzerwunsch mit `28ee63d` gesichert.

Material-3-Theme einschließlich Dunkelmodus, Schriften, Icons, Karten,
Formularanordnung und Bildschirmfolge nach Fahrzeugakte `78abe02` übernommen.
Separate Eintragsdetails und Verlauf, Quellenwahl, Autovervollständigung,
Verwerfen-Dialoge, Fotoraster mit Ziehen und Menüsortierung ergänzt.
Interne PDF-Vorschau, Android-Drucken und Backup-Speicherortauswahl eingebaut.
Hausakte Dev auf HONOR und Emulator datenbewahrend aktualisiert. Flutter-Apps
unverändert. Kein Push und keine Veröffentlichung.

45 JavaScript-Tests und 37 native Tests bestanden. Expo Doctor 20/20,
TypeScript strict, ESLint, Formatprüfung, Hermes-Export und Android-Build bestanden.
Isolierter vollständiger Datentest mit Fotos, PDFs und Backup auf beiden Geräten
bestanden. UI-Einzelabläufe geprüft. Letzter zusammenhängender UI-Smoke wegen
nicht gefundenem Bedienelement nicht bestanden. Weitere umfangreiche Tests auf
Nutzerwunsch beendet. Manuelle Bedienabnahme durch den Nutzer steht aus.

Dev-APK: `build/releases/dev/Hausakte-Dev-1.0.0-1-ux-20260920.apk`.
Die Development-App benötigt den laufenden Metro-Server auf Port 8083.
