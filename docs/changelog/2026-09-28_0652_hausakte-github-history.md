# Hausakte mit GitHub verbinden

Das eigene Repository ist `https://github.com/wasiliy-strecker/house-log`.
`origin` verwendet dieselbe SSH-Anbindung wie Fahrzeugakte. Der Nutzer hat den
ersten Push ausdrücklich beauftragt.

Die 13 bisherigen Commits vom 20. bis 27. September behalten ihre Inhalte,
Nachrichten, Autorennamen und ursprünglichen Autoren- und Commit-Zeitstempel.
Ihre bisherige E-Mail-Adresse war GitHub nicht als Nutzer zugeordnet. Die
Commit-Adressen und die app-lokale Git-Konfiguration verwenden deshalb jetzt
die bei Fahrzeugakte nachweislich dem Konto zugeordnete Adresse. Dadurch ändern
sich die Commit-IDs. Globale Git-Konfiguration und andere Apps bleiben unverändert.

Die ursprüngliche Historie ist lokal als geprüftes Git-Bundle unter
`build/git-backups/hausakte-before-github-20260928-065126.bundle` gesichert.
Die Zuordnung alter und neuer Commit-IDs liegt daneben in einer JSON-Datei.
Diese lokalen Sicherungen werden nicht veröffentlicht.

Prüfung: Alle 13 Dateibäume, Nachrichten, Namen und beide Zeitstempel wurden vor
und nach der Korrektur automatisch verglichen. In den historischen Dateiobjekten
gab es keine Treffer der geprüften Zugangsdatenmuster oder sensiblen Dateinamen.
README-Link, Markdown-Format und Diff werden vor dem Dokumentationscommit geprüft.
Keine App-Codeänderung, kein APK-Build und keine erneuten Anwendungstests nötig.
