# Aktenseite und Stammdaten anpassen

Aktenseite nach den drei Smartphone-Screenshots an die Fahrzeugakte angeglichen.
Kopfkarte, große Statuszeile, Aktionen untereinander und vollständig antippbarer
Leerzustand mit Kamerasymbol. Beide Erfassungseinstiege behalten dieselbe Route.

Kategorie als freie Eingabe mit Vorschlägen aus Standardwerten und vorhandenen
Akten. Gemeinsame app-lokale Vorschlagskomponente für Kategorie und Aktivität.
Mehrzeilige Adresse und optional aufklappbare Anlagendaten. Vorhandene technische
Werte bleiben beim Einklappen und bei Kategorieänderungen erhalten. Modell auch
ohne Hersteller in der Detailansicht sichtbar. Keine Schema- oder Native-Änderung.

Ausgangspunkt ist der bereits gesicherte Commit 5cffa1b. Formatprüfung, Lint ohne
Warnungen, Typecheck und Diff-Prüfung bestanden. Manuelle Abnahmeschritte in
VALIDATION dokumentiert. Keine zusätzlichen Testsuiten oder Smartphone-Automation.
Die vorhandene App-Activity auf dem HONOR wurde in den Vordergrund geholt und ist
mit Metro für Fast Refresh verbunden. Kein APK-Neubau und kein Push.
