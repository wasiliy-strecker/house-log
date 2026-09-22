# Hausakte mit einheitlichem Start und eigenständiger Testversion

Native Startfläche in der Icon-Hintergrundfarbe #315E80. Transparentes Splash-Icon,
kein zusätzlicher Hausakte-Loader. Die erste fokussierte Seite gibt den Start erst
nach Schriften, lokaler Initialisierung, Abfragen und Layout frei. Fehler bleiben
sichtbar und die Initialisierung kann erneut versucht werden.

Eigenständiger devRelease mit gebündeltem JavaScript, unveränderter Dev-Kennung
und derselben app-lokalen Signatur. Build-/Installationshelfer und Anweisungen
ergänzt. Live-Entwicklung bleibt optional. Store bleibt separat und unsigniert.

Geprüft: Format, Lint, Typecheck, Shell-Syntax, Diff und nativer Preview-Build.
Auf dem HONOR datenbewahrend installiert. Kaltstart ohne Metro-Weiterleitung
bestätigt Activity, ReactSurfaceView und JavaScript-Start ohne fatalen App-Fehler.
Telefon gesperrt, deshalb visuelle Abnahme und Inhaltsprüfung durch den Nutzer
offen. Keine umfangreiche Testsuite auf ausdrücklichen Nutzerwunsch.

APK: build/releases/dev/Hausakte-Dev-1.0.0-1-preview-startup-20260922-0551.apk.
Kein Push, keine Veröffentlichung und keine Änderung anderer Apps.
