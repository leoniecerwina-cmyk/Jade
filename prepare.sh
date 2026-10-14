#!/usr/bin/env bash
# Baut das Android-Projekt (Capacitor) aus den Web-Dateien der App.
# Läuft automatisch in GitHub Actions; lokal: `bash native/prepare.sh` (Node 18+ nötig)
# LITE=1 → Notfall-Variante ohne Fingerabdruck & Widget
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE="${VERSION_CODE:-1}"
LITE="${LITE:-0}"

echo "→ Web-Dateien kopieren"
rm -rf www && mkdir www
for f in index.html style.css app.js wushu-data.js manifest.webmanifest sw.js; do cp "../$f" www/; done
cp -r ../fonts ../icons www/

echo "→ Capacitor installieren"
if [ "$LITE" = "1" ]; then
  npm pkg delete dependencies.@aparajita/capacitor-biometric-auth dependencies.@capacitor/app
fi
npm install --no-audit --no-fund
[ -d android ] || npx cap add android
npx cap sync android

if [ "$LITE" != "1" ]; then
  echo "→ Widget einbauen"
  PKG=android/app/src/main/java/de/sakurajade/workflow
  mkdir -p "$PKG"
  cp android-src/java/*.java "$PKG/"
  cp -r android-src/res/* android/app/src/main/res/
  python3 - <<'PY'
p = 'android/app/src/main/AndroidManifest.xml'
s = open(p, encoding='utf-8').read()
if 'SakuraWidget' not in s:
    assert '</application>' in s
    r = ('<receiver android:name=".SakuraWidget" android:exported="false">\n'
         '            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>\n'
         '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_sakura_info" />\n'
         '        </receiver>\n    </application>')
    s = s.replace('</application>', r, 1)
    open(p, 'w', encoding='utf-8').write(s)
PY
fi

echo "→ Icons, Startbild und Versionsnummer setzen"
cp -r res/* android/app/src/main/res/
sed -i "s/versionCode [0-9][0-9]*/versionCode ${VERSION_CODE}/" android/app/build.gradle
sed -i "s/versionName \"[^\"]*\"/versionName \"1.${VERSION_CODE}\"/" android/app/build.gradle
grep -n "versionCode\|versionName" android/app/build.gradle
echo "✓ Fertig. Jetzt: cd native/android && ./gradlew assembleDebug"
