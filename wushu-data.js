/* Trainingsplan-Daten (aus dem ursprünglichen Prototyp übernommen) */
const WUSHU_DATA = {
            "accent": "#C95169",
            "goal": { "event": "Deutsche Wushu-Meisterschaft", "date": "3.10.2026", "lead": "~15 Wochen" },
            "week": [
                { "d": "Mo", "type": "GYM", "color": "#A87500", "title": "Sprungkraft & Explosivkraft", "note": "Plyo-Schwerpunkt + Unterkörper-Power (Kontrastmethode). Frisch nach Deload-Sonntag.", "load": "HART" },
                { "d": "Di", "type": "WUSHU", "color": "#C95169", "title": "Taolu / Taiji", "note": "Skill-Tag. Optional Finisher: 1 kompletter Routine-Durchlauf bei Tempo.", "load": "HART" },
                { "d": "Mi", "type": "GYM", "color": "#D9738A", "title": "Maximalkraft & Core", "note": "Oberkörper-Bias + Rumpf. Beinschonend – Beine bleiben frisch für Do.", "load": "MITTEL" },
                { "d": "Do", "type": "WUSHU", "color": "#C95169", "title": "Taolu / Taiji", "note": "Skill-Tag. In Phase 3: Kombinationen & Sprung-in-Pose betonen.", "load": "HART" },
                { "d": "Fr", "type": "GYM", "color": "#2E6F40", "title": "Balance, Landung & reaktive Plyo", "note": "Standbein, Landemechanik, Sprunggelenk-Steifigkeit + Mobility. Primt Sa.", "load": "MITTEL" },
                { "d": "Sa", "type": "WUSHU", "color": "#C95169", "title": "Taolu / Taiji", "note": "Skill + Wettkampf-Simulation (komplette Routine bei Wettkampf-Intensität).", "load": "HART" },
                { "d": "So", "type": "GYM", "color": "#3B7A57", "title": "Regeneration & Tiefen-Flexibilität", "note": "Deload: Taiji, Spagat-Progression, Yin, Visualisierung. Kein CNS-Stress.", "load": "LEICHT" }
            ],
            "phases": [
                { "color": "#2E6F40", "title": "Phase 1 · Aufbau", "sub": "Wochen 1–5 · ca. bis Ende Juli", "desc": "Fundament: Maximalkraft, Arbeitskapazität, vor allem Flexibilität (entwickelt sich langsam). Plyometrie extensiv (mehr Bodenkontakte, moderate Intensität). Landemechanik sauber lernen." },
                { "color": "#A87500", "title": "Phase 2 · Power-Umwandlung", "sub": "Wochen 6–10 · ca. August", "desc": "Kraft in Explosivität umwandeln: Tiefensprünge, Drehsprünge, Bounding im Fokus (intensiv, weniger Kontakte, volle Pausen). Kontrastmethode ausbauen. Erste Kombinationen." },
                { "color": "#C95169", "title": "Phase 3 · Wettkampfspezifik", "sub": "Wochen 11–14 · ca. September", "desc": "Sprung-in-Pose, komplette Routinen bei Tempo, Ausdauer-Spezifik. Kraft/Power/Flexibilität mit reduziertem Volumen halten. Alles wettkampfscharf stellen." },
                { "color": "#3B7A57", "title": "Taper · Peak", "sub": "Letzte ~7–10 Tage", "desc": "Volumen ~40–50 % runter, Intensität & Schärfe halten. Viel Routine-Durchlauf & Visualisierung, top Erholung. Letzte 2–3 Tage sehr locker → frisch am 3.10." }
            ],
            "deloadNote": "Alle 3–4 Wochen eine Deload-Woche einschieben (Volumen ~40–50 % runter), nicht nur den Taper am Ende. Der Wochenrhythmus bleibt gleich, nur der Schwerpunkt wandert mit den Phasen.",
            "sessions": [
                {
                    "day": "Montag", "icon": "⚡", "color": "#A87500", "title": "Sprungkraft & Explosivkraft", "sub": "Plyometrie + Unterkörper-Power · 90–120 Min",
                    "target": "Vertikale & rotatorische Sprungkraft für Xuanfeng Jiao, Tengkong Feijiao, Cejixing (Butterfly) und saubere 360°-Landungen.",
                    "blocks": [
                        {
                            "kind": "warmup", "name": "Warm-Up", "time": "15–20 Min", "sub": "RAMP: Raise · Activate · Mobilize · Potentiate",
                            "items": [
                                { "n": "Raise", "detail": "5 Min Seilspringen oder lockeres Laufen + Wushu-Grundschritte – Kreislauf & Sprunggelenke wecken." },
                                { "n": "Mobilize", "detail": "Beinschwünge vor/zurück & seitlich 12×/Seite, Beinkreisen, tiefer Ausfallschritt mit Rotation, Ankle Rocks." },
                                { "n": "Activate", "detail": "Glute Bridges 15, Banded Lateral Walks 15/Seite, Wadenheben 20 – Hüfte & Sprunggelenk-Steifigkeit aktivieren." },
                                { "n": "Potentiate", "detail": "Pogo Hops 2×15 niedrig-reaktiv, dann 3–5 submaximale Absprünge progressiv bis zur vollen Höhe." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block A · Plyometrie (Wushu-spezifisch)", "time": "~25–30 Min", "sub": "Von reaktiv zu maximal. Qualität vor Menge – volle Pausen, aufhören sobald Höhe/Explosivität nachlässt.",
                            "items": [
                                { "n": "Tuck Jumps (Knie zur Brust)", "s": "4 Sätze", "r": "5 Wdh", "p": "60 Sek", "d": "Explosiv hochspringen, Knie maximal zur Brust ziehen, weich landen. Fokus auf Höhe und schnellen Knie-Anzug.", "wt": "Der Knie-Anzug in der Luft ist genau die Position vieler Taolu-Sprungposen – trainiert Höhe + Körperkontrolle.", "pe": "Lockeres Ausschütteln der Beine", "pd": "Beine ausschütteln + 2–3 lockere Grundschritte – Muskeln locker halten ohne zu ermüden." },
                                { "n": "Drehsprünge 180° / 360°", "s": "4 Sätze", "r": "4 je Richtung", "p": "75 Sek", "d": "Aus tiefer Hocke explosiv abspringen, 180° (später 360°) drehen, in Hocke landen. Kopf leitet die Drehung, Blick zuerst.", "wt": "Direkter Übertrag auf Xuanfeng Jiao und 360°-Landungen – Rotationskraft + räumliche Orientierung.", "pe": "Kontrollierte Drehung im Stand", "pd": "Langsame 360°-Drehung im Stand mit Spotting des Kopfes – Orientierung ohne Sprungbelastung schulen." },
                                { "n": "Tiefensprünge (Depth Jumps)", "s": "4 Sätze", "r": "4 Wdh", "p": "90 Sek", "d": "Von Box (30–40 cm) herunterfallen, bei Bodenkontakt sofort explosiv maximal hoch abspringen. Ziel: minimale Bodenkontaktzeit.", "wt": "Reaktivkraft für schnelle Mehrfachsprünge und Technikketten ohne Höhenverlust.", "pe": "Taiji Cloud Hands (Yun Shou)", "pd": "Fließende Handbewegungen mit Gewichtsverlagerung – mentaler Reset zwischen intensiven Sätzen." },
                                { "n": "Bounding (Weitsprunglauf)", "s": "3 Sätze", "r": "20–30 m", "p": "90 Sek", "d": "Große, explosive Sprungschritte mit maximaler Luftphase, Arme aktiv schwingen, Körper gespannt.", "wt": "Horizontale Power + Körperspannung in der Luft = mehr Höhe und sauberere Luftposen im Taolu.", "pe": "Hüftkreisen & Bein-Pendel", "pd": "Lockeres Hüftkreisen + seitliches Bein-Pendeln – mobilisieren für den nächsten Satz." },
                                { "n": "Sprung-in-Pose (Wettkampf-Transfer)", "s": "4 Sätze", "r": "4 Wdh", "p": "90 Sek", "d": "Explosiver Absprung (Xuanfeng-Imitat) → Landung direkt in stabiler Pose (Ma Bu, Gong Bu oder Einbein-Yan-Shi), 2–3 Sek einfrieren ohne Wackeln.", "wt": "Die Fähigkeit, aus dem Sprung sofort sauber & stabil zu landen, entscheidet über Wertungspunkte.", "pe": "Slow-Motion Pose-Halten", "pd": "Zielpose langsam einnehmen und 8 Sek halten – motorisches Muster ohne Absprungstress verankern." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block B · Unterkörper-Power (Kontrastmethode)", "time": "~20–25 Min", "sub": "Schwere Kraft → direkt explosiv (Post-Aktivierungs-Potenzierung). Kraft NICHT bis zum Versagen.",
                            "items": [
                                { "n": "Back Squat / Trap-Bar Deadlift + Box Jumps", "s": "4 Sätze", "r": "4 @ ~80% + 3 Jumps", "p": "2–3 Min", "d": "Schwerer Kraftsatz (4 Wdh, ~80 %), dann 30–60 Sek Pause, dann 3 maximale Box Jumps. Das Paar 4×. Kern der Sprungkraft-Entwicklung.", "wt": "Kontrast koppelt Maximalkraft an Explosivität – der effektivste Weg zu mehr vertikaler Sprunghöhe.", "pe": "Mobilisation Hüfte", "pd": "Zwischen den Paaren Hüftbeuger/Adduktoren locker mobilisieren – bereit für den nächsten Kontrast." },
                                { "n": "Bulgarian Split Squat", "s": "3 Sätze", "r": "6 pro Bein", "p": "75 Sek", "d": "Hinterer Fuß erhöht, tief absenken, kontrolliert hoch. Optional Kurzhanteln. Einbeinige Kraft für Absprung & Landung.", "wt": "Einbeinkraft = stärkeres Standbein für einbeinige Absprünge und stabile Posen.", "pe": "Gong-Bu-Halten", "pd": "In tiefen Gong Bu absinken, 10 Sek halten – aktive Pause mit Hüftdehnung." },
                                { "n": "Nordic Curls / Rumänisches Kreuzheben", "s": "3 Sätze", "r": "6–8 Wdh", "p": "75 Sek", "d": "Hintere Kette (Hamstrings/Glutes). Nordic exzentrisch langsam ablassen, oder RDL mit sauberem Hüft-Hinge.", "wt": "Starke Hamstrings schützen Knie & Rücken bei harten Landungen und geben Absprungkraft.", "pe": "Lockeres Bein-Pendel", "pd": "Hamstrings locker vor/zurück ausschwingen – Durchblutung ohne neue Belastung." },
                                { "n": "Wadenheben (stehend schwer + sitzend)", "s": "3+2 Sätze", "r": "10 + 15 Wdh", "p": "60 Sek", "d": "Stehend schwer (Gastrocnemius) und sitzend höhere Wdh (Soleus). Volle Bewegungsamplitude.", "wt": "Sprunggelenk-Antrieb & -Steifigkeit = der letzte Impuls jedes Absprungs und stabile Landungen.", "pe": "Sprunggelenk-Mobilisation", "pd": "Sprunggelenk kreisen und wippen – Beweglichkeit für saubere Absprünge halten." }
                            ]
                        },
                        {
                            "kind": "cooldown", "name": "Cool-Down", "time": "10–15 Min", "sub": "CNS herunterfahren nach der Plyo-Belastung",
                            "items": [
                                { "n": "Ausrollen / Gehen", "detail": "3–5 Min lockeres Gehen oder Radeln – Herzfrequenz senken, Blut aus den Beinen pumpen." },
                                { "n": "Statisches Dehnen", "detail": "Quadrizeps, Waden, Hüftbeuger, Glutes – je 30 Sek. Ruhig atmen, nicht wippen." },
                                { "n": "Atmung / CNS-Reset", "detail": "5 Min Box-Breathing (4-4-4-4) im Liegen – parasympathisch schalten nach der Explosivbelastung." },
                                { "n": "Optional Foam Rolling", "detail": "Quads & Waden 1–2 Min – Muskeltonus senken für schnellere Erholung." }
                            ]
                        }
                    ]
                },
                {
                    "day": "Mittwoch", "icon": "💪", "color": "#D9738A", "title": "Maximalkraft & Core", "sub": "Oberkörper-Bias + Rumpf · beinschonend · 90–120 Min",
                    "target": "Rumpf- & Oberkörperkraft (Waffenführung Qiang/Dao/Jian), Ganzkörperspannung. Beine bewusst schonen für Do-Wushu.",
                    "blocks": [
                        {
                            "kind": "warmup", "name": "Warm-Up", "time": "12–15 Min", "sub": "Oberkörper & Rumpf vorbereiten",
                            "items": [
                                { "n": "Raise", "detail": "4 Min Rudergerät oder Seilspringen – Kreislauf hoch, Schultergürtel warm." },
                                { "n": "Mobilize", "detail": "Schulterkreisen, Band Dislocates, Brustwirbel-Rotation, Cat-Cow, Handgelenks-Prep (für Waffen)." },
                                { "n": "Activate", "detail": "Band Pull-Aparts 15, Dead Bug 10/Seite, Bird-Dog 10/Seite – Schulterblatt & tiefe Rumpfmuskulatur." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block A · Kraft (Oberkörper + Glutes)", "time": "~35 Min", "sub": "Zug/Druck ausbalanciert. Hip Thrust statt Squat = Glute-Kraft ohne Quad-Ermüdung.",
                            "items": [
                                { "n": "Klimmzüge", "s": "4 Sätze", "r": "6–8 Wdh", "p": "90 Sek", "d": "Voller Zug aus gestreckten Armen. Zu leicht? Gewicht anhängen. Zu schwer? Band oder Negativ-Wdh.", "wt": "Zug- & Griffkraft für Waffenkontrolle und Halten von Positionen.", "pe": "Band-Schulterdislokationen", "pd": "Band locker über Kopf und zurück führen – Schultergürtel mobil halten." },
                                { "n": "Overhead / Push Press", "s": "4 Sätze", "r": "6 Wdh", "p": "90 Sek", "d": "Langhantel oder Kurzhanteln über Kopf drücken, Rumpf fest. Push Press erlaubt etwas Beinimpuls für mehr Last.", "wt": "Schulterkraft & Überkopf-Stabilität für Speer- und Stabformen.", "pe": "Brustwirbel-Rotation", "pd": "Im Stand sanft nach links/rechts rotieren – Brustwirbelsäule geschmeidig für Überkopfarbeit." },
                                { "n": "Dips (ggf. mit Gewicht)", "s": "3 Sätze", "r": "8 Wdh", "p": "75 Sek", "d": "Kontrolliert absenken bis Oberarme parallel, kraftvoll hoch. Schultern tief & stabil.", "wt": "Druckkraft für Stöße und explosive Armbewegungen.", "pe": "Scapula-Slides an der Wand", "pd": "Arme an der Wand hoch/runter gleiten – Schulterblatt-Steuerung aktiv halten." },
                                { "n": "Langhantelrudern", "s": "3 Sätze", "r": "8 Wdh", "p": "75 Sek", "d": "Hüft-Hinge, Rücken flach, Hantel zum unteren Brustkorb ziehen. Kontrollierte Bewegung.", "wt": "Kräftiger oberer Rücken = aufrechte Haltung und Rotationskraft für Waffenschwünge.", "pe": "Katze–Kuh", "pd": "Wirbelsäule runden und strecken – Rücken locker zwischen den Zügen." },
                                { "n": "Hip Thrust", "s": "3 Sätze", "r": "10 Wdh", "p": "75 Sek", "d": "Schultern auf Bank, Langhantel über der Hüfte, oben voll strecken & Glutes anspannen.", "wt": "Starke Glutes treiben Absprünge an, ohne die Quads für Do-Wushu zu ermüden.", "pe": "Hüftbeuger-Ausfallschritt", "pd": "Kurzer tiefer Ausfallschritt je Seite – Hüftbeuger als Gegenspieler der Glutes öffnen." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block B · Core & Ganzkörperspannung", "time": "~20 Min", "sub": "Wushu-kritisch: Luftposen, hohe Tritte, Drehstabilität.",
                            "items": [
                                { "n": "Dragon Flag", "s": "3 Sätze", "r": "5 Wdh", "p": "75 Sek", "d": "An Bank: Schultern als Stützpunkt, Körper gestreckt heben und langsam kontrolliert absenken.", "wt": "Ganzkörperspannung im Sprung und in Luftposen = professionelles Erscheinungsbild.", "pe": "Hollow-Hold locker", "pd": "10 Sek lockerer Hollow-Hold – Spannung halten, aber Intensität senken." },
                                { "n": "Hängendes Beinheben", "s": "4 Sätze", "r": "10–12 Wdh", "p": "60 Sek", "d": "An der Stange hängend Beine gestreckt auf 90° oder höher, kontrolliert ablassen.", "wt": "Starke Hüftbeuger = höhere, kontrollierte Tritte und stabilere Sprungpositionen.", "pe": "Lockeres Aushängen", "pd": "Entspannt an der Stange hängen und atmen – Wirbelsäule und Griff dekomprimieren." },
                                { "n": "Pallof Press (Anti-Rotation)", "s": "3 Sätze", "r": "10 pro Seite", "p": "45 Sek", "d": "Kabel/Band seitlich, Arme vor der Brust ausstrecken und halten, Rumpf gegen die Rotation stabil.", "wt": "Rotationsstabilität = Kontrolle bei Drehsprüngen und schnellen Richtungswechseln.", "pe": "Yun Shou (Cloud Hands)", "pd": "Ein paar fließende Cloud-Hands-Bewegungen – Rotation locker statt statisch." },
                                { "n": "Hollow Hold + Superman-Wechsel", "s": "3 Sätze", "r": "je 20–30 Sek", "p": "45 Sek", "d": "Hollow und Superman im Wechsel. Saubere Körperlinien.", "wt": "Vordere & hintere Kette gleichermaßen = ausdrucksstarke, gerade Linien in den Formen.", "pe": "Child's Pose + Atmung", "pd": "Kurz in Child's Pose tief in den Bauch atmen – Rumpf zwischen den Sätzen lösen." }
                            ]
                        },
                        {
                            "kind": "cooldown", "name": "Cool-Down", "time": "10 Min", "sub": "",
                            "items": [
                                { "n": "Oberkörper dehnen", "detail": "Brust, Lat, Schultern, Handgelenke – je 30 Sek." },
                                { "n": "Wirbelsäule lösen", "detail": "Cat-Cow & Child's Pose 1–2 Min – Rücken entspannen." },
                                { "n": "Atmung", "detail": "4–5 Min ruhige Bauchatmung." }
                            ]
                        }
                    ]
                },
                {
                    "day": "Freitag", "icon": "🌊", "color": "#2E6F40", "title": "Balance, Landung & reaktive Plyometrie", "sub": "Standbein · Landemechanik · Mobility · 90–120 Min",
                    "target": "Einbein-Stabilität, saubere Landungen, Sprunggelenk-Steifigkeit und Beweglichkeit. Beinschonend vor Sa.",
                    "blocks": [
                        {
                            "kind": "warmup", "name": "Warm-Up", "time": "12–15 Min", "sub": "",
                            "items": [
                                { "n": "Raise", "detail": "4 Min lockeres Springen & Grundschritte." },
                                { "n": "Mobilize", "detail": "Dynamische Beinschwünge in alle Richtungen, Hüft-CARs, Sprunggelenks-Mobilität." },
                                { "n": "Activate", "detail": "Single-Leg Glute Bridge 10/Seite, Zehen-/Fersengang, Einbeinstand 30 Sek/Bein als Einstieg." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block A · Reaktive/elastische Plyometrie", "time": "~20 Min", "sub": "Niedrige Intensität, hohe Frequenz. Sehnensteifigkeit & Landung – wenig Ermüdung.",
                            "items": [
                                { "n": "Pogo Hops (beid- → einbeinig)", "s": "4 Sätze", "r": "20 Kontakte", "p": "45 Sek", "d": "Kleine, schnelle Sprünge nur aus dem Sprunggelenk, Knie fast gestreckt.", "wt": "Baut die Sprunggelenk-Steifigkeit, die jedem Absprung den letzten Schnalz gibt.", "pe": "Fersen-/Zehengang", "pd": "Ein paar Schritte auf Zehen und Fersen – Sprunggelenk aktiv, aber locker." },
                                { "n": "Ladder / Line Hops", "s": "4 Sätze", "r": "20 Sek", "p": "45 Sek", "d": "Schnelle Sprünge vor/zurück & seitlich über eine Linie.", "wt": "Schnelle Fußarbeit & Reaktivität für dichte Schritt- und Sprungfolgen im Taolu.", "pe": "Lockeres Auslaufen", "pd": "3–4 lockere Grundschritte – Beine locker, Herzfrequenz stabil." },
                                { "n": "Single-Leg Bounds mit 2-Sek-Landung", "s": "3 Sätze", "r": "6 pro Bein", "p": "60 Sek", "d": "Einbeinig nach vorne springen, weich landen und 2 Sek stabil halten.", "wt": "Verbindet Sprungkraft mit sofort stabiler Einbein-Landung – der kritische WK-Moment.", "pe": "Standbein-Reset", "pd": "Ruhiger Einbeinstand je Seite 10 Sek – Standbein neu zentrieren." },
                                { "n": "Drop & Stick", "s": "4 Sätze", "r": "5 Wdh", "p": "60 Sek", "d": "Von Box (30 cm) abspringen und in sauberer Pose „einfrieren“.", "wt": "Perfekte Landemechanik = Wertungspunkte + Schutz vor Knie-/Sprunggelenksverletzungen.", "pe": "Hocke-Mobilisation", "pd": "Langsam in tiefe Hocke sinken und wieder hoch – Landeposition sauber einprägen." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block B · Balance & Einbein-Kraft", "time": "~25 Min", "sub": "Das Fundament aller Einbein-Posen in Taolu & Taiji.",
                            "items": [
                                { "n": "Pistol Squats", "s": "3 Sätze", "r": "4 pro Bein", "p": "60 Sek", "d": "Einbeinig tief absenken, Gegenbein gestreckt vorne, Ferse am Boden.", "wt": "Standbeinkraft für Tan Tui, Pu Bu und alle einbeinigen Posen.", "pe": "Taiji Single Whip", "pd": "Single Whip langsam, Gewicht voll auf ein Bein – kontrollierter Transfer als aktive Pause." },
                                { "n": "Y-/Star-Balance", "s": "3 Sätze", "r": "8 Richtungen/Bein", "p": "45 Sek", "d": "Einbeinig stehen, Gegenbein maximal in verschiedene Richtungen ausstrecken.", "wt": "3D-Balance-Muster für jede Einbeinstand-Pose.", "pe": "Sprunggelenk-Kreisen", "pd": "Freies Bein anheben, Sprunggelenk kreisen – Kontrolle im Fußgelenk halten." },
                                { "n": "Arabesque / Yan-Shi-Hold", "s": "4 Sätze", "r": "25 Sek/Seite", "p": "30 Sek", "d": "Einbeinig, Körper vorneigen, freies Bein nach hinten-oben, Arm nach vorn.", "wt": "Direkte Vorbereitung auf Yan Shi + Rumpfkraft für die Halteposition.", "pe": "Yun Shou gehend", "pd": "3–4 Schritte Cloud Hands – sanfter Übergang zum nächsten Satz." },
                                { "n": "Einbeinstand instabil + Störung", "s": "3 Sätze", "r": "40 Sek/Bein", "p": "30 Sek", "d": "Auf Balance-Pad stehen, Augen schließen oder Kopf/Arme bewegen.", "wt": "Ruhige, sichere Posen auch unter Störung – wie unter Wettkampfdruck.", "pe": "Taiji-Gewichtsverlagerung", "pd": "Langsam Gewicht von Bein zu Bein schieben – Balance in Bewegung halten." },
                                { "n": "Jinshu Duli (Golden Rooster)", "s": "3 Sätze", "r": "20 Sek/Bein", "p": "30 Sek", "d": "Einbeinstand mit angehobenem Knie, aufrecht & ruhig. Klassische Taiji-Balancepose.", "wt": "Balance-Ausdauer und Zentrierung direkt aus der Form.", "pe": "Yun Shou gehend", "pd": "2–3 Schritte Cloud Hands – sanfter Übergang, Zentrierung halten." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Block C · Mobility & Flexibilität", "time": "~15 Min", "sub": "Dynamisch + PNF – hält Kick-Höhe und Hüftöffnung.",
                            "items": [
                                { "n": "PNF Hamstring-Dehnung", "s": "3 Sätze", "r": "30 Sek/Bein", "p": "30 Sek", "d": "Bein heben, 10 Sek isometrisch gegen die Hand drücken, lösen, tiefer sinken.", "wt": "Direkt für Zhengti-Tui-Höhe – gleicher Muskel, optimale Methode.", "pe": "Aktives Bein-Anheben", "pd": "Bein leicht aktiv heben und senken – Kontrolle im neu gewonnenen Bereich." },
                                { "n": "Dynamische Kicks (alle Richtungen)", "s": "2 Sätze", "r": "12/Richtung", "p": "kurz", "d": "Zhengti (vorne), Chaoti (schräg), Cebai (seitlich) progressiv höher schwingen.", "wt": "Aktive Beweglichkeit genau in den Kick-Mustern des Taolu.", "pe": "Hüftkreisen", "pd": "Lockeres Hüftkreisen – Hüftgelenk warm und geschmeidig halten." },
                                { "n": "Couch Stretch (Hüftbeuger)", "s": "2 Sätze", "r": "45 Sek/Seite", "p": "kurz", "d": "Hinteres Knie an der Wand, Oberkörper aufrecht, Becken nach vorne kippen.", "wt": "Offene Hüftbeuger = tiefere Rückbeuge, freieres Kicken, mehr Absprungweg.", "pe": "Glute-Aktivierung", "pd": "Kurze Glute-Anspannung im Stand – Gegenspieler nach der Dehnung aktivieren." }
                            ]
                        },
                        {
                            "kind": "cooldown", "name": "Cool-Down", "time": "8–10 Min", "sub": "",
                            "items": [
                                { "n": "Leichtes Dehnen", "detail": "Waden, Hüfte, Hamstrings locker halten – je 30 Sek." },
                                { "n": "Fußsohlen ausrollen", "detail": "Ball unter dem Fuß 1 Min/Seite – Faszien & Sprunggelenk lockern." },
                                { "n": "Atmung", "detail": "4 Min ruhige Bauchatmung." }
                            ]
                        }
                    ]
                },
                {
                    "day": "Sonntag", "icon": "☯️", "color": "#3B7A57", "title": "Regeneration & Tiefen-Flexibilität", "sub": "Deload – der Tag, der die 7-Tage-Woche tragbar macht · 60–90 Min",
                    "target": "Aktive Erholung, Beweglichkeit ohne Kraftbedarf, CNS-Reset. Bewusst LEICHT halten.",
                    "blocks": [
                        {
                            "kind": "warmup", "name": "Aufwärmen", "time": "10 Min", "sub": "",
                            "items": [
                                { "n": "Lockeres Cardio", "detail": "5–8 Min Radeln, Gehen oder leichtes Joggen – Blutfluss, Gewebe warm für tiefe Dehnung." }
                            ]
                        },
                        {
                            "kind": "main", "name": "Hauptteil (leicht)", "time": "~40–50 Min", "sub": "Regeneration, die gleichzeitig Technik & Beweglichkeit vertieft.",
                            "items": [
                                { "n": "Vollständige Taiji-Form (2×)", "s": "2 Durchgänge", "r": "ganze Form", "p": "nach Gefühl", "d": "Langsam & bewusst, jede Bewegung fühlen, Atmung synchronisieren.", "wt": "Taiji als Erholung: Muskeln regenerieren und Technik vertieft sich zugleich.", "pe": "Wuji-Atmung", "pd": "Zwischen den Durchgängen 5 tiefe Atemzüge im ruhigen Stand." },
                                { "n": "Spagat-Progression (Front & Seit)", "s": "3 Sätze", "r": "60–90 Sek/Position", "p": "20 Sek", "d": "Progressiv tiefer, Hände auf Blöcken, Hüften ausrichten.", "wt": "Spagat = Fundament für hohe Tritte und Boden-Akrobatik.", "pe": "Sanftes Bein-Pendel", "pd": "Zwischen den Positionen locker das Bein schwingen – Durchblutung fördern." },
                                { "n": "Frog Stretch + Brücke", "s": "3 Sätze", "r": "45 Sek / 20 Sek", "p": "30 Sek", "d": "Frosch für Hüft-Innenrotation; Brücke für Brustwirbelsäule & Schultern.", "wt": "Hüftöffnung für Ma Bu & Seitspagat, Rückbeuge-Öffnung für Akrobatik-Elemente.", "pe": "Katze–Kuh", "pd": "Ein paar Cat-Cow-Bewegungen – Wirbelsäule zwischen den Öffnungen lösen." },
                                { "n": "Yin Yoga / passives Dehnen", "s": "1 Einheit", "r": "je 2–3 Min", "p": "–", "d": "Hüfte, Hamstrings, Schultern passiv halten. Kein Kraftaufwand.", "wt": "Regeneriert Faszien & Bindegewebe, bereitet den Körper auf die nächste Woche vor.", "pe": "Bewusste Ausatmung", "pd": "Beim Positionswechsel lang ausatmen – tiefer ins Gewebe nachgeben." },
                                { "n": "Zhan Zhuang + Visualisierung", "s": "1 Einheit", "r": "5 + 10–15 Min", "p": "–", "d": "5 Min Standmeditation, dann liegend die komplette Taolu mental durchgehen.", "wt": "Mentales Training verbessert die Ausführung messbar – Fortschritt ohne körperlichen Stress.", "pe": "Sanftes Ausschütteln", "pd": "Kurz locker ausschütteln oder gehen, bevor du in Ruhe/Visualisierung gehst." }
                            ]
                        },
                        {
                            "kind": "cooldown", "name": "Ausklang", "time": "5–10 Min", "sub": "",
                            "items": [
                                { "n": "Atemarbeit", "detail": "Ruhige, lange Ausatmung – Parasympathikus aktivieren." },
                                { "n": "Optional Foam Rolling", "detail": "Ganzkörper locker ausrollen – Tonus senken für die kommende Woche." }
                            ]
                        }
                    ]
                }
            ],
            "wushuDays": [
                { "d": "Dienstag", "note": "Skill/Technik-Fokus. Kurzes eigenes dynamisches Warm-Up. Optional Finisher: 1 kompletter Taolu-Durchlauf bei Wettkampftempo." },
                { "d": "Donnerstag", "note": "Skill-Fokus. In Phase 3 Kombinationen & Sprung-in-Pose betonen. Immer Warm-Up vorher, Dehnen danach." },
                { "d": "Samstag", "note": "Skill + Wettkampf-Simulation: komplette Routine bei Wettkampf-Intensität." }
            ],
            "coachTips": [
                "7 Trainingstage ohne echten Ruhetag ist am oberen Limit. Sonntag deshalb strikt LEICHT halten. Autoregulation: bei schlechtem Schlaf oder Muskelkater Gym-Tag streichen.",
                "Plyometrie = Qualität vor Menge. Bodenkontakte zählen (~80–120/Session im Aufbau), volle Pausen, aufhören sobald Höhe/Schnelligkeit nachlässt.",
                "Kontrastmethode (Mo, Block B) ist der stärkste Hebel für vertikale Sprungkraft – schwere Kraft potenziert den folgenden Sprung.",
                "Landemechanik ernst nehmen (Drop & Stick): schützt Knie/Sprunggelenk und bringt direkt Wertungspunkte.",
                "Der Mo-Gym-Tag liegt vor Di-Wushu. Kraft submaximal halten (nicht bis Versagen). Fühlen sich die Beine Di schwer an: Wushu-Technik geht vor.",
                "Erholung ist bei 7-Tage-Last kein Extra: 7–9 h Schlaf, ausreichend Protein (~1,6–2 g/kg) und genug Kohlenhydrate.",
                "Fortschritt messbar machen bis 3.10.: Sprunghöhe, Spagat-Tiefe und die wichtigsten Kraftwerte notieren."
            ],
            "nextGoal": {
                "heading": "Ausblick · Ziel Anfang 2027",
                "intro": "Nach der DM am 3.10. startet ein neuer Makrozyklus. Hier der anpassbare Fahrplan für Saison 2.",
                "phases": [
                    { "color": "#3B7A57", "title": "Übergang / Erholung", "sub": "ca. 1–2 Wochen nach dem 3.10.", "desc": "Aktive Erholung, kein strukturiertes Krafttraining, Kopf frei." },
                    { "color": "#2E6F40", "title": "Off-Season · Kraft- & Beweglichkeitsbasis", "sub": "ca. November – Mitte Dezember", "desc": "Kraftniveau anheben, Flexibilität hart pushen, DM-Schwächen gezielt angehen." },
                    { "color": "#A87500", "title": "Power-Umwandlung", "sub": "ca. Mitte Dezember – Anfang Januar", "desc": "Kraft wieder in Explosivität umwandeln: Plyometrie & Kontrastmethode hochfahren." },
                    { "color": "#C95169", "title": "Wettkampfspezifik + Taper", "sub": "ca. Januar bis zum Zieltermin", "desc": "Routine wettkampfscharf stellen, Simulationen, dann Taper." }
                ],
                "tips": [
                    "Direkt nach der DM eine echte Ruhewoche einlegen.",
                    "Off-Season nutzen, um Kraft- und Beweglichkeitsniveau anzuheben.",
                    "An der DM identifizierte Schwächen jetzt gezielt bearbeiten.",
                    "Ein neues/höherwertiges Sprungelement in der Off-Season lernen.",
                    "Deload-Kultur beibehalten (alle 3–4 Wochen)."
                ]
            }
        };
