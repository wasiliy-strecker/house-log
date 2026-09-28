# Fahrzeugakte → Hausakte

Referenz ist der am 20.09.2026 gelesene Fahrzeugakte-Code, Commit
`37578900315e09c1310a7e9c7509646ce1f85ca4`. Gelesen wurden README,
PROCESSING_PARITY, PDF_RELEASE_AUDIT sowie die relevanten Implementierungen und
Tests für Fotos, Dokumente, Entwürfe, PDF-Berichte, Backups und Android-Erinnerungen.
Spätere aktuelle Bearbeitungsregeln haben Vorrang vor älteren Revisionsbeschreibungen.
Die bestehenden Flutter-Apps bleiben unverändert. Der Workspace besitzt kein
übergeordnetes Git-Repository. Hausakte wird als eigenes Repository verwaltet.

## Zuordnung

| Fahrzeugakte                                         | Hausakte                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| Fahrzeug                                             | HouseRecord für Haus, Wohnung, Anlage oder Gebäudeteil          |
| Art, Kennzeichen, Marke, FIN                         | Kategorie, Standort, Hersteller, Modell, Seriennummer           |
| Erstzulassung                                        | Optionales Einbau- oder Anschaffungsdatum                       |
| Tätigkeit, Werkstatt, Kosten                         | Freie Aktivität, Dienstleister, Kosten in ganzen Cent           |
| Optionaler Kilometerstand                            | Optionaler Mess- oder Betriebsstand mit frei wählbarer Einheit  |
| Zehn Einträge Vorschau / Seite                       | Zehn Einträge pro Seite mit Suche                               |
| Zehn gespeicherte Berichte pro Seite                 | Zehn gespeicherte Berichte pro Seite                            |
| JPEG 1920, Qualität 88, ohne EXIF                    | Native Expo-Bitmap-Optimierung mit denselben Grenzen            |
| Kamera, Galerie, Foto-Session                        | Expo ImagePicker, persistente SQLite-Entwürfe                   |
| PDF-Mehrfachauswahl / ML-Kit-Scan                    | Expo DocumentPicker / app-lokales Expo-Kotlin-Modul             |
| PDFium-Prüfung und Zusammenfügen                     | PDF-LIB plus unabhängige native PdfRenderer-Prüfung beim Import |
| Einzel- und Gesamtprotokolle                         | Unveränderliche lokale SavedReport-Dateien                      |
| Stunden-, Tages-, Wochen-, Monats-, Jahreserinnerung | App-lokal angepasste Kotlin-Planung mit denselben Intervallen   |
| .fzbackup, Fahrzeugkennung                           | .habackup, hausakte_backup Version 1                            |

## Technische Entscheidungen

Expo SDK 57.0.24 mit React Native 0.86.3 und React 19.2.3. Expo-Pakete werden
durch `expo install` passend aufgelöst. Das Lockfile enthält die genauen Versionen.
TypeScript ist strict mit zusätzlichem `noUncheckedIndexedAccess`.
Die offiziellen [Expo-Kompatibilitätstabellen](https://docs.expo.dev/versions/latest/)
und Paketdokumentationen wurden geprüft. Kein Drizzle, die kleine SQL-Repository-
Implementierung lässt sich direkt mit Expo SQLite und echter Node-SQLite testen.

Scanner: Google `play-services-mlkit-document-scanner:16.0.0`, gemäß
[offizieller Anleitung](https://developers.google.com/ml-kit/vision/doc-scanner/android).
Full-Modus, JPEG/PDF-Ergebnis, maximal 20 Seiten, kein Galerieimport im Scanner.
Eine eigene Activity benutzt AndroidX Activity Result APIs. Token und wartender
Aufruf sind pro Prozess einmalig. Nach Prozessverlust oder doppelter Rückgabe
existiert kein gültiger Empfänger. Rückgaben werden ignoriert statt dereferenziert.
Kein kopierter Flutter-Request-Code und kein Method Channel.

PDF-LIB 1.17.1 ist eine plattformunabhängige TypeScript/JavaScript-Bibliothek.
`copyPages` übernimmt Originalseiten mit Text, Rotation und Seitenformat.
Die [offizielle API](https://pdf-lib.js.org/docs/api/classes/pdfdocument) wurde geprüft.
Android PdfRenderer validiert importierte PDFs zusätzlich, rendert dabei nur
Prüfminiaturen und ersetzt niemals die Originaldatei durch Rasterbilder.
Prüfsummen und Seitenzahlen verhindern stilles Auslassen veränderter Anhänge.
Lokale Roboto-Schriften in Regular und Bold entsprechen seit dem PDF-Abgleich
vom 27.09.2026 den Schriften der Fahrzeugakte.

Kryptografie: [Noble Ciphers](https://github.com/paulmillr/noble-ciphers) und
[Noble Hashes](https://github.com/paulmillr/noble-hashes), jeweils 2.4.0.
AES-256-GCM mit 128-Bit-Authentifizierungstag, zufälligem 128-Bit-Salt und
96-Bit-Nonce. PBKDF2-HMAC-SHA256 mit 600000 Runden. Ab Android 8 übernimmt der native
JCA-Provider die Passwortableitung in einem Hintergrund-Thread. Unter Android 7
bleibt Noble als langsamerer kompatibler Fallback. Der Android-Test vergleicht
auch Unicode-Passwörter mit einem unabhängig erzeugten OpenSSL-Prüfwert. Expo Crypto liefert sicheren
Zufall. Das binäre Headerformat wird als zusätzliche authentifizierte Daten
gebunden. Ein unkomprimierter Längencontainer vermeidet ZIP-Pfadtraversal und
Dekompressionsbomben. Nur das Containerformat ist app-eigen, nicht die Kryptografie.

NDK 28.2.13676358 ist explizit gesetzt und entspricht der vorhandenen vollständigen
Toolchain dieses Arbeitsplatzes. Das zunächst fehlende SDK wurde nicht durch
Änderungen an Flutter-Apps umkonfiguriert. Der eigene Android-Build prüft die
Kombination mit Expo, React Native, Scanner und Kotlin 2.1.20.

## Datensicherheit und Lifecycle

Ein Service serialisiert zusammengehörige Arbeitsschritte. Repository-Schreibvorgänge
verwenden `BEGIN IMMEDIATE`, `COMMIT` und `ROLLBACK`. Löschen und Fremdschlüssel-
Kaskaden sind eine Transaktion. Erst danach werden Kandidaten gegen alle noch
gespeicherten Einträge, Protokolle und Entwürfe geprüft. Fehler bei Referenzprüfung
oder Bereinigung erhalten Dateien. Ein verwaister Anhang ist einem Datenverlust
vorzuziehen. Neue Dateien werden zunächst privat geschrieben und dann umbenannt.

Jede Formularänderung schreibt einen SQLite-Entwurf. Vor Kamera, Galerie,
Dokumentauswahl oder Scanner wird auf das erfolgreiche Schreiben des gesamten
aktuellen Entwurfs gewartet. Fehlgeschlagenes Schreiben verhindert den externen
Aufruf. Bereits gespeicherte Dateien bleiben beim Verwerfen erhalten.
ImagePicker-Rückgaben werden nach Prozessverlust über dessen Pending-Result-API
wiederhergestellt. Ein unvollständiger Scan muss erneut begonnen werden.

Bearbeiten erzeugt keine Revision. Entfernte Dateien werden erst nach erfolgreichem
Speichern bereinigt. Ein Erinnerungsfehler nach Commit wird als gesonderter Hinweis
gemeldet. Die gespeicherten Daten werden dadurch nicht erneut als ungespeichert behandelt.

Eintragslöschung entfernt Einzelprotokolle. Gespeicherte Gesamtprotokolle bleiben
erhalten. Aktenlöschung entfernt alle zugehörigen Protokolle. Fehler beim Speichern
eines Berichts entfernen dessen neue Datei, ohne einen fertigen Bericht vorzutäuschen.

Backups enthalten nur gespeicherte Daten, keine Entwürfe. Alle Inhaltsreferenzen,
Typen, Fremdschlüssel, UUIDs, Prüfsummen, Größen, Fotos und PDF-Seitenzahlen werden
vor der Übernahme geprüft. Dateien werden unter neuen privaten Namen vorbereitet.
Die Datenbankübernahme ist atomar. Bei Fehlern bleiben der alte Stand und seine
Dateien erhalten. Wiederherstellung ergänzt Akten und erhält neuere lokale Daten.
Fehlende oder veränderte Dateien werden nur mit passender Inhaltsprüfsumme repariert.
Vorhandene lokale Entwürfe bleiben erhalten. Nach Übernahme werden Ansichten invalidiert.

## Erinnerungen

`ReminderStore.kt`, `ReminderScheduler.kt` und `ReminderReceivers.kt` wurden nach
Prüfung app-lokal angepasst. Keine Laufzeitabhängigkeit zu Fahrzeugakte. Beibehalten
sind Monatsende, Schaltjahre, lokale Uhrzeiten, Zeitzonenwechsel, Neustart,
Paket-Update, Berechtigungswechsel, normale und genaue Alarme, zwei Tonkanäle,
Testbenachrichtigungen, Duplikatschutz und ehrliche Planungs-/Zustellstatuswerte.
Benachrichtigung öffnet per Deep Link die zugehörige Akte. Kein künstlicher Nullwert.
Der minutenweise Debug-Sondermodus bleibt im nativen Referenzcode, wird jedoch
nicht als reguläre Hausakte-Wiederholung angeboten.

## Bewusste Unterschiede und Grenzen

Keine Fahrzeug-Backupmigration und keine historischen Revisionslisten.
Flache Aktenliste mit Textstandort statt einer verschachtelten Immobilienverwaltung.
Die Oberfläche folgt seit dem UX-Abgleich dem blauen Material-3-Thema der Fahrzeugakte.
Hell und Dunkel folgen der Systemeinstellung. Das Haus-Symbol und die fachlichen
Bezeichnungen bleiben app-spezifisch.
Fotos stehen im vollständigen Protokoll jeweils vollständig auf einer Seite.
Die gespeicherte Foto- und PDF-Reihenfolge bleibt in Formular, Galerie und Protokoll gleich.

Die JS-Verarbeitung ist begrenzt auf 50 MB je Import/Protokoll, 200 Anhänge je Eintrag,
64 MB Quellanhänge je Protokoll und 128 MB je Backup. Größere Datenmengen benötigen
eine spätere Streaming-Implementierung. Das Mindestpasswort ist zehn Zeichen.
Die Unterschiede werden in der App sichtbar erklärt, statt still Daten auszulassen.

Eine strikt telemetriefreie Zusage ist mit dem ausdrücklich gewünschten Google-
Scanner nicht möglich. Nach [Googles eigener Erklärung](https://developers.google.com/ml-kit/terms)
bleiben Eingaben und Ergebnisse lokal, technische Leistungs- und Nutzungsmetriken
gehen jedoch an Google. Das ist in der lokalen Datenschutzerklärung offengelegt.
Hausakte enthält keine eigene Analytics-Integration. Der normale PDF-Import bleibt
ohne Scanner nutzbar. Eine eigene veröffentlichte Datenschutz-URL wird nicht erfunden.

Browser und iOS werden nicht als Funktionsnachweis angeboten. Der Android-Dev-Build
verwendet für Entwicklung Metro. Test- und Store-Veröffentlichung sind nicht beauftragt.

## UX-Abgleich mit der aktuellen Fahrzeugakte

Für die ausdrücklich beauftragte Übernahme von Aussehen und Bedienung wurde am
20.09.2026 zusätzlich Fahrzeugakte `78abe02` geprüft. Die obige ältere Referenz
beschreibt die ursprüngliche Datenverarbeitung, dieser Abschnitt den neuen UI-Stand.

Gleiche Material-3-Farben, Roboto-Schriften, Material-Symbole, Eingaberahmen,
Kartenradien, Touch-Flächen und unterer Speicherbereich. Keine eigene Startseiten-
Logozeile. Die Aktenübersicht verwendet Suche, Anzahl, Sortiermenü, letzte Aktivität,
Bearbeitungszeit und einen Erfassungsbutton unten rechts. Erinnerungen stehen in
der Aktenbearbeitung. Haus-Stammdaten ersetzen die entsprechenden Fahrzeugdaten.

Die Akte zeigt Stammdaten, Aktionen, gespeicherte Gesamtprotokolle und zehn aktuelle
Einträge. Der vollständige Verlauf hat eine eigene Such- und Seitenansicht.
Erfassen beginnt mit der Auswahl ohne Foto, Kamera, Galerie oder PDF. Nach dem
Speichern öffnet sich die Eintragsdetailseite. Bearbeiten kehrt dorthin zurück.
Zurück bei geänderten Eingaben fragt nach dem Verwerfen. Bestehende Entwürfe
überspringen die Quellenwahl, sobald sie Eingaben oder Anhänge enthalten.

Fotos stehen im Raster mit zwei Spalten beziehungsweise einzeln über die volle
Breite. Großansicht, Wischen, Zoom, Seitenzählung und Pfeile gehören zum selben
Ablauf. Sortieren nutzt einen app-lokalen Gesture-Handler mit langer Berührung,
Auto-Scroll und alternativen Menüaktionen. Die frühere Drag-Listen-Bibliothek
wird für das Raster nicht mehr verwendet.

PDFs öffnen intern. Android [PdfRenderer](https://developer.android.com/reference/android/graphics/pdf/PdfRenderer)
erzeugt ausschließlich Vorschauseiten in
einem begrenzten Cache. Originale und gespeicherte Berichte werden dabei nicht
verändert. Vor Öffnen und Drucken wird die gespeicherte Prüfsumme kontrolliert.
Drucken übergibt die originale PDF an Androids Druckdialog. Teilen bleibt eine
bewusste Aktion. PDF-Vorschau und Dateizugriff erlauben nur private App-Dateien.

Backup-Passwörter werden in Dialogen eingegeben. Die verschlüsselte Datei wird
mit Android [ACTION_CREATE_DOCUMENT](https://developer.android.com/training/data-storage/shared/documents-files)
an einem selbst gewählten Ort gespeichert.
Abbrechen ist kein erfolgreicher Export. Erneut speichern und Teilen sind explizite
Aktionen. Verwaiste und doppelte Activity-Ergebnisse werden ignoriert. Fehler
lassen die vorbereitete private Sicherung für den erneuten Versuch erhalten.
Wiederherstellen folgt Datei, Passwort, Inhaltsprüfung, Bestätigung und Übernahme.

Keine frei erfundene Datenschutz- oder Projekt-URL. Die Datenschutzerklärung
bleibt lokal. Unverändert sind Schema, Backup-Kennung, Geldbeträge, Originalanhänge
und die fachlich sinnvollen Hausfelder. Die PDF-Größenlimits der ursprünglichen
Implementierung bleiben bestehen. Die neuere mehrteilige Fahrzeug-PDF-Ausgabe
ist kein Bestandteil dieser UI-Anpassung.

## Aktenseite und Stammdaten vom 21.09.2026

Grundlage sind die drei vom Nutzer genannten Smartphone-Screenshots vom
21.09.2026 und die aktuelle `meter_detail_screen.dart` der Fahrzeugakte.
Die Aktenseite übernimmt die Kopfkarte mit Kategorie im runden Symbolbereich,
großer letzter Aktivität beziehungsweise „Noch kein Eintrag“ und Stammdaten darunter.
Der Aktenname steht in der Titelleiste. Bearbeiten und Löschen stehen untereinander.
Kartenränder, Innenabstände, Schriftgrößen und der Leerzustand mit Kamerasymbol,
zentriertem Text und Pfeil orientieren sich direkt am Flutter-Code. Die gesamte
Leerzustandskarte und der schwebende Button öffnen dieselbe Quellenwahl.
Hausbegriffe und optionale Hausdaten ersetzen die Fahrzeugangaben.

Die Kategorie verwendet dieselbe app-lokale Vorschlagskomponente wie Aktivitäten.
Bei Fokus erscheinen alle Standardkategorien und Kategorien vorhandener Akten.
Eingabe filtert nach Teilzeichenfolgen unabhängig von Großschreibung. Eigene Werte
benötigen keine Auswahlbestätigung. Standardkategorien stehen zuerst, weitere
Kategorien alphabetisch und ohne doppelte Schreibweisen. Die Vorgabe für eine neue
Akte bleibt „Haus“. Kategorien werden aus vorhandenen Akten gelesen, es gibt keine
zusätzliche Kategoriehistorie nach dem Löschen dieser Akten.

Standort / Adresse ist ein mehrzeiliges Feld mit drei sichtbaren Zeilen und einer
Eingabetaste für Zeilenumbrüche. Die vorhandene String-Speicherung, Detailanzeige
und PDF-Absatzverarbeitung erhalten Zeilenumbrüche ohne Schemamigration.
Hersteller, Modell und Seriennummer stehen im Bereich „Anlagendaten (optional)“.
Neue Akten beginnen eingeklappt. Vorhandene technische Angaben öffnen den Bereich
beim Laden. Einklappen und Kategorieänderungen verändern die Werte nicht.
Einbau / Anschaffung bleibt außerhalb dieses Bereichs.

Nur TypeScript, Layout und die Zuordnung eines Symbols in der bereits enthaltenen
Material-Schrift ändern sich. Keine nativen Abhängigkeiten, Paketänderungen oder
neue APK. Die vereinbarte Prüfung beschränkt sich auf Format, Lint und Typecheck.
Die manuelle Smartphone-Abnahme übernimmt auf ausdrücklichen Wunsch der Nutzer.

## Bildschirmwechsel mit 200 ms

Auf ausdrücklichen Nutzerwunsch verwendet Hausakte ab 21.09.2026 eine Basisdauer
von 200 ms für Vorwärts- und Zurückwechsel mit `slide_from_right`.
Die vier zugehörigen Android-Translate-Ressourcen von react-native-screens werden
app-lokal überschrieben. Richtung und native Ausführung bleiben erhalten.
Androids systemweite Animations- und Barrierefreiheitseinstellungen werden nicht
verändert. Deren Skalierung wirkt weiterhin auf die Basisdauer.

Die Dauer steht in `plugins/with-house-android.js`. Das Config-Plugin erzeugt bei
jedem Prebuild die versionierten Ressourcen unter `android/app/src/main/res`.
Die Dateien in node_modules bleiben unverändert. Die Android-Ressourcen erfordern
einen neuen Dev-Build. Eine JavaScript-Daueroption wäre bei diesem Navigator nur
für bestimmte iOS-Übergänge wirksam und wird daher nicht verwendet.

Der native Build und seine gepackten Ressourcen werden geprüft. Daraus folgt keine
Garantie über Bildraten auf langsamen Geräten. Die manuelle Bedienprüfung bleibt
wie vereinbart beim Nutzer. Keine zusätzliche Navigationsbibliothek und keine
Änderung der Bildschirmfolge oder der gespeicherten Daten.

## Eintragsaktionen vom 21.09.2026

Der Smartphone-Screenshot von 19:49 zeigte die Aktionen der Eintragsdetailseite
noch nebeneinander. Die Eintragsseite verwendet nun wie `_ReadingActions` in der
Fahrzeugakte eine volle Spaltenbreite für „Bearbeiten“ und „Eintrag löschen“ mit
12 Punkten Abstand. Der Abstand oberhalb beträgt zusammen mit dem Seitenlayout
16 Punkte, darunter 18 Punkte. Das Bearbeiten-Symbol verwendet die Umrissvariante.

Die gemeinsame Button- und FAB-Typografie fordert jetzt ausdrücklich Gewicht 600
an, passend zu `AppTheme.actionTextStyle`. Schriftgröße 16, Zeilenhöhe 20,
Mindesthöhe 56 und Symbolgröße 22 bleiben gleich. Die Systemschriftgröße wird
weiterhin berücksichtigt. Die Button-Anordnung selbst ist eine TypeScript-
Änderung und wird über Metro bereitgestellt.

## Dev-App ohne Expo-Menü

Auf Nutzerwunsch entfernt Hausakte die Expo-Menüoberfläche auch aus dem sichtbaren
Dev-Betrieb. Nur den schwebenden Button abzuschalten genügte nicht, weil Expo eine
Einführung mit „Continue“ und weitere Öffnungswege besitzt.

Das Android-Config-Plugin setzt die Defaults für Einführung, Startanzeige und FAB.
MainActivity setzt im Debug-Build dieselben Einstellungen auch für vorhandene
Installationen und deaktiviert Menügesten sowie Tastenkürzel. Über Androids
Fragment-Lifecycle wird ausschließlich `expo.modules.devmenu.DevMenuFragment`
vor der ersten Darstellung unsichtbar und anschließend entfernt. Dadurch enden
auch seine Sensor- und Touch-Listener. Der Menü-Key wird zusätzlich abgefangen,
damit React Natives Ersatzmenü nicht geöffnet wird. Bei einem Reload gilt dieselbe
Regel erneut. Die Fragmentkennung wurde gegen die installierte Expo-Version geprüft
und muss bei künftigen SDK-Upgrades erneut geprüft werden.

React-Host, Navigation, Metro, Fast Refresh und Dev-Launcher bleiben verfügbar.
Die Expo-Entwicklungsabhängigkeiten bleiben Bestandteil des Development Builds.
Entfernt ist deren Menüoberfläche im App-Betrieb. node_modules bleibt unverändert.
Das Config-Plugin erhält die app-lokale Android-Anpassung bei Prebuild. Im Release
wird diese Debug-Lifecycle-Anpassung nicht ausgeführt. Native Änderung erfordert
neuen Dev-Build und ein datenbewahrendes APK-Update.

## Einheitlicher Start und eigenständige Testversion vom 22.09.2026

Die letzten Smartphone-Bilder zeigten dunkle und weiße Startflächen sowie eine
Logoanzeige. Zusätzlich erzeugten Schriftladen, Service-Initialisierung und
Übersicht eigene Ladezustände. Die native Startfläche ist nun durchgehend
`#315E80`, passend zum Hausakte-Icon, sowohl im Hell- als auch im Dunkelmodus.
Ein transparentes Drawable unterdrückt das zusätzliche Android-Splash-Icon.
Das Launcher-Icon bleibt unverändert. Es gibt keine Mindestanzeigedauer.

`expo-splash-screen` 57.0.9 passt zum vorhandenen Expo SDK 57. Sein automatisches
Ausblenden wird vor dem React-Rendern verhindert. `StartupProvider` und die
Bereitschaftsmeldung der fokussierten `Page` warten auf Schriften, vorhandene
Initialisierung und Daten der ersten Route sowie deren Layout. Die verschachtelte
Protokollliste hält den Start bei direktem Einstieg ebenfalls zurück. Fehler
geben die Startfläche frei, damit ihre Meldung sichtbar bleibt. Initialisierungs-
und Schriftfehler erlauben Wiederholen. Normale spätere Navigation öffnet keinen
neuen Splash. Unbekannte Links erhalten eine Seite mit Rückweg zur Übersicht.

Native Styles und die transparente Ressource werden im Hausakte-Plugin erzeugt.
Das Plugin steht vor expo-splash-screen, weil Android-Mods in umgekehrter Reihenfolge
abgewickelt werden. So bleiben die finalen Style-Anpassungen nach Prebuild erhalten.
Keine Änderungen an SQLite-Schema, Dateireferenzen oder Sicherungsformat.

Der Nutzer hat für das Smartphone ausdrücklich eine eigenständige Testversion
gewählt. `devRelease` enthält JavaScript und lokale Ressourcen, verwendet weiterhin
`com.appfactory.house_log.dev` und den vorhandenen app-lokalen Dev-Schlüssel.
Die Release-Implementierungen von Expo benötigen weder Metro noch Dev-Launcher.
Der Installationshelfer prüft Release-Eigenschaft und eingebettetes JavaScript
zusätzlich zu Paket, vorhandener Installation und Signatur. Der Start erfolgt
über die normale Launcher-Activity. Store bleibt separat und unsigniert.

`devDebug` bleibt als optionale Live-Entwicklung erhalten. Beide Build-Arten teilen
absichtlich dieselbe Dev-Installation und deren Daten. UI-Änderungen der aktuell
installierten Preview benötigen jeweils einen neuen Build und ein APK-Update.
Keine automatische Rückkehr zum Live-Build. Die Expo-Startbesonderheiten in einer
Development-APK sind kein Nachweis für den Start der eigenständigen Version.
Siehe [Expo-Startbildschirm-Dokumentation](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).

## Herunterziehen der PDF-Auswahl vom 26.09.2026

Der Smartphone-Screenshot von 22:38 zeigte „PDF-Inhalt wählen“. In der gemeinsamen
Auswahl war der Griff bisher nur sichtbar. Die React-Native-Modalfläche hatte
keinen Drag-Handler. Die Fahrzeugakte verwendet hier ein schließbares
`showModalBottomSheet`.

Die unteren Auswahlflächen im FeedbackProvider lassen sich jetzt am Kopfbereich
und am oberen Anfang der Auswahlliste nach unten ziehen. Bewegung und Animation
laufen über die vorhandenen Gesture-Handler-/Reanimated-Bibliotheken auf dem
UI-Thread. Der Android-Modal besitzt dafür einen eigenen GestureHandlerRootView.
Die Gestaltung und Beschriftung bleiben erhalten. Dialoge in der Mitte und
verankerte Menüs erhalten keine Schließgeste.

Nach einem Zug über ein Viertel der Höhe, höchstens 120 Layoutpunkte, oder einem
schnellen Abwärtswischen schließt die Auswahl mit demselben Abbruchergebnis wie
Android-Zurück. Es wird keine PDF-Erstellung ausgelöst. Kurze und abgebrochene
Ziehgesten federn zurück. Aufwärtsgesten bleiben bei der Liste. Ist eine längere
Liste bereits gescrollt, wird zunächst zur Oberkante gescrollt. Eine neue
Abwärtsgeste kann danach die Auswahl schließen. Der Kopfbereich bleibt unabhängig
von der Listenposition ziehbar. Tippen, Tippen außerhalb und Android-Zurück bleiben
verfügbar. Keine neue Abhängigkeit oder Änderung von Geschäftsdaten.

Die installierte eigenständige Testversion benötigt für diese TypeScript-Änderung
wie vereinbart ein neues Preview-APK mit eingebettetem JavaScript.

## PDF-Auswahl als Karten vom 27.09.2026

Referenz sind die beiden Smartphone-Screenshots von 18:54 und die aktuelle
`evidence_photo_mode_sheet.dart` mit `AppTheme.cardTheme` in Fahrzeugakte.
Die PDF-Auswahl verwendet jetzt zwei getrennte Karten mit 18 Punkten Eckenradius,
einem feinen OutlineVariant-Rand, Card-Hintergrund, kräftigem 16-Punkte-Titel,
Untertitel und rechtem Chevron. Zwischen den Karten liegen 8 Punkte. Symbole,
Beschriftungen und der Hintergrund der unteren Auswahl entsprechen der Vorlage.
Hausbezogene Texte bleiben fachlich angepasst. Hell-/Dunkelmodus und große
Systemschrift werden weiterhin berücksichtigt.

Die gemeinsame Auswahl erhält dafür die gezielte Darstellung `optionStyle: cards`.
Sie wird für Einzel- und Gesamtprotokolle angefordert. Andere Menüs und Dialoge
behalten ihre Darstellung. Bei fehlenden Anhängen bleibt die zweite Karte
sichtbar und deaktiviert, mit verständlichem Hinweis und ohne Chevron.
Die bestehende Ziehgeste, Abbruchlogik und PDF-Verarbeitung bleiben erhalten.

## PDF-Gestaltung vom 27.09.2026

Referenz sind das zuletzt gespeicherte Fahrzeug-Verlaufsprotokoll vom 27.09.2026,
das gespeicherte Einzelprotokoll vom 20.09.2026 und die aktuelle Implementierung
in `evidence_report_service.dart`. Das bisherige Hausprotokoll wurde zusätzlich
direkt in der PDF-Vorschau des entsperrten HONOR angesehen. Private Dokumente
und Smartphone-Bilder werden nicht im Repository abgelegt.

Einzel- und Verlaufsprotokolle verwenden jetzt dieselben Roboto-Schriftdateien,
A4 mit 40 Punkten Rand, dieselben Schriftgrößen, Abstände, Linien und Farben.
Es gibt eine kleine blaue Kopfzeile mit Abschnittsseitenzählung, den Titel
„Hausprotokoll“, Untertitel, Erstellungszeit und Ausgabeart. Stammdaten stehen
in zweispaltigen Tabellen. Eintragsüberschriften sind blau und 17 Punkte groß.
Der Verlauf beginnt mit der Tabelle „Nr. / Zeitpunkt / Eintrag / Differenz“.
Neueste Einträge stehen zuerst, die ältesten tragen Nummer 1. Tabellenköpfe
werden bei langen Verläufen wiederholt. Lange Texte und Tabellenzellen fließen
über weitere Seiten, ohne den Fußbereich zu überschreiben.

Fotos stehen in gespeicherter Reihenfolge in einem Zweiersraster mit 170 Punkten
Bildhöhe und vollständiger Darstellung. Ein einzelnes Foto einer Reihe steht
zentriert. Weitere Reihen haben eine Eintragszuordnung. PDF-Dateinamen und
Seitenzahlen sowie Notizen erscheinen beim Eintrag. Vollständige Ausgaben mit
PDF-Anhängen haben wie die Referenz zuerst die Verlaufsübersicht, anschließend
Eintragsabschnitte mit Fotos, Trennseiten und jeweils den Original-PDF-Seiten.
Originalseiten erhalten keine zusätzlichen Kopfzeilen und werden nicht gerastert.
Ohne eingebettete PDF-Anhänge fließen Übersicht und Details platzsparend zusammen.

Fachliche Anpassungen sind Kategorie, Aktenname, mehrzeiliger Standort, optionale
Anlagendaten, Einbau-/Anschaffungsdatum, Dienstleister und optionale Messstände.
Es werden keine erfundenen Nullwerte ausgegeben. Differenzen beziehen sich auf
direkt aufeinanderfolgende Einträge mit vorhandenen Messwerten derselben Einheit.
Kosten bleiben ganzzahlige Centbeträge mit deutscher Eurodarstellung. Aktennotizen
werden gesondert bezeichnet. Kompakte Ausgaben nennen vorhandene Fotos mit Anzahl,
binden deren Bilddaten aber nicht ein. Alle Anhänge werden trotzdem auf Lesbarkeit,
Prüfsumme und bei PDFs auf Seitenzahl geprüft.

Hausakte hat bewusst keine historischen Stammdatenrevisionen. Deshalb steht
auch im Einzelprotokoll „Aktuelle Aktenangaben“. Das vorhandene Hausakte-Schema
speichert keinen separaten Zeitzonenoffset bei der Erfassung. Zeitangaben werden
in der Zeitzone des exportierenden Geräts dargestellt und mit deren für den
jeweiligen Zeitpunkt gültigen UTC-Offset gekennzeichnet. Die Erstellungszeit
im Dokument entspricht der gespeicherten Protokollzeit.

Bereits gespeicherte Protokolle und Originalanhänge bleiben unverändert.
Es gibt keine Datenbankmigration und keine Änderung des Backupformats.
Das Layout gilt ausschließlich für neu erzeugte Protokolle. Die PDF-Paginierung
liegt app-lokal in `src/core/pdf/report-layout.ts`, die fachliche Zusammenstellung
und Dateiprüfung im vorhandenen `PdfService`.

## Zusammenhängend ziehbare Fotohinweise vom 27.09.2026

Die Smartphone-Screenshots von 19:30 zeigen die Fotohinweise. Deren bisheriger
Hausakte-Modal hatte eine feste Höhe, einen unbeweglichen Titel und nur einen
Scrollbereich für die Karten. Der vorhandene Schließgriff der PDF-Auswahl war
für diesen separaten Modal nicht zuständig.

Die Fotohinweise verwenden jetzt `@gorhom/bottom-sheet` 5.2.14 mit seiner
integrierten `BottomSheetScrollView`. Titel, Schließen-Button und alle vier Karten
stehen in derselben scrollbaren Liste wie in `meter_photo_examples.dart` der
Fahrzeugakte. Ziehen am Inhalt vergrößert zuerst die Fläche und scrollt danach
weiter. Abwärtsbewegungen scrollen zum Anfang und ziehen dann dieselbe Fläche
herunter, ohne eine zweite Geste vorauszusetzen. Griff, Schließen-Button,
Android-Zurück und Tippen auf den Hintergrund bleiben alternative Schließwege.
Beim erneuten Öffnen beginnt die Liste wieder oben.

Die Anfangshöhe beträgt 70 Prozent, die maximale Höhe 95 Prozent des verfügbaren
Bereichs. Die React-Native-Komponente rastet nach dem Loslassen an diesen Höhen
oder geschlossen ein. Die Flutter-Vorlage kann zusätzlich auf Zwischenhöhen
stehen bleiben. Die Übergabe zwischen Scrollen und Ziehen erfolgt über die
integrierte Gestensteuerung. Safe Areas, große Schrift und die Systemeinstellung
für reduzierte Bewegung werden berücksichtigt. Farbe, Griff, reguläre
Titelschrift, Kartenabstände und mittlere Schriftstärke der Kartentitel wurden
an die Referenz angepasst.

Die Bibliothek bringt kein eigenes natives Android-Modul mit. Die geprüften
[Peer-Abhängigkeiten der Version 5.2.14](https://github.com/gorhom/react-native-bottom-sheet/blob/v5.2.14/package.json)
erlauben die vorhandenen Versionen Gesture Handler 2.32.0 und Reanimated 4.5.1.
Integration nach [ScrollView-Dokumentation](https://gorhom.dev/react-native-bottom-sheet/components/bottomsheetscrollview)
und [Gestenoptionen](https://gorhom.dev/react-native-bottom-sheet/props).
Version und transitive Abhängigkeiten stehen im Lockfile. Andere Auswahlflächen,
Formularentwürfe und Geschäftslogik wurden für diese Aufgabe nicht geändert.

## Fotoformular und Fotomenü vom 27.09.2026

Referenz sind die vier Smartphone-Screenshots von 19:53/19:54 und die aktuelle
`reading_photo_gallery.dart`. Kleine Darstellungsänderungen gleichen das
Aktivitätsfeld, die Foto-/PDF-Karten und das Fotomenü an diese Vorlage an.
Das Foto wird weiterhin vollständig im 4:3-Vorschaubereich gezeigt, jetzt ohne
zusätzliche dunkle Hintergrundfläche. Karten erhalten den Außenabstand der
Flutter-Vorlage. Überschriften, Foto, Beschriftungszeile und Aufnahme-/Galeriebuttons
verwenden deren Abstände. Foto- und PDF-Karte folgen unmittelbar aufeinander.

„Aktivität“ trägt wie die Vorlage kein Sternchen. Die Pflichtfeldprüfung bleibt
unverändert. Nur für diesen Vorschlagstext werden Zeilenhöhe und Laufweite
angepasst. Die PDF-Karte zeigt ihre tatsächlichen Seiten-/Dateigrößenzähler auch
bei null Dokumenten. Hausakte behält die realen 50 MB je Datei. Die abweichenden
Fahrzeugakte-Grenzen werden nicht als rein visuelle Beschriftung übernommen.

Das Fotomenü erhält eine gezielte schlichte Darstellung mit normaler Schrift,
14 Punkten, 48 Punkten Mindestzeilenhöhe, kompakten Abständen und Ausrichtung
am Dreipunkt-Button. Keine Symbole oder rote Hervorhebung beim Entfernen.
Bei einem Foto zeigt es wie der Fahrzeugakte-Screenshot ausschließlich Ersetzen
und Entfernen. Ab zwei Fotos sind die Verschiebeaktionen sichtbar. Am Anfang
beziehungsweise Ende sind nicht ausführbare Richtungen grau und deaktiviert.
Das Foto wird dadurch weder ersetzt noch entfernt, solange keine entsprechende
Aktion gewählt wird. Andere Menüdarstellungen bleiben erhalten.

## Verlaufskarten vom 28.09.2026

Referenz sind die beiden Smartphone-Screenshots von 07:24 und
`reading_history_tile.dart`. Aktenübersicht im Detail und separate Verlaufsseite
verwenden dieselbe neue Karte. Oben steht eine abgerundete Datumsleiste mit
Kalendersymbol. Darunter erscheinen das erste Foto in gespeicherter Reihenfolge
als 92 × 92 große Vorschau, rechts die kleine Aktivität, der große Messstand
und der Pfeil zur Eintragsdetailseite. Ab zwei Fotos steht die Anzahl auf dem Bild.
Die Vorschau füllt wie bei Flutter den quadratischen Ausschnitt. Originaldateien
und Großansicht bleiben unverändert. Ohne Foto erscheint das Erfassungssymbol,
bei einem nicht ladbaren Foto ein Bildfehlersymbol. Die Notiz folgt unterhalb
mit eigenem Symbol und höchstens zwei sichtbaren Zeilen.

Fehlt ein Messstand, lautet der fachliche Ersatz „Ohne Messangabe“. Vergleichbare
Werte zeigen die vorhandene Differenz nun als „vorher → aktuell = Differenz“.
Die bestehende Auswahl des letzten früheren Messwerts gleicher Einheit bleibt
erhalten. Bei aktiver Verlaufssuche wird die Vergleichszeile wie bei Fahrzeugakte
ausgeblendet. Kosten, Dienstleister und PDF-Liste sind wie dort in den
Eintragsdetails zugänglich, statt die kompakte Verlaufskarte zu verlängern.
Kartenabstände und Eintragszähler folgen der Vorlage, einschließlich „1 Treffer“.
Die Seitengröße bleibt zehn. Dateipfade werden im View-Model über den FileVault-Port
aufgelöst. Die Kartenkomponente führt keine Datei- oder Datenbankoperationen aus.
