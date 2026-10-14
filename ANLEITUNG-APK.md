# Sakura & Jade als echte Android-App (APK)

Die APK ist dieselbe App, nur in einer Android-Hülle (Capacitor). Vorteile gegenüber der Browser-Installation:
- lässt sich wie jede App installieren (kein Chrome-„App installieren“ nötig)
- **echte Erinnerungen** vor Terminen und Schichten, auch wenn die App zu ist
- Backups und CSV-Dateien gehen über das normale Android-Teilen-Menü (Dateien, Drive, Mail …)

Gebaut wird die APK kostenlos bei GitHub – du brauchst weder Android Studio noch einen PC mit Programmen.

## Schritt für Schritt

1. **Alles hochladen.** ZIP entpacken, den *Inhalt* des Ordners `sakura-jade` in dein GitHub-Repository laden (Add file → Upload files, alles hineinziehen und überschreiben).
   Wichtig: auch die Ordner `native` und `.github` müssen mit hoch. Falls `.github` sich nicht hochladen lässt (versteckter Ordner):
   *Add file → Create new file*, als Namen `.github/workflows/android-apk.yml` eintippen und den Inhalt der Datei `native/android-apk.yml` hineinkopieren.
2. **Bauen starten.** Im Repository oben auf **Actions** → links **„Android-APK bauen“** → rechts **Run workflow** → grüner Knopf.
   (Falls GitHub fragt, ob Workflows erlaubt sind: „I understand my workflows, enable them“.) Das dauert etwa 5–10 Minuten, bis ein grüner Haken erscheint.
3. **APK herunterladen.** Im Repository rechts auf **Releases** → neuester Eintrag → **Sakura-Jade.apk** antippen (am besten direkt am Handy).
4. **Installieren.** Datei öffnen. Android fragt einmalig nach „Installation aus dieser Quelle erlauben“ – zulassen. Meldet Google Play Protect eine unbekannte App, „Trotzdem installieren“ wählen (die App ist nicht im Play Store).
5. **Erinnerungen einschalten.** In der App: Einstellungen → „Android-App“ → Haken bei Erinnerung → Benachrichtigungen erlauben.

## Daten aus der Browser-Version übernehmen
Browser-Version und APK haben **getrennte Speicher**. Also: in der Browser-Version Einstellungen → „Backup (.json)“, die Datei aufs Handy schicken, in der APK Einstellungen → „Importieren“ → *Ersetzen*.

## Updates
Neue App-Dateien hochladen → Workflow erneut starten → neue `Sakura-Jade.apk` **über die alte installieren** (nicht vorher deinstallieren!). Deine Daten bleiben erhalten, weil jede Version mit demselben Schlüssel signiert wird (`native/debug.keystore`).
Deinstallierst du die App, sind die Daten weg – mach vorher ein Backup.

## Fingerabdruck & Widget
- Fingerabdruck: Einstellungen → App-Sperre → „Mit Fingerabdruck entsperren“ (erst PIN festlegen, am Handy muss ein Fingerabdruck eingerichtet sein).
- Widget: Homescreen lange antippen → Widgets → „Sakura & Jade“. Die App muss einmal geöffnet worden sein, damit Daten erscheinen.
- Falls der Bau mit diesen Extras scheitert, baut der Workflow automatisch eine Notfall-Variante ohne sie. Im Release-Text steht, welche Variante es wurde.

## Gut zu wissen
- **iPhone:** Eine echte iOS-App braucht einen Mac und einen Apple-Developer-Account (99 $/Jahr). Auf dem iPhone bleibt es bei Safari → „Zum Home-Bildschirm“.
- Die „Datei-Verknüpfung“ (automatisches Speichern in eine Datei) gibt es nur im Browser am Laptop, nicht in der Android-App. Nutze dort das Backup über das Teilen-Menü.
- Die APK ist ein „Debug“-Build, nur für dich gedacht und nicht für den Play Store. Ist dein Repository öffentlich, kann jeder die APK laden – sie enthält aber keine persönlichen Daten (die liegen nur auf deinem Handy).
- Wird der Lauf rot: auf den Lauf klicken, die rot markierte Zeile kopieren und mir schicken.
