"""Erzeugt Launcher-Icons und Splash-Bilder für die Android-App aus ../icons/icon-maskable-512.png.
Wird nur bei Design-Änderungen gebraucht; die Ergebnisse liegen fertig in native/res/."""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = Image.open(os.path.join(HERE, '..', 'icons', 'icon-maskable-512.png')).convert('RGB')
OUT = os.path.join(HERE, 'res'); BG = (46, 98, 70); CREAM = (248, 246, 240)

def blossom():
    """Blüte freistellen (Hintergrund ist dunkles Jade, Blüte rosa/gold)."""
    a = np.asarray(SRC).astype(float)
    alpha = np.clip((a[..., 0] - 70) / 150, 0, 1)
    bgc = np.array([43, 94, 65.])
    col = np.where(alpha[..., None] > 0.02, (a - (1 - alpha[..., None]) * bgc) / np.maximum(alpha[..., None], 0.02), a)
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype('uint8')
    return Image.fromarray(rgba, 'RGBA')
B = blossom()

def foreground(px):           # Adaptive-Icon-Vordergrund: Blüte im sicheren Bereich (~58 %)
    im = Image.new('RGBA', (px, px), (0, 0, 0, 0)); s = int(px * 0.62)
    im.alpha_composite(B.resize((s, s), Image.LANCZOS), ((px - s) // 2, (px - s) // 2)); return im

def legacy(px, round_=False):  # Altes Launcher-Icon: volle Maskable-Grafik, quadratisch/abgerundet bzw. rund
    im = SRC.resize((px, px), Image.LANCZOS).convert('RGBA'); m = Image.new('L', (px * 4, px * 4), 0); d = ImageDraw.Draw(m)
    if round_: d.ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
    else: d.rounded_rectangle((0, 0, px * 4 - 1, px * 4 - 1), radius=int(px * 4 * 0.2), fill=255)
    im.putalpha(m.resize((px, px), Image.LANCZOS)); return im

dens = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
for d, (l, f) in dens.items():
    p = os.path.join(OUT, 'mipmap-' + d); os.makedirs(p, exist_ok=True)
    legacy(l).save(os.path.join(p, 'ic_launcher.png')); legacy(l, True).save(os.path.join(p, 'ic_launcher_round.png')); foreground(f).save(os.path.join(p, 'ic_launcher_foreground.png'))
os.makedirs(os.path.join(OUT, 'values'), exist_ok=True)
open(os.path.join(OUT, 'values', 'ic_launcher_background.xml'), 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % BG)

# Splash: cremefarbener Grund mit Blüte; Größen aus dem von Capacitor erzeugten Projekt (oder Standardliste)
sizes = {'drawable': (480, 320), 'drawable-land-mdpi': (480, 320), 'drawable-land-hdpi': (800, 480), 'drawable-land-xhdpi': (1280, 720), 'drawable-land-xxhdpi': (1600, 960), 'drawable-land-xxxhdpi': (1920, 1280),
         'drawable-port-mdpi': (320, 480), 'drawable-port-hdpi': (480, 800), 'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600), 'drawable-port-xxxhdpi': (1280, 1920)}
for folder, (w, h) in sizes.items():
    im = Image.new('RGBA', (w, h), CREAM + (255,)); s = int(min(w, h) * 0.32)
    im.alpha_composite(legacy(s), ((w - s) // 2, (h - s) // 2)); os.makedirs(os.path.join(OUT, folder), exist_ok=True); im.convert('RGB').save(os.path.join(OUT, folder, 'splash.png'))
print('ok', len(glob.glob(OUT + '/**/*.png', recursive=True)), 'Dateien')
