# Bildschirmwechsel auf 200 ms verkürzen

Native Slide-Übergänge für Vorwärts und Zurück auf eine Basisdauer von 200 ms
festgelegt. Vier app-lokale Android-Ressourcen ersetzen nur die dafür verwendeten
react-native-screens-Ressourcen. Expo-Config-Plugin regeneriert sie beim Prebuild.
Systemeinstellungen und Bildschirmfolge bleiben erhalten. Kein Patch an Abhängigkeiten.

Nativer Dev-Build wegen geänderter Android-Ressourcen erforderlich. Prüfumfang
wie vereinbart auf statische Checks, Build und gepackte Ressourcen beschränkt.
Die manuelle Abnahme und Beurteilung auf langsameren Smartphones bleiben offen.
Kein Push oder Store-Build.

Bestanden: Format, ESLint einschließlich Plugin, Typecheck, Diff-Prüfung und
Dev-Build. AAPT bestätigt 200 ms und alle vier Ressourcenverweise in der APK.
Dev-Identität, Version und Debug-Flag geprüft. APK unter
`build/releases/dev/Hausakte-Dev-1.0.0-1-navigation-200ms-20260921.apk` gesichert.
Telefon nicht per ADB verbunden, deshalb noch keine Installation. Vorhandene
Emulator-Sitzung nicht verändert. Installationsbefehl in VALIDATION dokumentiert.
