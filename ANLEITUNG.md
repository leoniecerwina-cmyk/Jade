# Sakura & Jade WorkFlow – Installation

Die App ist eine PWA: Sie läuft komplett offline, speichert alles im Gerätespeicher (IndexedDB) und lässt sich wie eine App installieren.

## Variante A – Schnell testen (Laptop)
    cd sakura-jade
    python -m http.server 8080
Dann http://localhost:8080 im Chrome/Edge öffnen. In der Adressleiste erscheint „Installieren“.

## Variante B – Aufs Handy (empfohlen)
1. Den Ordner kostenlos hosten (GitHub Pages, Netlify Drop oder Cloudflare Pages – einfach den Ordner hochladen).
2. Die Adresse einmal am Handy öffnen (HTTPS nötig, nur für den ersten Aufruf).
3. iPhone: Safari -> Teilen -> „Zum Home-Bildschirm“. Android: Chrome -> Menü -> „App installieren“.
Danach funktioniert alles ohne Internet. Die Daten bleiben auf dem Gerät.

## Backups
Einstellungen -> Backup (.json) exportieren / teilen / importieren (Zusammenführen für Handy <-> Laptop).
Zusätzlich legt die App automatisch Tages-Sicherungen der letzten 3 Tage im Gerätespeicher an.

## Neu: Arbeit, Ausgaben, PIN, Android-App
- Work Space: Schichten planen, einstempeln, abhaken, Stundenzettel (CSV); fließt in die Balance (工) ein.
- Ausgaben: Monatsbudget, Kategorien, monatliche Fixkosten, Verdienst aus Arbeitszeit (mit Stundenlohn), CSV-Export.
- Einstellungen -> App-Sperre: PIN (4-6 Ziffern), automatische Sperre, Wartezeit nach Fehlversuchen.
- Einstellungen -> Darstellung & Farben: 6 Farbwelten oder eigene Farben, Hintergrundton, Größe, Name.
- Einstellungen -> Menü & Startseite: Bereiche aus-/einblenden, sortieren, Startseiten-Karten wählen.
- Einstellungen -> Autopilot: automatische Funktionen einzeln an-/abschalten (standardmäßig alles an).
- Wochenplan: Vorlesungen sind pro Semester fix (Einstellungen -> Semester: Start/Ende, Kopieren ins neue Semester). Arbeitstermine trägst du ~2 Wochen vorher ein; die App erinnert dich daran (einstellbar, „Autopilot“). Der Plan-Assistent verteilt Lernblöcke in freie Zeiten, ohne Fixtermine zu verschieben, und meldet Überschneidungen.
- Wochenziele: Lernen, Arbeit, Training, Sprachen, Ausgaben-Limit – bearbeitbar im Wochenplan, mit Fortschrittsbalken.
- Jahresrückblick: Seite „Rückblick“ -> als Bild (1080x1350) teilen oder speichern; Geldbeträge stehen bewusst nicht im Bild.
- Nur Android-App: Fingerabdruck/Gesicht statt PIN (Einstellungen -> App-Sperre, PIN bleibt Ersatz) und Homescreen-Widget (Streak, Lernzeit, nächster Termin, offene Aufgaben).
- Android-App (APK) kostenlos über GitHub bauen: siehe native/ANLEITUNG-APK.md

## Dateien
index.html, style.css, app.js, wushu-data.js – App
sw.js, manifest.webmanifest – Offline & Installation
native/, .github/ – Android-App (APK) per GitHub Actions
fonts/, icons/ – Schrift und Symbole
