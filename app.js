/* =====================================================================
   Sakura & Jade WorkFlow – lokale, offlinefähige Produktivitäts-App
   Speicher: IndexedDB (Gerätespeicher) · keine Server, keine Cloud
   ===================================================================== */
'use strict';

/* ---------- Helfer ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addKey = (k, n) => dkey(addDays(parseD(k), n));
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const dow = d => (d.getDay() + 6) % 7; // Mo = 0
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const fmtDate = k => { const d = parseD(k); return `${DAYS[dow(d)]}, ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
const fmtShort = k => { const d = parseD(k); return `${d.getDate()}.${d.getMonth() + 1}.`; };
const fmtDur = sec => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`; };
const fmtHours = sec => (sec / 3600).toFixed(1).replace('.', ',') + ' h';
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const today = () => dkey();

/* ---------- Speicher: IndexedDB mit localStorage-Fallback ---------- */
const KV = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open('sakura-jade', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { KV.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  get(k) {
    return new Promise((res, rej) => {
      if (!KV.db) return res(undefined);
      const q = KV.db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  },
  set(k, v) {
    return new Promise((res, rej) => {
      if (!KV.db) return rej(new Error('no db'));
      const tx = KV.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
};

/* ---------- Zustand ---------- */
let S = null;
const COLORS = ['pink', 'jade', 'gold', 'gray'];
const MOD_COLORS = ['#C95169', '#3B7A57', '#D4A017', '#5B86B8', '#8E63B5', '#D07F45'];
const AREAS = { uni: '📚 Uni', work: '💻 Work', wushu: '🥋 Wushu', privat: '🏠 Privat' };

function defaults() {
  return {
    v: 1,
    settings: {
      theme: 'auto', studyGoalMin: 60, sound: true,
      pomo: { focus: 25, short: 5, long: 15, every: 4 },
      autoReplan: true, petals: true, studyFrom: '08:00', studyTo: '21:00', trainFrom: '18:00', trainTo: '20:00', blockMin: 50,
      goal2: { event: 'Nächster Wettkampf (Anfang 2027)', date: '2027-02-06' },
      goal: { event: (typeof WUSHU_DATA !== 'undefined' && WUSHU_DATA.goal.event) || 'Wettkampf', date: '2026-10-03' },
      semester: {}, workLead: 14, wg: {}, palette: 'sakura', bgTone: 'warm', uiScale: 100, userName: '', navOrder: [], navHide: [], dashHide: {}, auto: {}, lastBackup: 0, budget: 0, wage: 0, nativeRemind: false, remindLead: 15
    },
    statuses: ['Offen', 'In Bearbeitung', 'Abgeschlossen'],
    tags: [
      { id: 't-imp', name: 'Wichtig', color: 'pink' },
      { id: 't-rep', name: 'Wiederholen', color: 'gold' },
      { id: 't-exam', name: 'Prüfungsrelevant', color: 'jade' }
    ],
    modules: [], tasks: [], notes: [], cards: [], events: [], sessions: [], milestones: [],
    habits: [{ id: 'h-study', name: 'Lernziel erreicht', auto: 'study' }, { id: 'h-train', name: 'Wushu / Gym', auto: null }],
    habitLog: {}, wushuDone: {}, ach: {}, workouts: [], workout: null, course: {}, workLog: {}, workClock: null, expenses: [], noWork: {}, checkins: {}, deloadUntil: '', deloadDismiss: '', packlist: {}, reviews: {}, exLast: {}, suggOff: {}, langInit: false,
    metrics: [
      { id: 'mt-jump', name: 'Sprunghöhe', unit: 'cm', up: true },
      { id: 'mt-squat', name: 'Back Squat (4 Wdh)', unit: 'kg', up: true },
      { id: 'mt-pull', name: 'Klimmzüge', unit: 'Wdh', up: true },
      { id: 'mt-split', name: 'Spagat: Abstand zum Boden', unit: 'cm', up: false }
    ], measures: [],
    timer: { mode: 'pomodoro', phase: 'focus', duration: 1500, elapsed: 0, startedAt: null, moduleId: null, pomos: 0, pomoDate: '' }
  };
}

function seed() {
  const d = defaults();
  const mod = { id: 'm-' + uid(), start: today(), name: 'Makroökonomie', color: MOD_COLORS[0], exam: '2026-11-15', chapters: 8, buffer: 4, goalH: 40, plan: [], u: Date.now() };
  mod.plan = buildPlan(mod, today());
  d.modules.push(mod);
  const now = Date.now();
  d.tasks.push(
    { id: uid(), title: 'Kundenangebot überarbeiten', area: 'work', status: 'Offen', tags: [], due: '', moduleId: null, prio: 'mittel', created: now, u: now },
    { id: uid(), title: 'Projektdokumentation', area: 'work', status: 'In Bearbeitung', tags: [], due: '', moduleId: null, prio: 'hoch', created: now, u: now },
    { id: uid(), title: 'Wochen-Meeting vorbereiten', area: 'work', status: 'Abgeschlossen', tags: [], due: '', moduleId: null, prio: 'niedrig', created: now, doneAt: now, u: now }
  );
  [['Was misst das BIP?', 'Den Wert aller im Inland in einer Periode produzierten Endprodukte (Waren und Dienstleistungen).'],
   ['Nominales vs. reales BIP?', 'Nominal: zu laufenden Preisen. Real: zu konstanten Preisen, also inflationsbereinigt.'],
   ['Was beschreibt die Okun-Regel?', 'Den Zusammenhang zwischen Veränderung der Arbeitslosenquote und dem Wirtschaftswachstum.']]
    .forEach(([f, b]) => d.cards.push({ id: uid(), moduleId: mod.id, front: f, back: b, due: today(), interval: 0, ease: 2.5, reps: 0, lapses: 0, u: now }));
  d.milestones.push({ id: uid(), title: 'Makroökonomie: Kapitel 1–4 durcharbeiten', done: false, u: now });
  return d;
}

function mergeLoaded(loaded) {
  const base = defaults();
  const out = { ...base, ...loaded };
  out.settings = { ...base.settings, ...(loaded.settings || {}), pomo: { ...base.settings.pomo, ...((loaded.settings || {}).pomo || {}) }, goal: { ...base.settings.goal, ...((loaded.settings || {}).goal || {}) }, goal2: { ...base.settings.goal2, ...((loaded.settings || {}).goal2 || {}) } };
  out.timer = { ...base.timer, ...(loaded.timer || {}) };
  return out;
}

let saveT = null, wiping = false;
function save() { clearTimeout(saveT); saveT = setTimeout(persist, 250); }
async function persist() {
  clearTimeout(saveT);
  if (wiping) return;
  try { await KV.set('state', S); }
  catch (e) { try { localStorage.setItem('sj-state', JSON.stringify(S)); } catch (_) { /* voll */ } }
  if (typeof flWrite === 'function') flWrite();
  if (typeof nativeRemind === 'function') { nativeRemind(); nativeWidget(); }
}
async function loadState() {
  let loaded;
  try { await KV.open(); loaded = await KV.get('state'); } catch (e) { /* Fallback */ }
  if (!loaded) { try { const raw = localStorage.getItem('sj-state'); if (raw) loaded = JSON.parse(raw); } catch (_) { } }
  S = loaded ? mergeLoaded(loaded) : seed();
  ensureLangs();
  S.modules.forEach(m => { if (!m.start) { const ds = S.sessions.filter(x => x.moduleId === m.id).map(x => x.date).sort(); m.start = ds[0] && ds[0] < today() ? ds[0] : today(); } });
  try { const lt = localStorage.getItem('sj-theme'); if (lt && ['light', 'dark', 'auto'].includes(lt)) S.settings.theme = lt; } catch (_) { }
  if (!loaded) await persist();
  await dailyAutoBackup();
}

/* Automatische Tages-Sicherung (die letzten 3 Tage bleiben im Gerätespeicher) */
async function dailyAutoBackup() {
  try {
    if (!KV.db) return;
    const list = (await KV.get('autobackups')) || [];
    const t = today();
    if (list.length && list[0].date === t) return;
    list.unshift({ date: t, data: JSON.stringify(S) });
    await KV.set('autobackups', list.slice(0, 3));
  } catch (_) { }
}

/* ---------- Theme ---------- */
const darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function resolvedTheme() { const t = S ? S.settings.theme : (localStorage.getItem('sj-theme') || 'auto'); return t === 'auto' ? (darkMQ && darkMQ.matches ? 'dark' : 'light') : t; }
function applyTheme() {
  const r = resolvedTheme();
  document.documentElement.setAttribute('data-theme', r);
  const meta = $('#theme-color'); if (meta) meta.content = r === 'dark' ? '#111715' : '#F8F6F0';
  if (typeof applyPalette === 'function') applyPalette();
  const b = $('#btn-theme'); if (b) { b.textContent = r === 'dark' ? '☀️' : '🌙'; b.title = r === 'dark' ? 'Hellmodus' : 'Dunkelmodus'; }
}
function setTheme(mode) {
  S.settings.theme = mode;
  try { localStorage.setItem('sj-theme', mode); } catch (_) { }
  applyTheme(); persist();
}
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', () => { if (S && S.settings.theme === 'auto') applyTheme(); });

/* ---------- Toast / Benachrichtigungen ---------- */
let zenOpen = false;
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toast').appendChild(el); setTimeout(() => el.remove(), ms);
}
function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 660; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(.25, ac.currentTime + .05); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + 1.3);
    o.start(); o.stop(ac.currentTime + 1.35);
  } catch (_) { }
}
function notify(title, body) {
  if (zenOpen) return; // Zen: komplett stumm
  toast(`${title} – ${body}`, 5000);
  if (S.settings.sound) beep();
  try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch (_) { }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icons/icon-192.png' }));
      else new Notification(title, { body, icon: 'icons/icon-192.png' });
    }
  } catch (_) { }
}

/* ---------- Modal ---------- */
let modalCfg = null;
function openModal(cfg) {
  modalCfg = cfg;
  const foot = cfg.noFoot ? '' : `<div class="modal-foot">
      ${cfg.danger ? `<button type="button" class="btn btn-danger" data-act="modal-danger" style="margin-right:auto">${esc(cfg.danger)}</button>` : ''}
      <button type="button" class="btn btn-ghost" data-act="modal-close">Abbrechen</button>
      <button type="submit" class="btn btn-jade">${esc(cfg.okText || 'Speichern')}</button></div>`;
  $('#modal-root').innerHTML = `<form class="modal ${cfg.wide ? 'wide' : ''}" id="mf" autocomplete="off">
    <div class="modal-head"><h3>${cfg.title}</h3><button type="button" class="icon-btn" data-act="modal-close" aria-label="Schließen" style="width:32px;height:32px;font-size:14px">✕</button></div>
    <div class="modal-body">${cfg.body}</div>${foot}</form>`;
  $('#modal-root').classList.add('open');
  const first = $('#mf [autofocus]') || $('#mf input[type=text],#mf textarea'); if (first && !('ontouchstart' in window)) first.focus();
  if (cfg.after) cfg.after($('#mf'));
}
function closeModal() { $('#modal-root').classList.remove('open'); $('#modal-root').innerHTML = ''; modalCfg = null; }
document.addEventListener('submit', e => {
  if (e.target.id !== 'mf') return; e.preventDefault();
  if (modalCfg && modalCfg.onOk) { const r = modalCfg.onOk(e.target); if (r === false) return; }
  closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (zenOpen) toggleZen(false); else if (modalCfg) closeModal(); }
});
$('#modal-root').addEventListener('mousedown', e => { if (e.target.id === 'modal-root' && modalCfg && !modalCfg.sticky) closeModal(); });
function confirmBox(msg, okText, fn) {
  openModal({ title: 'Bist du sicher?', body: `<p class="sm">${esc(msg)}</p>`, okText: okText || 'Ja, löschen', onOk: () => { fn(); } });
}

/* ---------- UI-Bausteine ---------- */
const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${clamp(p, 0, 100)}%"></i></div>`;
const tagById = id => S.tags.find(t => t.id === id);
const tagChip = id => { const t = tagById(id); return t ? `<span class="chip c-${t.color}">${esc(t.name)}</span>` : ''; };
const modById = id => S.modules.find(m => m.id === id);
const modChip = id => { const m = modById(id); return m ? `<span class="chip c-gray"><span style="width:8px;height:8px;border-radius:50%;background:${m.color};display:inline-block"></span>${esc(m.name)}</span>` : ''; };
const isDoneStatus = st => st === S.statuses[S.statuses.length - 1];
const modOptions = (sel, empty = '– kein Modul –') => `<option value="">${empty}</option>` + S.modules.map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
const tagChecks = (sel = []) => S.tags.length ? `<div class="row wrap">${S.tags.map(t => `<label class="chip c-${t.color}" style="cursor:pointer"><input type="checkbox" name="tag" value="${t.id}" ${sel.includes(t.id) ? 'checked' : ''}> ${esc(t.name)}</label>`).join('')}</div>` : '<span class="xs faint">Noch keine Tags – unter Einstellungen anlegen.</span>';

/* ---------- Router ---------- */
const VIEWS = {};
let current = 'today';
const NAV = [
  ['today', '📊', 'Heute', '仪表板'], ['uni', '📚', 'Study Hub', '学习'], ['wushu', '🥋', 'Wushu & Gym', '武术'],
  ['work', '💻', 'Work Space', '工作'], ['focus', '⏱️', 'Fokus', '专注'], ['calendar', '📅', 'Kalender', '历法'], ['plan', '🗓', 'Wochenplan', '周计划'], ['expenses', '💰', 'Ausgaben', '开支'],
  ['goals', '🌸', 'Erfolge', '成就'], ['review', '📝', 'Rückblick', '回顾'], ['db', '🗄️', 'Datenbank', '资料库'], ['settings', '⚙️', 'Einstellungen', '设置']
];
const BNAV = ['today', 'uni', 'wushu', 'focus'];
function buildNav() {
  $('#nav').innerHTML = navVisible().map(([k, ico, l, cn]) => `<button class="nav-btn ${k === current ? 'active' : ''}" data-act="go" data-view="${k}"><span class="ico">${ico}</span><span>${l} <span class="xs cn" style="opacity:.7">${cn}</span></span></button>`).join('');
  const BK = bnavKeys(), more = !BK.includes(current);
  $('#bnav').innerHTML = BK.map(k => { const n = NAV.find(x => x[0] === k); return `<button class="${k === current ? 'active' : ''}" data-act="go" data-view="${k}"><span>${n[1]}</span><span>${n[2].split(' ')[0]}</span></button>`; }).join('') +
    `<button class="${more ? 'active' : ''}" data-act="more"><span>☰</span><span>Mehr</span></button>`;
}
function go(view, opts = {}) {
  if (!VIEWS[view]) view = 'today';
  const changed = view !== current; current = view;
  if (changed) { try { history.replaceState(null, '', '#' + view); } catch (_) { } }
  render(changed || opts.top);
}
function render(toTop) {
  if (!S) return;
  const v = VIEWS[current]; const el = $('#view'); const st = el.scrollTop;
  $('#page-title').textContent = v.title();
  $('#page-sub').textContent = v.sub ? v.sub() : '';
  el.innerHTML = v.render();
  el.scrollTop = toTop ? 0 : st;
  buildNav();
  if (v.after) v.after();
  tickUI();
  checkAchievements();
}

/* ---------- Event-Dispatcher ---------- */
const A = {}; // Aktionen: data-act="name"
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (fn) { fn(el.dataset, el, e); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && A[el.dataset.change]) A[el.dataset.change](el.dataset, el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && A[el.dataset.input]) A[el.dataset.input](el.dataset, el, e); });

A.go = d => go(d.view, { top: true });
A['modal-close'] = () => closeModal();
A['modal-danger'] = () => { if (modalCfg && modalCfg.onDanger) { modalCfg.onDanger(); closeModal(); } };
A.more = () => {
  const BK = bnavKeys(), rest = navVisible().filter(n => !BK.includes(n[0]));
  openModal({ title: 'Mehr', noFoot: true, body: `<div class="col">${rest.map(n => `<button type="button" class="nav-btn ${n[0] === current ? 'active' : ''}" data-act="go-close" data-view="${n[0]}"><span class="ico">${n[1]}</span>${n[2]} <span class="xs cn" style="opacity:.7">${n[3]}</span></button>`).join('')}</div>` });
};
A['go-close'] = d => { closeModal(); go(d.view, { top: true }); };

/* ---------- Lernplan-Generator (rückwärts, mit Pufferzonen) ---------- */
function buildPlan(mod, fromDate) {
  const start0 = fromDate || today();
  const keep = (mod.plan || []).filter(p => p.type === 'chapter' && p.done && p.ch <= mod.chapters);
  const doneCh = new Set(keep.map(p => p.ch));
  const remaining = []; for (let c = 1; c <= mod.chapters; c++) if (!doneCh.has(c)) remaining.push(c);
  const buf = Math.max(0, mod.buffer | 0);
  const lastStudy = addKey(mod.exam, -buf - 1);
  let avail = diffDays(start0, lastStudy) + 1;
  let studyStart = start0;
  if (avail < 1) { avail = 1; studyStart = start0; mod.planWarn = true; } else mod.planWarn = false;
  const plan = [...keep];
  remaining.forEach((c, i) => {
    plan.push({ id: uid(), date: addKey(studyStart, Math.floor(i * avail / remaining.length)), type: 'chapter', ch: c, label: `Kapitel ${c}`, done: false });
  });
  for (let k = 0; k < buf; k++) {
    const date = addKey(mod.exam, -buf + k);
    if (date >= start0) plan.push({ id: uid(), date, type: 'buffer', label: k === buf - 1 ? 'Puffer · Letzte Wiederholung' : 'Puffer · Wiederholung', done: false });
  }
  plan.push({ id: uid(), date: mod.exam, type: 'exam', label: `Klausur ${mod.name}`, done: false });
  return plan.sort((a, b) => a.date.localeCompare(b.date) || (a.ch || 99) - (b.ch || 99));
}
const modProgress = m => { const ch = (m.plan || []).filter(p => p.type === 'chapter'); const d = ch.filter(p => p.done).length; return { done: d, total: m.chapters, pct: m.chapters ? Math.round(100 * d / m.chapters) : 0 }; };
/* Auto-Anpassung: verpasste Kapitel werden ab heute neu verteilt */
function autoReplan() {
  if (!S.settings.autoReplan) return 0;
  const t = today(); let moved = 0; const names = [];
  S.modules.forEach(m => {
    if (!m.exam || m.exam < t) return;
    const late = (m.plan || []).filter(p => p.type === 'chapter' && !p.done && p.date < t).length;
    if (late) { m.plan = buildPlan(m, t); m.u = Date.now(); moved += late; names.push(m.name); }
  });
  if (moved) { save(); toast(`Lernplan angepasst: ${moved} verpasste${moved > 1 ? '' : 's'} Kapitel neu verteilt (${names.join(', ')}) 🌸`, 6500); }
  return moved;
}
const overdueCount = m => (m.plan || []).filter(p => p.type === 'chapter' && !p.done && p.date < today()).length;
const nextExam = () => S.modules.filter(m => m.exam && m.exam >= today()).sort((a, b) => a.exam.localeCompare(b.exam))[0];

/* ---------- Lernzeit-Tracking ---------- */
const secOn = (date, modId) => S.sessions.reduce((a, s) => a + (s.date === date && (modId === undefined || s.moduleId === modId) ? s.sec : 0), 0);
const secMod = id => S.sessions.reduce((a, s) => a + (s.moduleId === id ? s.sec : 0), 0);
const todayPomos = () => S.sessions.filter(s => s.date === today() && s.pomo).length;
function weekdayAvg(weeks = 8) {
  const start = addKey(today(), -(weeks * 7) + 1), sums = Array(7).fill(0);
  S.sessions.forEach(s => { if (s.date >= start) sums[dow(parseD(s.date))] += s.sec; });
  return sums.map(v => Math.round(v / 60 / weeks));
}
function lastDays(n) { const out = []; for (let i = n - 1; i >= 0; i--) { const k = addKey(today(), -i); out.push({ k, min: Math.round(secOn(k) / 60) }); } return out; }

/* ---------- Habits ---------- */
function habitDone(date, h) {
  if (h.auto === 'study') return secOn(date) / 60 >= S.settings.studyGoalMin;
  if (h.auto === 'mod') { const m = modById(h.modId); return secOn(date, h.modId) / 60 >= (m ? m.dailyMin || h.min : h.min || 15); }
  return (S.habitLog[date] || []).includes(h.id);
}
function dayLevel(date) {
  const hs = S.habits; const done = hs.filter(h => habitDone(date, h)).length;
  if (!done) return secOn(date) > 0 ? 1 : 0;
  return Math.min(4, Math.max(1, Math.ceil(4 * done / hs.length)));
}
function streak() {
  let n = 0, k = today(); if (!dayLevel(k)) k = addKey(k, -1);
  while (dayLevel(k) > 0 && n < 3650) { n++; k = addKey(k, -1); }
  return n;
}
function toggleHabit(date, id) {
  const l = S.habitLog[date] || (S.habitLog[date] = []); const i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  save();
}

/* ---------- Wushu-Mapping ---------- */
const SESSION_BY_DOW = { 0: 0, 1: 'skill', 2: 1, 3: 'skill', 4: 2, 5: 'skill', 6: 3 }; // Mo,Mi,Fr,So haben detaillierte Gym-Sessions
const todayTraining = (d = new Date()) => WUSHU_DATA.week[dow(d)];

/* ---------- Timer (zeitstempelbasiert: läuft auch im Hintergrund korrekt) ---------- */
const phaseDur = ph => { const p = S.settings.pomo; return (ph === 'focus' ? p.focus : ph === 'short' ? p.short : p.long) * 60; };
const tElapsed = () => { const t = S.timer; return t.elapsed + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0); };
const tRemaining = () => Math.max(0, S.timer.duration - tElapsed());
function resetTimerState(phase = 'focus') {
  const t = S.timer; t.phase = phase; t.duration = t.mode === 'stopwatch' ? 0 : phaseDur(phase); t.elapsed = 0; t.startedAt = null;
}
function logSession(sec, pomo) {
  if (sec < 30) return null;
  const s = { id: uid(), date: today(), ts: Date.now(), sec: Math.round(sec), moduleId: S.timer.moduleId || null, pomo: !!pomo, u: Date.now() };
  S.sessions.push(s); return s;
}
let wl = null;
async function wake(on) {
  try {
    if (on && navigator.wakeLock && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    else if (!on && wl) { await wl.release(); wl = null; }
  } catch (_) { }
}
function tStart() { const t = S.timer; if (t.startedAt) return; t.startedAt = Date.now(); wake(true); save(); refresh(); }
function tPause() { const t = S.timer; if (!t.startedAt) return; t.elapsed = tElapsed(); t.startedAt = null; wake(false); save(); refresh(); }
function tDone() {
  const t = S.timer; const sec = tElapsed(); let msg = 'Timer zurückgesetzt.';
  if (t.phase === 'focus') {
    const s = logSession(sec, false);
    if (s) { const m = modById(t.moduleId); msg = `${fmtDur(s.sec)} gespeichert${m ? ' · ' + m.name : ''} 🌸`; }
    else msg = 'Zu kurz (unter 30 Sek.) – nicht gespeichert.';
  }
  wake(false); resetTimerState('focus'); save(); refresh(); toast(msg);
}
function tReset() { wake(false); resetTimerState(S.timer.phase === 'focus' ? 'focus' : S.timer.phase); save(); refresh(); }
function tComplete() {
  const t = S.timer; wake(false);
  if (t.phase === 'focus') {
    logSession(t.duration, true);
    const long = todayPomos() % S.settings.pomo.every === 0;
    resetTimerState(long ? 'long' : 'short');
    notify('🌸 Fokus-Session beendet', long ? 'Lange Pause – du hast sie dir verdient.' : 'Kurze Pause – kurz bewegen, trinken.');
  } else { resetTimerState('focus'); notify('Pause vorbei', 'Bereit für die nächste Fokus-Session?'); }
  save(); refresh();
}
function setTimerMode(mode) {
  const t = S.timer; if (t.mode === mode) return;
  if (t.phase === 'focus' && tElapsed() >= 30) logSession(tElapsed(), false);
  wake(false); t.mode = mode; resetTimerState('focus'); save(); refresh();
}
const fmtClock = s => s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(Math.floor(s % 60))}` : mmss(s);
const RING_C = 2 * Math.PI * 88;
function tickUI() {
  if (!S) return; const t = S.timer; if (!t) return;
  if (S.workClock) { const sec = Math.floor((Date.now() - S.workClock.startedAt) / 1000); $$('[data-wc="time"]').forEach(n => { n.textContent = fmtClock(sec); }); }
  const w = S.workout;
  if (w) {
    $$('[data-wk="time"]').forEach(n => { n.textContent = fmtClock(wkEl(w)); });
    if (w.restUntil) {
      const rem = Math.ceil((w.restUntil - Date.now()) / 1000);
      if (rem <= 0) { w.restUntil = null; save(); notify('⏳ Pause vorbei', 'Nächster Satz!'); if (current === 'workout') render(); }
      else { $$('[data-wk="rest"]').forEach(n => { n.textContent = mmss(rem); }); $$('[data-wk="restbar"]').forEach(n => { n.style.width = clamp(100 * rem / w.restTotal, 0, 100) + '%'; }); }
    }
  }
  if (t.startedAt && t.mode === 'pomodoro' && tElapsed() >= t.duration) { tComplete(); return; }
  const stop = t.mode === 'stopwatch'; const el = tElapsed();
  const txt = stop ? fmtClock(el) : mmss(Math.ceil(tRemaining()));
  const prog = stop ? (el % 3600) / 3600 : (t.duration ? el / t.duration : 0);
  $$('[data-tm="time"]').forEach(n => { n.textContent = txt; });
  $$('[data-tm="prog"]').forEach(n => { n.style.strokeDashoffset = RING_C * (1 - clamp(prog, 0, 1)); });
  document.title = t.startedAt ? `${txt} · Sakura & Jade` : 'Sakura & Jade WorkFlow';
}
setInterval(tickUI, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (S && autoReplan()) render(); tickUI(); if (S && S.timer.startedAt) wake(true); } else if (S) persist(); });
window.addEventListener('pagehide', () => { if (S) persist(); });
function refresh() { render(); if (zenOpen) renderZen(); }

/* ---------- Kalender-Logik ---------- */
function eventsOn(date) {
  const out = []; const d = parseD(date);
  S.events.forEach(e => {
    const hit = e.date === date || (e.repeat === 'weekly' && date > e.date && (!e.until || date <= e.until) && diffDays(e.date, date) % 7 === 0);
    if (hit) out.push({ kind: 'event', id: e.id, modId: e.moduleId || null, breakMin: e.breakMin || 0, title: e.title, start: e.start || '', end: e.end || '', color: ({ work: '#2E6F9E', lecture: '#3B7A57', study: '#D4A017', wushu: '#C95169', other: '#5B86B8' })[e.type] || '#5B86B8', type: e.type, repeat: e.repeat });
  });
  S.modules.forEach(m => (m.plan || []).filter(p => p.date === date).forEach(p => out.push({ kind: 'plan', id: p.id, modId: m.id, title: `${m.name}: ${p.label}`, start: '', color: p.type === 'exam' ? '#C83B3B' : m.color, done: p.done, ptype: p.type })));
  S.tasks.filter(t => t.due === date && !isDoneStatus(t.status)).forEach(t => out.push({ kind: 'task', id: t.id, title: `Deadline: ${t.title}`, start: '', color: '#D07F45' }));
  const tr = WUSHU_DATA.week[dow(d)];
  if (tr && date >= today()) out.push({ kind: 'train', title: `${tr.type === 'GYM' ? 'Gym' : '武术'}: ${tr.title}`, start: '', color: tr.color });
  return out.sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));
}

/* ---------- Karteikarten (Spaced Repetition, SM-2 light) ---------- */
const dueCards = () => S.cards.filter(c => c.due <= today());
function gradeCard(id, g) { // 0 Nochmal, 1 Schwer, 2 Gut, 3 Einfach
  const c = S.cards.find(x => x.id === id); if (!c) return;
  if (g === 0) { c.reps = 0; c.lapses++; c.interval = 0; c.ease = Math.max(1.3, c.ease - .2); c.due = today(); }
  else {
    if (g === 1) { c.interval = Math.max(1, Math.round((c.interval || 1) * 1.2)); c.ease = Math.max(1.3, c.ease - .15); }
    else if (g === 2) { c.interval = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.interval * c.ease); }
    else { c.interval = c.reps === 0 ? 3 : Math.round(Math.max(c.interval, 1) * c.ease * 1.3); c.ease += .15; }
    c.reps++; c.due = addKey(today(), c.interval);
  }
  c.u = Date.now(); save();
}
const nextIntervalLabel = (c, g) => {
  if (g === 0) return '<10 min';
  const i = g === 1 ? Math.max(1, Math.round((c.interval || 1) * 1.2)) : g === 2 ? (c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.interval * c.ease)) : (c.reps === 0 ? 3 : Math.round(Math.max(c.interval, 1) * c.ease * 1.3));
  return i + ' T';
};

/* ---------- ICS Export / Import ---------- */
const icsDate = k => k.replace(/-/g, '');
const icsDT = (k, t) => icsDate(k) + 'T' + t.replace(':', '') + '00';
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function buildICS() {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sakura Jade WorkFlow//DE', 'CALSCALE:GREGORIAN'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const add = (uidv, title, date, start, end, rrule) => {
    L.push('BEGIN:VEVENT', `UID:${uidv}@sakura-jade`, `DTSTAMP:${stamp}`, `SUMMARY:${icsEsc(title)}`);
    if (start) { L.push(`DTSTART:${icsDT(date, start)}`, `DTEND:${icsDT(date, end || start)}`); }
    else { L.push(`DTSTART;VALUE=DATE:${icsDate(date)}`, `DTEND;VALUE=DATE:${icsDate(addKey(date, 1))}`); }
    if (rrule) L.push(rrule); L.push('END:VEVENT');
  };
  S.events.forEach(e => add(e.id, e.title, e.date, e.start, e.end, e.repeat === 'weekly' ? 'RRULE:FREQ=WEEKLY' + (e.until ? `;UNTIL=${icsDate(e.until)}` : '') : ''));
  S.modules.forEach(m => (m.plan || []).forEach(p => add(p.id, `${p.type === 'exam' ? '🎓' : '📚'} ${m.name}: ${p.label}`, p.date)));
  S.tasks.filter(t => t.due && !isDoneStatus(t.status)).forEach(t => add(t.id, `⏰ ${t.title}`, t.due));
  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function parseICS(text) {
  const lines = text.replace(/\r/g, '').replace(/\n[ \t]/g, '').split('\n'); const evs = []; let cur = null;
  const unesc = s => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  const parseDt = (v, params) => {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if (!m) return null;
    if (!m[4]) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: '' };
    if (m[7]) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])); return { date: dkey(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; }
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
  };
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') cur = {}; else if (ln === 'END:VEVENT') { if (cur && cur.title && cur.s) evs.push(cur); cur = null; }
    else if (cur) {
      const i = ln.indexOf(':'); if (i < 0) continue; const key = ln.slice(0, i).split(';')[0].toUpperCase(), val = ln.slice(i + 1);
      if (key === 'SUMMARY') cur.title = unesc(val);
      else if (key === 'DTSTART') cur.s = parseDt(val); else if (key === 'DTEND') cur.e = parseDt(val);
      else if (key === 'RRULE') { if (/FREQ=WEEKLY/i.test(val)) { cur.repeat = 'weekly'; const u = val.match(/UNTIL=(\d{8})/i); if (u) cur.until = `${u[1].slice(0, 4)}-${u[1].slice(4, 6)}-${u[1].slice(6, 8)}`; } }
    }
  }
  return evs.map(x => ({ id: uid(), title: x.title.slice(0, 120), date: x.s.date, start: x.s.time, end: x.e && x.e.date === x.s.date ? x.e.time : '', type: 'lecture', repeat: x.repeat || 'none', until: x.until || '', u: Date.now() }));
}

/* ---------- Backup / Import / Merge ---------- */
function downloadFile(name, mime, text) {
  if (IS_NATIVE && nativeSave(name, text)) return;
  const blob = new Blob([text], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
const backupText = () => JSON.stringify({ app: 'sakura-jade', exported: new Date().toISOString(), state: S }, null, 1);
const backupName = () => `sakura-jade-backup-${today()}.json`;
function exportBackup() { downloadFile(backupName(), 'application/json', backupText()); S.settings.lastBackup = Date.now(); save(); toast('Backup gespeichert 💾'); if (current === 'settings') render(); }
async function shareBackup() {
  if (IS_NATIVE) { exportBackup(); return; }
  try {
    const file = new File([backupText()], backupName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Sakura & Jade Backup' }); S.settings.lastBackup = Date.now(); save(); }
    else { toast('Teilen wird hier nicht unterstützt – Datei wird heruntergeladen.'); exportBackup(); }
  } catch (e) { if (e.name !== 'AbortError') toast('Teilen fehlgeschlagen.'); }
}
const MERGE_LISTS = ['modules', 'tasks', 'notes', 'cards', 'events', 'sessions', 'milestones', 'tags', 'habits', 'metrics', 'measures', 'workouts', 'expenses'];
function mergeState(inc) {
  MERGE_LISTS.forEach(k => {
    const mine = S[k]; const map = new Map(mine.map(x => [x.id, x]));
    (inc[k] || []).forEach(x => { const ex = map.get(x.id); if (!ex) mine.push(x); else if ((x.u || 0) > (ex.u || 0)) Object.assign(ex, x); });
  });
  Object.entries(inc.habitLog || {}).forEach(([d, ids]) => { S.habitLog[d] = [...new Set([...(S.habitLog[d] || []), ...ids])]; });
  Object.assign(S.wushuDone, inc.wushuDone || {});
  S.ach = { ...(inc.ach || {}), ...S.ach };
  Object.assign(S.course, inc.course || {});
  ['checkins', 'reviews', 'packlist', 'exLast', 'suggOff', 'workLog', 'noWork'].forEach(k => { S[k] = { ...(inc[k] || {}), ...S[k] }; });
  (inc.statuses || []).forEach(s => { if (!S.statuses.includes(s)) S.statuses.splice(S.statuses.length - 1, 0, s); });
}
function importBackupText(text, mode) {
  let obj; try { obj = JSON.parse(text); } catch (_) { toast('Datei ist kein gültiges Backup.'); return false; }
  const inc = obj && obj.state ? obj.state : obj;
  if (!inc || !Array.isArray(inc.tasks) || !Array.isArray(inc.modules)) { toast('Das sieht nicht nach einem Sakura-&-Jade-Backup aus.'); return false; }
  if (mode === 'replace') { S = mergeLoaded(inc); try { localStorage.setItem('sj-theme', S.settings.theme); } catch (_) { } } else mergeState(inc);
  save(); applyTheme(); toast(mode === 'replace' ? 'Backup wiederhergestellt ✅' : 'Daten zusammengeführt ✅'); render(); return true;
}

/* ---------- kleine Animation ---------- */
function petals(x, y, n = 14) {
  if (zenOpen || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = 'petal'; p.style.left = x + 'px'; p.style.top = y + 'px';
    const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 90;
    p.style.setProperty('--dx', Math.cos(a) * r + 'px'); p.style.setProperty('--dy', Math.sin(a) * r + 40 + 'px'); p.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
    p.style.background = ['var(--pink)', 'var(--pink-hover)', 'var(--gold)'][i % 3];
    document.body.appendChild(p); setTimeout(() => p.remove(), 1200);
  }
}

/* =====================  Gemeinsame Komponenten  ===================== */
function setTaskStatus(t, st) { t.status = st; t.u = Date.now(); if (isDoneStatus(st)) t.doneAt = Date.now(); else delete t.doneAt; }
function taskRow(t, showArea = true) {
  const done = isDoneStatus(t.status), overdue = t.due && t.due < today() && !done;
  return `<div class="item ${done ? 'done' : ''}">
    <input type="checkbox" ${done ? 'checked' : ''} data-change="task-check" data-id="${t.id}" aria-label="Erledigt">
    <div class="t" data-act="task-edit" data-id="${t.id}" style="cursor:pointer">${esc(t.title)}
      <div class="row wrap" style="gap:4px;margin-top:3px">${showArea ? `<span class="chip c-gray">${AREAS[t.area] || ''}</span>` : ''}${t.due ? `<span class="chip ${overdue ? 'c-pink' : 'c-gold'}">⏰ ${fmtShort(t.due)}</span>` : ''}${modChip(t.moduleId)}${(t.tags || []).map(tagChip).join('')}</div>
    </div></div>`;
}
A['task-check'] = (d, el) => {
  const t = S.tasks.find(x => x.id === d.id); if (!t) return;
  setTaskStatus(t, el.checked ? S.statuses[S.statuses.length - 1] : S.statuses[0]);
  if (el.checked) { const r = el.getBoundingClientRect(); petals(r.left + 8, r.top + 8, 10); }
  save(); render();
};
A['plan-toggle'] = (d, el) => {
  const m = modById(d.mod); const p = m && m.plan.find(x => x.id === d.id); if (!p) return;
  p.done = el.checked; m.u = Date.now();
  if (el.checked) { const r = el.getBoundingClientRect(); petals(r.left + 8, r.top + 8, 12); }
  save(); render();
};
A['habit-toggle'] = (d, el) => {
  const date = d.date || today(); toggleHabit(date, d.id);
  if (habitDone(date, S.habits.find(h => h.id === d.id) || {})) { const r = el.getBoundingClientRect(); petals(r.left + r.width / 2, r.top + 8, 12); }
  render();
};
const habitHeat = weeks => {
  const t = today(), td = parseD(t), start = addDays(td, -(weeks - 1) * 7 - dow(td)); let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const k = dkey(addDays(start, i)), fut = k > t, lv = fut ? 0 : dayLevel(k);
    cells += `<i class="${lv ? 'l' + lv : ''} ${k === t ? 'today' : ''} ${fut ? 'future' : ''}" ${fut ? '' : `data-act="heat" data-date="${k}"`} title="${fmtDate(k)}"></i>`;
  }
  return `<div class="heat">${cells}</div>`;
};
A.heat = d => {
  const names = S.habits.filter(h => habitDone(d.date, h)).map(h => h.name);
  toast(`${fmtDate(d.date)} · ${Math.round(secOn(d.date) / 60)} Min Lernzeit${names.length ? ' · ✓ ' + names.join(', ') : ''}`, 3800);
};
function barChart(vals, labels, best = true, unit = '') {
  const max = Math.max(...vals, 1), mx = vals.indexOf(Math.max(...vals));
  return `<div class="bars">${vals.map((v, i) => `<div class="bcol ${best && v > 0 && i === mx ? 'best' : ''}"><em>${v ? v + unit : ''}</em><b style="height:${Math.round(100 * v / max * .78)}%"></b><span>${labels[i]}</span></div>`).join('')}</div>`;
}

/* ---------- Timer-Block (Dashboard, Fokus, Zen) ---------- */
function timerBlock(size) {
  const t = S.timer, run = !!t.startedAt, brk = t.phase !== 'focus', el = tElapsed();
  const lab = t.mode === 'stopwatch' ? 'Stoppuhr' : brk ? (t.phase === 'long' ? 'Lange Pause' : 'Kurze Pause') : 'Fokus';
  return `<div class="ring ${size === 'sm' ? 'sm' : ''} ${brk ? 'break' : ''}">
      <svg viewBox="0 0 200 200"><circle class="track" cx="100" cy="100" r="88" fill="none" stroke-width="10"/><circle class="prog" data-tm="prog" cx="100" cy="100" r="88" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/></svg>
      <div class="inner"><div class="time mono" data-tm="time">--:--</div><div class="xs muted">${lab}</div></div></div>
    <div class="row wrap" style="justify-content:center;margin-top:14px">
      <button class="btn ${run ? 'btn-gold' : 'btn-pink'}" data-act="t-toggle">${run ? '⏸ Pause' : el > 0 ? '▶ Weiter' : '▶ Start'}</button>
      ${el >= 1 || run ? `<button class="btn btn-jade" data-act="t-done">✓ Fertig</button>` : ''}
      ${el > 0 ? `<button class="btn btn-ghost btn-sm" data-act="t-reset" title="Zurücksetzen (ohne Speichern)">↺</button>` : ''}
      ${brk && !run ? `<button class="btn btn-ghost btn-sm" data-act="t-skip">Pause überspringen</button>` : ''}
    </div>`;
}
const timerMeta = () => `<div class="row wrap" style="justify-content:center;margin-top:12px">
    <select data-change="t-module" style="max-width:210px" aria-label="Modul für Zeiterfassung">${modOptions(S.timer.moduleId, 'Ohne Modul')}</select>
    <div class="seg"><button type="button" class="${S.timer.mode === 'pomodoro' ? 'on' : ''}" data-act="t-mode" data-mode="pomodoro">Pomodoro</button><button type="button" class="${S.timer.mode === 'stopwatch' ? 'on' : ''}" data-act="t-mode" data-mode="stopwatch">Stoppuhr</button></div></div>`;
A['t-toggle'] = () => (S.timer.startedAt ? tPause() : tStart());
A['t-done'] = () => tDone();
A['t-reset'] = () => tReset();
A['t-skip'] = () => { resetTimerState('focus'); save(); refresh(); };
A['t-mode'] = d => setTimerMode(d.mode);
A['t-module'] = (d, el) => { S.timer.moduleId = el.value || null; save(); };
A['pomo-set'] = d => {
  S.settings.pomo.focus = +d.min; if (!S.timer.startedAt && S.timer.elapsed === 0 && S.timer.phase === 'focus') resetTimerState('focus');
  save(); refresh();
};

/* =====================  HEUTE (Dashboard)  ===================== */
VIEWS.today = {
  title: () => { const h = new Date().getHours(), n = S.settings.userName; return '🌸 ' + (h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend') + (n ? ', ' + n : ''); },
  sub: () => { const d = new Date(); return `${DAYS_LONG[dow(d)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()} · Harmonie von Geist (文) & Körper (武)`; },
  render() {
    const t = today(), d = new Date(), tr = todayTraining(d), goalMin = S.settings.studyGoalMin;
    const studyMin = Math.round(secOn(t) / 60), geist = clamp(Math.round(100 * studyMin / goalMin), 0, 100);
    const trainH = S.habits.find(h => h.id === 'h-train'), trainDone = trainH ? habitDone(t, trainH) : false, koerper = trainDone ? 100 : 0;
    let tip;
    if (geist >= 100 && trainDone) tip = 'Beides erledigt – Yin und Yang im Gleichgewicht. 🌸';
    else if (geist < 100 && !trainDone) tip = `Noch ${Math.max(0, goalMin - studyMin)} Min Lernen und danach „${tr.title}“ (${tr.type === 'GYM' ? 'Gym' : '武术'}, Belastung ${tr.load.toLowerCase()}).`;
    else if (geist < 100) tip = `Training ist erledigt. Noch ${Math.max(0, goalMin - studyMin)} Min bis zum Lernziel.`;
    else tip = `Lernziel erreicht! Noch offen: „${tr.title}“.`;

    const ne0 = nextExam(), pc0 = ne0 ? paceInfo(ne0) : null;
    if (pc0 && pc0.diff < -3600 && geist < 100) tip += ` Bei ${ne0.name} liegst du ${fmtNum(-pc0.diff / 3600)} h hinter dem Plan.`;
    const agenda = eventsOn(t);
    const agendaHtml = agenda.length ? agenda.map(a => {
      let chk = '';
      if (a.kind === 'plan' && a.ptype !== 'exam') chk = `<input type="checkbox" ${a.done ? 'checked' : ''} data-change="plan-toggle" data-mod="${a.modId}" data-id="${a.id}">`;
      if (a.kind === 'train') chk = `<input type="checkbox" ${trainDone ? 'checked' : ''} data-change="habit-toggle" data-id="h-train" title="Training erledigt">`;
      if (a.kind === 'event' && a.type === 'work' && a.start && a.end) chk = workActions(a, t);
      else if (a.kind === 'event' && a.modId) chk = `<button class="btn btn-ghost btn-sm" data-act="ev-focus" data-mod="${a.modId}" title="Fokus starten">▶</button>`;
      if (a.kind === 'task') chk = `<input type="checkbox" data-change="task-check" data-id="${a.id}">`;
      return `<div class="item ${a.done || (a.kind === 'train' && trainDone) ? 'done' : ''}"><span class="bar-side" style="background:${a.color}"></span><span class="timeline-time">${a.start ? esc(a.start) + (a.end ? '–' + esc(a.end) : '') : 'ganztägig'}</span><span class="t" ${a.kind === 'event' ? `data-act="event-edit" data-id="${a.id}" style="cursor:pointer"` : ''}>${esc(a.title)}</span>${chk}</div>`;
    }).join('') : `<div class="empty">Heute ist nichts geplant. Tippe auf + für einen Termin oder Lernblock.</div>`;

    const open = S.tasks.filter(x => !isDoneStatus(x.status)).sort((a, b) => ((a.due || '9') > (b.due || '9') ? 1 : -1) || ({ hoch: 0, mittel: 1, niedrig: 2 }[a.prio] - { hoch: 0, mittel: 1, niedrig: 2 }[b.prio])).slice(0, 6);
    const ne = nextExam(), dueC = dueCards().length;
    const dToGoal = diffDays(t, S.settings.goal.date);
    const wk = lastDays(7);
    const sIdx = SESSION_BY_DOW[dow(d)];
    const manual = S.habits.filter(h => !h.auto);

    return `
    <div class="card hero accent-l row between wrap">
      <div class="grow" style="min-width:230px">
        <div class="xs b gold-t cn">阴阳 Balance</div>
        <h3 style="font-size:17px;margin:2px 0">${studyMin} Min gelernt · ${trainDone ? 'Training erledigt' : 'Training offen'}</h3>
        <p class="sm muted">${esc(tip)}</p>
        ${streakBar()}
      </div>
      ${balanceBlock(koerper, geist)}
    </div>

    <div class="grid g3">
      <div class="card span2">
        <div class="row between"><h3>📅 Tagesplan</h3><button class="btn btn-ghost btn-sm" data-act="event-new" data-date="${t}">+ Termin / Lernblock</button></div>
        <div class="stack mt">${agendaHtml}</div>
        ${S.events.length === 0 ? `<p class="xs faint mt">Tipp: Vorlesungen als wöchentlichen Termin anlegen oder per .ics aus deinem Uni-Kalender importieren (Einstellungen).</p>` : ''}
      </div>
      <div class="card center">
        <div class="row between"><h3>⏱️ Fokus</h3><span class="chip c-jade">${todayPomos()} 🌸 heute</span></div>
        <div class="mt">${timerBlock('sm')}</div>
        ${timerMeta()}
      </div>
    </div>

    <div class="grid g3">
      <div class="card">
        <div class="row between"><h3>✅ Offene Aufgaben</h3><button class="link" data-act="go" data-view="work">alle →</button></div>
        <div class="stack mt">${open.length ? open.map(x => taskRow(x)).join('') : '<div class="empty">Alles erledigt 🌸</div>'}</div>
      </div>
      <div class="card accent-pink">
        <div class="row between"><span class="chip c-pink cn">武术 & Gym</span><span style="font-size:22px">🥋</span></div>
        <h3 style="margin-top:8px">${esc(tr.title)}</h3>
        <p class="xs muted" style="margin:4px 0 10px">${esc(tr.note)}</p>
        ${goalLine()}
        <div class="row wrap mt">
          <button class="btn btn-jade btn-sm" data-act="wk-start" data-sid="${S.workout ? S.workout.sid : (sIdx !== undefined ? sIdx : 'skill')}">${S.workout ? '↩ Workout fortsetzen' : '▶ Workout starten'}</button>
          ${courseDay(t) ? courseChip(t) : ''}
          <button class="btn btn-pink btn-sm" data-act="wushu-open" data-tab="${tabFor(sIdx)}">Plan öffnen</button>
          <button class="btn ${trainDone ? 'btn-jade' : 'btn-ghost'} btn-sm" data-act="habit-toggle" data-id="h-train">${trainDone ? '✓ Erledigt' : 'Als erledigt markieren'}</button>
        </div>
      </div>
      <div class="card accent-l">
        <div class="row between"><span class="chip c-jade">Uni • 学习</span><span style="font-size:22px">📖</span></div>
        ${ne ? `<h3 style="margin-top:8px">${esc(ne.name)}</h3>
          <p class="xs muted" style="margin:2px 0 10px">Klausur in ${diffDays(t, ne.exam)} Tagen (${fmtShort(ne.exam)})</p>
          ${learnBlock(ne)}`
        : `<h3 style="margin-top:8px">Noch kein Modul</h3><p class="xs muted">Lege ein Modul mit Klausurdatum an – die App plant rückwärts.</p>`}
        <div class="row wrap mt"><button class="btn btn-jade btn-sm" data-act="go" data-view="uni">Study Hub</button>
          ${dueC ? `<button class="btn btn-gold btn-sm" data-act="review-start">🃏 ${dueC} Karte${dueC > 1 ? 'n' : ''} fällig</button>` : ''}</div>
      </div>
    </div>

    ${dashExtras()}
    <div class="grid ${dashOn('heat') && dashOn('chart') ? 'g2' : ''}">
      ${dashOn('heat') ? `<div class="card">
        <div class="row between"><h3 class="cn">🌸 樱花 Habit-Grid</h3><span class="chip c-jade">${streak()} Tage Streak 🔥</span></div>
        <p class="xs muted" style="margin:4px 0 10px">Je mehr Gewohnheiten du erledigst, desto dunkler das Rosa.</p>
        ${habitHeat(16)}
        <div class="row wrap mt">${S.habits.map(h => h.auto ? `<span class="chip ${habitDone(t, h) ? 'c-jade' : 'c-gray'}">${habitDone(t, h) ? '✓' : '○'} ${esc(h.name)}</span>` : `<label class="chip ${habitDone(t, h) ? 'c-pink' : 'c-gray'}" style="cursor:pointer"><input type="checkbox" ${habitDone(t, h) ? 'checked' : ''} data-change="habit-toggle" data-id="${h.id}"> ${esc(h.name)}</label>`).join('')}</div>
      </div>` : ''}
      ${dashOn('chart') ? `<div class="card">
        <div class="row between"><h3>Lernzeit – letzte 7 Tage</h3><button class="link" data-act="uni-tab" data-tab="stats">Statistik →</button></div>
        <div class="mt">${barChart(wk.map(x => x.min), wk.map(x => DAYS[dow(parseD(x.k))]), false, 'm')}</div>
      </div>` : ''}
    </div>`;
  }
};

/* =====================  FOKUS  ===================== */
VIEWS.focus = {
  title: () => '⏱️ 专注 Fokus-Timer',
  sub: () => 'Pomodoro oder Stoppuhr – die Zeit wird automatisch deinem Modul zugeordnet',
  render() {
    const p = S.settings.pomo, todays = S.sessions.filter(s => s.date === today()).sort((a, b) => b.ts - a.ts);
    return `<div class="grid g2" style="align-items:start">
      <div class="card center" style="border-top:8px solid var(--pink)">
        <span class="chip c-pink cn">专注 Zen Pomodoro</span>
        <div class="mt2">${timerBlock('lg')}</div>
        ${timerMeta()}
        <div class="row wrap mt2" style="justify-content:center">
          <span class="xs muted">Fokus-Dauer:</span>
          ${[15, 25, 45, 50].map(m => `<button class="btn btn-sm ${p.focus === m ? 'btn-jade' : 'btn-ghost'}" data-act="pomo-set" data-min="${m}">${m} Min</button>`).join('')}
        </div>
        <div class="card flat mt2 row between" style="padding:12px 16px"><span class="sm muted">Sessions heute</span><b class="jade-t" style="font-size:16px">${todayPomos()} 🌸</b></div>
        <button class="btn btn-ghost mt" data-act="zen-open">🧘 Zen-Modus starten</button>
      </div>
      <div class="card">
        <div class="row between"><h3>Heutige Lernzeit</h3><span class="chip c-jade">${fmtDur(secOn(today()))}</span></div>
        <div class="stack mt">${todays.length ? todays.map(s => `<div class="item"><span class="timeline-time">${new Date(s.ts).toTimeString().slice(0, 5)}</span><span class="t">${s.moduleId && modById(s.moduleId) ? esc(modById(s.moduleId).name) : 'Ohne Modul'} <span class="faint xs">${s.pomo ? '🍅 Pomodoro' : 'manuell'}</span></span><b class="sm">${fmtDur(s.sec)}</b><button class="btn btn-danger btn-sm" data-act="session-del" data-id="${s.id}" aria-label="Löschen">✕</button></div>`).join('') : '<div class="empty">Noch keine Zeit erfasst.</div>'}</div>
        <button class="btn btn-ghost btn-sm mt" data-act="session-add">+ Zeit nachtragen</button>
      </div>
    </div>`;
  }
};
A['session-del'] = d => { S.sessions = S.sessions.filter(s => s.id !== d.id); save(); render(); };
A['session-add'] = () => openModal({
  title: 'Lernzeit nachtragen', body: `<div class="form-grid">
    <div class="full"><label class="f">Modul</label><select name="mod">${modOptions('', 'Ohne Modul')}</select></div>
    <div><label class="f">Datum</label><input type="date" name="date" value="${today()}"></div>
    <div><label class="f">Dauer (Minuten)</label><input type="number" name="min" value="45" min="1" max="600"></div></div>`,
  onOk: f => { const min = +f.min.value; if (!min) return false; S.sessions.push({ id: uid(), date: f.date.value || today(), ts: Date.now(), sec: min * 60, moduleId: f.mod.value || null, pomo: false, u: Date.now() }); save(); render(); toast('Zeit gespeichert'); }
});

/* =====================  WORK SPACE (Kanban)  ===================== */
let workFilter = 'all';
VIEWS.work = {
  title: () => '💻 Work Space 工作',
  sub: () => 'Kanban mit eigenen Status, Tags und Fristen',
  render() {
    const list = S.tasks.filter(t => workFilter === 'all' || t.area === workFilter);
    const n = S.statuses.length;
    return `${workTimeCard()}<div class="row between wrap">
      <div class="filters">${[['all', 'Alle'], ...Object.entries(AREAS)].map(([k, l]) => `<button class="${workFilter === k ? 'on' : ''}" data-act="work-filter" data-f="${k}">${l}</button>`).join('')}</div>
      <button class="btn btn-jade" data-act="task-new">+ Aufgabe</button></div>
    <div class="kanban">${S.statuses.map((st, i) => {
      const items = list.filter(t => t.status === st), col = i === 0 ? 'var(--faint)' : i === n - 1 ? 'var(--jade)' : 'var(--gold)';
      return `<div class="kcol" data-status="${esc(st)}" style="border-top-color:${col}">
        <div class="row between"><h4>${esc(st)}</h4><span class="chip c-gray">${items.length}</span></div>
        ${items.map(t => `<div class="kcard" draggable="true" data-id="${t.id}">
          <div class="sm ${isDoneStatus(st) ? 'faint' : ''}" style="${isDoneStatus(st) ? 'text-decoration:line-through' : ''};cursor:pointer;overflow-wrap:anywhere" data-act="task-edit" data-id="${t.id}">${esc(t.title)}</div>
          <div class="row wrap" style="gap:4px;margin-top:6px"><span class="chip c-gray">${AREAS[t.area] || ''}</span>${t.prio === 'hoch' ? '<span class="chip c-pink">hoch</span>' : ''}${t.due ? `<span class="chip ${t.due < today() && !isDoneStatus(st) ? 'c-pink' : 'c-gold'}">⏰ ${fmtShort(t.due)}</span>` : ''}${modChip(t.moduleId)}${(t.tags || []).map(tagChip).join('')}</div>
          <div class="row between" style="margin-top:8px">${i > 0 ? `<button class="link" data-act="task-move" data-id="${t.id}" data-dir="-1">← ${esc(S.statuses[i - 1])}</button>` : '<span></span>'}${i < n - 1 ? `<button class="link" data-act="task-move" data-id="${t.id}" data-dir="1">${esc(S.statuses[i + 1])} →</button>` : ''}</div>
        </div>`).join('') || '<div class="empty xs">Hierher ziehen</div>'}
      </div>`;
    }).join('')}</div>`;
  }
};
A['work-filter'] = d => { workFilter = d.f; render(); };
A['task-move'] = (d, el) => {
  const t = S.tasks.find(x => x.id === d.id); if (!t) return;
  const i = S.statuses.indexOf(t.status), j = clamp(i + (+d.dir), 0, S.statuses.length - 1); setTaskStatus(t, S.statuses[j]);
  if (isDoneStatus(t.status)) { const r = el.getBoundingClientRect(); petals(r.left + 20, r.top, 10); }
  save(); render();
};
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.kcard'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('.kcol'); if (c) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => { const c = e.target.closest && e.target.closest('.kcol'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('over'); });
document.addEventListener('drop', e => {
  const c = e.target.closest && e.target.closest('.kcol'); if (!c) return; e.preventDefault(); c.classList.remove('over');
  const t = S.tasks.find(x => x.id === e.dataTransfer.getData('text/plain')); if (!t || t.status === c.dataset.status) return;
  setTaskStatus(t, c.dataset.status); save(); render();
  if (isDoneStatus(t.status)) petals(e.clientX, e.clientY, 12);
});

/* ---------- Aufgaben-Formular ---------- */
function openTaskForm(id, preset = {}) {
  const t = id ? S.tasks.find(x => x.id === id) : { title: '', area: workFilter !== 'all' ? workFilter : 'work', status: S.statuses[0], tags: [], due: '', moduleId: null, prio: 'mittel', ...preset };
  if (!t) return;
  openModal({
    title: id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe',
    danger: id ? 'Löschen' : null,
    onDanger: () => { S.tasks = S.tasks.filter(x => x.id !== id); save(); render(); toast('Aufgabe gelöscht'); },
    body: `<div class="form-grid">
      <div class="full"><label class="f">Titel</label><input type="text" name="title" value="${esc(t.title)}" required autofocus></div>
      <div><label class="f">Bereich</label><select name="area">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}" ${t.area === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="f">Status</label><select name="status">${S.statuses.map(s => `<option ${t.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div><label class="f">Priorität</label><select name="prio">${['hoch', 'mittel', 'niedrig'].map(p => `<option ${t.prio === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div><label class="f">Fällig am</label><input type="date" name="due" value="${esc(t.due || '')}"></div>
      <div class="full"><label class="f">Modul (optional)</label><select name="mod">${modOptions(t.moduleId)}</select></div>
      <div class="full"><label class="f">Tags</label>${tagChecks(t.tags)}</div></div>`,
    onOk: f => {
      const title = f.title.value.trim(); if (!title) return false;
      const tags = $$('input[name=tag]:checked', f).map(x => x.value);
      if (id) { Object.assign(t, { title, area: f.area.value, prio: f.prio.value, due: f.due.value, moduleId: f.mod.value || null, tags }); setTaskStatus(t, f.status.value); }
      else { const nt = { id: uid(), title, area: f.area.value, prio: f.prio.value, due: f.due.value, moduleId: f.mod.value || null, tags, created: Date.now(), u: Date.now(), status: S.statuses[0] }; setTaskStatus(nt, f.status.value); S.tasks.push(nt); }
      save(); render();
    }
  });
}
A['task-new'] = () => openTaskForm(null);
A['task-edit'] = d => openTaskForm(d.id);

/* =====================  QUICK CAPTURE  ===================== */
function openCapture() {
  openModal({
    title: '⚡ Quick Capture', okText: 'Festhalten',
    body: `<div class="seg" style="margin-bottom:12px" id="cap-seg">${[['task', '✅ Aufgabe'], ['note', '💭 Gedanke'], ['deadline', '⏰ Deadline']].map(([k, l], i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-act="cap-type" data-type="${k}">${l}</button>`).join('')}</div>
      <input type="hidden" name="type" value="task">
      <textarea name="text" placeholder="Was geht dir durch den Kopf?" style="min-height:96px;font-size:15px" required autofocus></textarea>
      <div class="form-grid mt">
        <div id="cap-area"><label class="f">Bereich</label><select name="area">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}" ${k === 'uni' ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div id="cap-due" class="hidden"><label class="f">Frist</label><input type="date" name="due" value="${addKey(today(), 1)}"></div>
        <div class="full"><label class="f">Modul (optional)</label><select name="mod">${modOptions('')}</select></div></div>`,
    onOk: f => {
      const text = f.text.value.trim(); if (!text) return false; const type = f.type.value, now = Date.now();
      if (type === 'note') {
        const first = text.split('\n')[0].slice(0, 60);
        S.notes.push({ id: uid(), title: first, content: text, tags: [], status: S.statuses[0], moduleId: f.mod.value || null, created: now, u: now });
        toast('Gedanke gespeichert 💭');
      } else {
        S.tasks.push({ id: uid(), title: text.split('\n')[0].slice(0, 140), area: f.area.value, status: S.statuses[0], tags: [], due: type === 'deadline' ? (f.due.value || addKey(today(), 1)) : '', moduleId: f.mod.value || null, prio: type === 'deadline' ? 'hoch' : 'mittel', created: now, u: now });
        toast(type === 'deadline' ? 'Deadline eingetragen ⏰' : 'Aufgabe gespeichert ✅');
      }
      save(); render();
    }
  });
}
A['cap-type'] = (d, el) => {
  $$('#cap-seg button').forEach(b => b.classList.toggle('on', b === el)); $('#mf [name=type]').value = d.type;
  $('#cap-due').classList.toggle('hidden', d.type !== 'deadline'); $('#cap-area').classList.toggle('hidden', d.type === 'note');
};

/* =====================  STUDY HUB  ===================== */
let uniTab = 'modules', planMod = null, review = null;
const UNI_TABS = [['modules', '📦', 'Module'], ['plan', '🗓️', 'Lernplan'], ['cards', '🃏', 'Karteikarten'], ['notes', '📝', 'Notizen & Templates'], ['stats', '📈', 'Statistik']];
VIEWS.uni = {
  title: () => '📚 Study Hub 学习',
  sub: () => 'Module · Rückwärts-Lernplan · Spaced Repetition · Notizen',
  render() {
    const due = dueCards().length;
    const tabs = `<div class="sub-tabs">${UNI_TABS.map(([k, i, l]) => `<button class="${uniTab === k ? 'on' : ''}" data-act="uni-tab" data-tab="${k}"><span>${i}</span>${l}${k === 'cards' && due ? ` <span class="chip c-gold">${due}</span>` : ''}</button>`).join('')}</div>`;
    const body = ({ modules: uniModules, plan: uniPlan, cards: uniCards, notes: uniNotes, stats: uniStats })[uniTab]();
    return tabs + `<div class="stack" style="margin-top:20px">${body}</div>`;
  }
};
A['uni-tab'] = d => { uniTab = d.tab; if (current !== 'uni') go('uni', { top: true }); else render(); };

/* ---- Module ---- */
function uniModules() {
  const cards = S.modules.map(m => {
    const p = modProgress(m), secs = secMod(m.id), goal = (m.goalH || 0) * 3600, dl = m.exam ? diffDays(today(), m.exam) : null;
    return `<div class="card hover" style="border-left:6px solid ${m.color}">
      <div class="row between"><h3>${esc(m.name)}</h3><button class="btn btn-ghost btn-sm" data-act="mod-edit" data-id="${m.id}" aria-label="Bearbeiten">✎</button></div>
      <p class="xs muted" style="margin:2px 0 12px">${m.exam ? `Klausur ${fmtDate(m.exam)} · ${dl >= 0 ? `in ${dl} Tagen` : 'vorbei'}` : (m.goalText || 'Kein Klausurdatum')}</p>
      ${m.kind === 'lang' ? langBlock(m) : learnBlock(m)}
      <div class="row wrap mt">${m.kind === 'lang' ? '' : `<button class="btn btn-jade btn-sm" data-act="mod-plan" data-id="${m.id}">Lernplan</button>`}<button class="btn btn-pink btn-sm" data-act="mod-focus" data-id="${m.id}">▶ Fokus</button></div>
    </div>`;
  }).join('');
  return `<div class="row between"><h3 style="font-size:17px">Meine Module</h3><button class="btn btn-jade" data-act="mod-new">+ Modul</button></div>
    ${S.modules.length ? `<div class="grid g-auto">${cards}</div>` : `<div class="card empty">Noch keine Module. Lege z. B. „Mathe 1“ oder „Software Development“ an.</div>`}`;
}
A['mod-plan'] = d => { planMod = d.id; uniTab = 'plan'; render(); };
A['mod-focus'] = d => { S.timer.moduleId = d.id; save(); go('focus', { top: true }); };
A['mod-new'] = () => openModForm(null);
A['mod-edit'] = d => openModForm(d.id);
function openModForm(id) {
  const m = id ? modById(id) : { name: '', color: MOD_COLORS[S.modules.length % MOD_COLORS.length], exam: '', chapters: 8, buffer: 3, goalH: 40 };
  openModal({
    title: id ? 'Modul bearbeiten' : 'Neues Modul', danger: id ? 'Löschen' : null,
    onDanger: () => {
      S.modules = S.modules.filter(x => x.id !== id); S.habits = S.habits.filter(h => !(h.auto === 'mod' && h.modId === id));
      S.sessions.forEach(s => { if (s.moduleId === id) s.moduleId = null; }); S.cards.forEach(c => { if (c.moduleId === id) c.moduleId = null; });
      S.tasks.forEach(t => { if (t.moduleId === id) t.moduleId = null; }); S.notes.forEach(n => { if (n.moduleId === id) n.moduleId = null; });
      if (S.timer.moduleId === id) S.timer.moduleId = null; save(); render(); toast('Modul gelöscht (Lernzeiten bleiben ohne Zuordnung erhalten)');
    },
    body: `<div class="form-grid">
      <div class="full"><label class="f">Name</label><input type="text" name="name" value="${esc(m.name)}" required autofocus placeholder="z. B. Statistik"></div>
      <div><label class="f">Klausurdatum</label><input type="date" name="exam" value="${esc(m.exam)}"></div>
      <div><label class="f">Lernziel (Stunden)</label><input type="number" name="goalH" value="${m.goalH || 0}" min="0"></div>
      <div><label class="f">Kapitel / Themen</label><input type="number" name="chapters" value="${m.chapters}" min="1" max="99"></div>
      <div><label class="f">Puffertage vor Klausur</label><input type="number" name="buffer" value="${m.buffer}" min="0" max="30"></div>
      <div><label class="f">Typ</label><select name="kind"><option value="" ${m.kind !== 'lang' ? 'selected' : ''}>Prüfungsfach</option><option value="lang" ${m.kind === 'lang' ? 'selected' : ''}>Sprache / Dauerziel</option></select></div>
      <div><label class="f">Tagesziel (Min) – für Sprachen</label><input type="number" name="dailyMin" value="${m.dailyMin || 0}" min="0" max="240"></div>
      <div class="full"><label class="f">Lernziel (Text, optional)</label><input type="text" name="goalText" value="${esc(m.goalText || '')}" placeholder="z. B. HSK 2 bis Sommer"></div>
      <div class="full"><label class="f">Farbe</label><div class="row wrap">${MOD_COLORS.map(c => `<label style="cursor:pointer"><input type="radio" name="color" value="${c}" ${c === m.color ? 'checked' : ''} style="display:none"><span style="display:block;width:28px;height:28px;border-radius:50%;background:${c};border:3px solid transparent" class="swatch"></span></label>`).join('')}</div></div></div>
      <style>input[name=color]:checked+.swatch{border-color:var(--text)!important}</style>`,
    onOk: f => {
      const name = f.name.value.trim(); if (!name) return false;
      const vals = { name, exam: f.exam.value, goalH: +f.goalH.value || 0, chapters: clamp(+f.chapters.value || 1, 1, 99), buffer: clamp(+f.buffer.value || 0, 0, 30), color: (f.querySelector('input[name=color]:checked') || {}).value || m.color, kind: f.kind.value || '', dailyMin: +f.dailyMin.value || 0, goalText: f.goalText.value.trim() };
      if (id) { const re = vals.exam !== m.exam || vals.chapters !== m.chapters || vals.buffer !== m.buffer; Object.assign(m, vals, { u: Date.now() }); if (re && m.exam) m.plan = buildPlan(m, today()); syncLangHabit(m); }
      else { const nm = { id: 'm-' + uid(), start: today(), plan: [], u: Date.now(), ...vals }; if (nm.exam) nm.plan = buildPlan(nm, today()); S.modules.push(nm); syncLangHabit(nm); planMod = nm.id; }
      save(); render();
    }
  });
}

/* ---- Lernplan ---- */
function uniPlan() {
  if (!S.modules.find(m => m.id === planMod)) planMod = S.modules[0] && S.modules[0].id;
  const m = modById(planMod), t = today();
  const gen = `<div class="card hero" style="border:1px solid var(--jade-border)">
    <h4 style="margin-bottom:10px">⚡ Lernplan-Rechner</h4>
    <div class="grid g4" style="gap:12px">
      <div><label class="f">Modul / Fach</label><input type="text" id="gen-subject" value="${esc(m ? m.name : '')}" placeholder="z. B. Makroökonomie"></div>
      <div><label class="f">Klausur-Datum</label><input type="date" id="gen-date" value="${esc(m ? m.exam : addKey(t, 45))}"></div>
      <div><label class="f">Anzahl Kapitel</label><input type="number" id="gen-ch" value="${m ? m.chapters : 8}" min="1" max="99"></div>
      <div><label class="f">Puffertage vor Klausur</label><input type="number" id="gen-buf" value="${m ? m.buffer : 3}" min="0" max="30"></div></div>
    <button class="btn btn-jade mt" data-act="plan-gen">🌸 Lernplan berechnen</button>
    <p class="xs muted mt">Die App verteilt die Kapitel gleichmäßig von heute bis zum letzten Lerntag und legt die Puffertage direkt vor die Klausur (Wiederholung).</p></div>`;
  if (!m) return gen;
  const plan = m.plan || [], p = modProgress(m);
  const rows = plan.map(e => {
    const late = !e.done && e.date < t && e.type !== 'exam';
    return `<div class="item ${e.done ? 'done' : ''}" style="${e.date === t ? 'border-color:var(--jade)' : ''}">
      ${e.type === 'exam' ? '<span style="width:17px;text-align:center">🎓</span>' : `<input type="checkbox" ${e.done ? 'checked' : ''} data-change="plan-toggle" data-mod="${m.id}" data-id="${e.id}">`}
      <span class="timeline-time" style="width:84px">${DAYS[dow(parseD(e.date))]} ${fmtShort(e.date)}${e.date === t ? ' · heute' : ''}</span>
      <span class="t">${esc(e.label)}</span>
      ${e.type === 'buffer' ? '<span class="chip c-gold">Puffer</span>' : ''}${late ? '<span class="chip c-pink">überfällig</span>' : ''}${e.type === 'exam' ? '<span class="chip c-pink">Klausur</span>' : ''}</div>`;
  }).join('');
  return gen + `<div class="card">
    <div class="row between wrap"><div class="row"><span class="chip" style="background:${m.color};color:#fff">${esc(m.name)}</span>
      <select data-change="plan-mod" style="width:auto" aria-label="Modul wählen">${S.modules.map(x => `<option value="${x.id}" ${x.id === m.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <button class="btn btn-ghost btn-sm" data-act="plan-redo" data-id="${m.id}">↻ Ab heute neu verteilen</button></div>
    <div class="row between xs" style="margin:12px 0 4px"><span>${p.done} von ${p.total} Kapiteln</span><b>${p.pct} %</b></div>${bar(p.pct)}
    ${overdueCount(m) ? `<div class="note-box nb-pink mt">⏰ ${overdueCount(m)} Kapitel sind überfällig. <button class="link" data-act="plan-redo" data-id="${m.id}">Jetzt neu verteilen</button></div>` : ''}
    <p class="xs muted mt">${S.settings.autoReplan ? '🔄 Auto-Anpassung an: verpasste Kapitel werden automatisch auf die verbleibenden Tage verteilt.' : 'Auto-Anpassung aus (Einstellungen).'}</p>
    ${m.planWarn ? `<div class="note-box nb-pink mt">⚠️ Bis zur Klausur bleibt zu wenig Zeit – alle offenen Kapitel liegen auf heute. Verkürze die Puffertage oder verschiebe das Ziel.</div>` : ''}
    <div class="stack mt">${rows || '<div class="empty">Kein Klausurdatum gesetzt.</div>'}</div></div>`;
}
A['plan-mod'] = (d, el) => { planMod = el.value; render(); };
A['plan-redo'] = d => { const m = modById(d.id); if (!m) return; m.plan = buildPlan(m, today()); m.u = Date.now(); save(); render(); toast('Plan neu verteilt'); };
A['plan-gen'] = () => {
  const name = $('#gen-subject').value.trim(), exam = $('#gen-date').value, ch = +$('#gen-ch').value, buf = +$('#gen-buf').value || 0;
  if (!name || !exam || ch < 1) { toast('Bitte Fach, Datum und Kapitelzahl angeben.'); return; }
  let m = S.modules.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (m) Object.assign(m, { exam, chapters: ch, buffer: buf });
  else { m = { id: 'm-' + uid(), start: today(), name, color: MOD_COLORS[S.modules.length % MOD_COLORS.length], exam, chapters: ch, buffer: buf, goalH: 40, plan: [] }; S.modules.push(m); }
  m.plan = buildPlan(m, today()); m.u = Date.now(); planMod = m.id; save(); render();
  toast(`Lernplan für ${name}: ${ch} Kapitel + ${buf} Puffertage 🌸`);
};

/* ---- Karteikarten (SRS) ---- */
function uniCards() {
  if (review) return reviewHTML();
  const due = dueCards(), t = today();
  const list = [...S.cards].sort((a, b) => a.due.localeCompare(b.due));
  return `<div class="card hero accent-l row between wrap">
      <div><h3>🃏 Heute zu wiederholen: ${due.length}</h3><p class="sm muted">${S.cards.length} Karten gesamt · Schwere Karten kommen früher wieder.</p></div>
      <div class="row"><button class="btn btn-gold" data-act="review-start" ${due.length ? '' : 'disabled style="opacity:.5"'}>Wiederholung starten</button><button class="btn btn-jade" data-act="card-new">+ Karten</button></div></div>
    <div class="stack">${list.length ? list.map(c => {
      const dd = diffDays(t, c.due);
      return `<div class="item"><div class="t"><b>${esc(c.front)}</b><div class="row wrap" style="gap:4px;margin-top:3px">${modChip(c.moduleId)}<span class="chip ${dd <= 0 ? 'c-gold' : 'c-gray'}">${dd <= 0 ? 'fällig' : 'in ' + dd + ' T'}</span>${c.lapses ? `<span class="chip c-pink">${c.lapses}× vergessen</span>` : ''}</div></div><button class="btn btn-ghost btn-sm" data-act="card-edit" data-id="${c.id}">✎</button></div>`;
    }).join('') : '<div class="card empty">Noch keine Karten. Erstelle Karten pro Thema – die App plant die Wiederholungen automatisch.</div>'}</div>`;
}
function reviewHTML() {
  const r = review, c = S.cards.find(x => x.id === r.queue[0]);
  if (!c) return `<div class="card center" style="padding:40px"><div style="font-size:44px">🌸</div><h3 style="margin:8px 0">Geschafft!</h3><p class="muted sm">${r.done} Karten wiederholt. Bis morgen!</p><button class="btn btn-jade mt2" data-act="review-end">Zurück</button></div>`;
  const pct = r.total ? Math.round(100 * r.done / r.total) : 0;
  return `<div class="row between"><button class="btn btn-ghost btn-sm" data-act="review-end">← Beenden</button><span class="xs muted">${r.done}/${r.total} · ${r.queue.length} offen</span></div>${bar(pct)}
    <div class="card flash" data-act="review-flip"><div>${modChip(c.moduleId)}<div style="margin-top:10px">${esc(c.front)}</div>${r.show ? `<div class="ans">${esc(c.back).replace(/\n/g, '<br>')}</div>` : '<div class="xs faint" style="margin-top:20px;font-weight:400">Tippen zum Aufdecken</div>'}</div></div>
    ${r.show ? `<div class="grid g4" style="gap:10px">${[['Nochmal', 0, 'btn-danger'], ['Schwer', 1, 'btn-ghost'], ['Gut', 2, 'btn-jade'], ['Einfach', 3, 'btn-gold']].map(([l, g, cl]) => `<button class="btn ${cl}" data-act="review-grade" data-g="${g}" style="flex-direction:column;gap:0">${l}<span class="xs" style="font-weight:500;opacity:.8">${nextIntervalLabel(c, g)}</span></button>`).join('')}</div>` : `<button class="btn btn-pink" data-act="review-flip" style="width:100%;padding:13px">Antwort zeigen</button>`}`;
}
A['review-start'] = () => {
  const q = dueCards().map(c => c.id).sort(() => Math.random() - .5);
  if (!q.length) { toast('Heute ist nichts fällig 🌸'); return; }
  review = { queue: q, show: false, total: q.length, done: 0 }; uniTab = 'cards'; if (current !== 'uni') go('uni', { top: true }); else render();
};
A['review-end'] = () => { review = null; render(); };
A['review-flip'] = () => { if (review) { review.show = !review.show; render(); } };
A['review-grade'] = d => {
  if (!review) return; const id = review.queue.shift(); gradeCard(id, +d.g);
  if (+d.g === 0) review.queue.push(id); else review.done++;
  review.show = false; render();
};
A['card-new'] = () => openCardForm(null);
A['card-edit'] = d => openCardForm(d.id);
function openCardForm(id) {
  const c = id ? S.cards.find(x => x.id === id) : { front: '', back: '', moduleId: (S.modules[0] || {}).id };
  openModal({
    title: id ? 'Karte bearbeiten' : 'Neue Karteikarten', danger: id ? 'Löschen' : null,
    onDanger: () => { S.cards = S.cards.filter(x => x.id !== id); save(); render(); },
    body: `<div class="form-grid"><div class="full"><label class="f">Modul</label><select name="mod">${modOptions(c.moduleId, 'Ohne Modul')}</select></div>
      <div class="full"><label class="f">Vorderseite (Frage)</label><textarea name="front" style="min-height:64px" autofocus>${esc(c.front)}</textarea></div>
      <div class="full"><label class="f">Rückseite (Antwort)</label><textarea name="back" style="min-height:64px">${esc(c.back)}</textarea></div>
      ${id ? '' : `<div class="full"><label class="f">Oder mehrere auf einmal (je Zeile: Frage | Antwort)</label><textarea name="bulk" placeholder="Ohmsches Gesetz | U = R · I&#10;Kirchhoff'sche Maschenregel | Summe aller Spannungen im Umlauf = 0" style="min-height:90px"></textarea></div>`}</div>`,
    onOk: f => {
      const now = Date.now(); const mk = (front, back) => ({ id: uid(), moduleId: f.mod.value || null, front, back, due: today(), interval: 0, ease: 2.5, reps: 0, lapses: 0, u: now });
      if (id) { const fr = f.front.value.trim(), ba = f.back.value.trim(); if (!fr || !ba) return false; Object.assign(c, { front: fr, back: ba, moduleId: f.mod.value || null, u: now }); }
      else {
        let n = 0; const fr = f.front.value.trim(), ba = f.back.value.trim(); if (fr && ba) { S.cards.push(mk(fr, ba)); n++; }
        (f.bulk.value || '').split('\n').forEach(l => { const p = l.split(/\s*[|;\t]\s*/); if (p.length >= 2 && p[0].trim() && p[1].trim()) { S.cards.push(mk(p[0].trim(), p.slice(1).join(' | ').trim())); n++; } });
        if (!n) return false; toast(`${n} Karte${n > 1 ? 'n' : ''} angelegt`);
      }
      save(); render();
    }
  });
}

/* ---- Notizen & Templates ---- */
const TEMPLATES = [
  { id: 'lecture', ico: '📝', name: 'Vorlesungsmitschrift', desc: 'Kernaussagen, Formeln, offene Fragen', body: '# Vorlesung: \n**Datum:** \n**Thema:** \n\n## Kernaussagen\n- \n\n## Definitionen & Formeln\n- \n\n## Beispiele\n- \n\n## Offene Fragen\n- [ ] \n\n## Danach\n- [ ] Karteikarten erstellen\n- [ ] Übungsaufgaben rechnen\n' },
  { id: 'exam', ico: '🎯', name: 'Klausurvorbereitung', desc: 'Themenliste, Rückwärtsplan, Altklausuren', body: '# Klausurvorbereitung: \n**Termin:** \n**Erlaubte Hilfsmittel:** \n\n## Themenübersicht\n- [ ] Thema 1\n- [ ] Thema 2\n- [ ] Thema 3\n\n## Rückwärtsplan\n- [ ] 4 Wochen vorher: Stoff sichten, Lücken markieren\n- [ ] 2 Wochen vorher: Zusammenfassung + Karteikarten\n- [ ] 1 Woche vorher: Altklausuren unter Zeitdruck\n- [ ] 2 Tage vorher: nur Wiederholung & Formelsammlung\n- [ ] Vortag: früh schlafen, Unterlagen packen\n\n## Altklausuren / Übungen\n- \n\n## Schwachstellen\n- \n' },
  { id: 'paper', ico: '📚', name: 'Hausarbeit', desc: 'Forschungsfrage, Gliederung, Zeitplan', body: '# Hausarbeit: \n**Abgabe:** \n**Umfang:** \n\n## Forschungsfrage\n\n## Gliederung\n- [ ] Einleitung\n- [ ] Hauptteil\n- [ ] Fazit\n- [ ] Literaturverzeichnis\n\n## Quellen\n- \n\n## Zeitplan\n- [ ] Thema abgestimmt\n- [ ] Literatur gesammelt\n- [ ] Erste Fassung\n- [ ] Korrekturlesen\n- [ ] Formalia prüfen & abgeben\n' },
  { id: 'lab', ico: '⚡', name: 'Laborprotokoll', desc: 'E-Technik: Aufbau, Messwerte, Auswertung', body: '# Laborprotokoll: \n**Datum:** \n**Gruppe:** \n\n## Ziel\n\n## Theorie / Formeln\n- \n\n## Aufbau & Geräte\n- \n\n## Durchführung\n- \n\n## Messwerte\n- \n\n## Auswertung & Fehlerabschätzung\n- \n\n## Fazit\n\n## Checkliste\n- [ ] Schaltplan beigefügt\n- [ ] Einheiten geprüft\n- [ ] Diagramme beschriftet\n' },
  { id: 'code', ico: '🐍', name: 'Programmier-Übung', desc: 'Aufgabe, Idee, Tests, Gelerntes', body: '# Übung: \n**Abgabe:** \n\n## Aufgabe\n\n## Lösungsidee\n- \n\n## Code-Skizze\n\n## Tests\n- [ ] Normalfall\n- [ ] Grenzfälle\n- [ ] Fehlerfälle\n\n## Gelernt\n- \n' },
  { id: 'week', ico: '🌸', name: 'Wochenreview', desc: 'Rückblick auf Uni, Training und Energie', body: '# Wochenreview\n\n## Was lief gut?\n- \n\n## Was hat gehakt?\n- \n\n## Lernzeit & Training\n- Lernzeit: \n- Wushu/Gym-Einheiten: \n\n## Nächste Woche\n- [ ] \n- [ ] \n- [ ] \n' }
];
function uniNotes() {
  const notes = [...S.notes].sort((a, b) => (b.u || 0) - (a.u || 0));
  return `<div class="row between"><h3 style="font-size:17px">Template-Bibliothek</h3><button class="btn btn-ghost" data-act="note-new" data-tpl="">+ Leere Notiz</button></div>
    <div class="grid g-auto">${TEMPLATES.map(t => `<button class="card hover" style="text-align:left" data-act="note-new" data-tpl="${t.id}"><div style="font-size:26px">${t.ico}</div><h4 style="margin-top:4px">${t.name}</h4><p class="xs muted">${t.desc}</p></button>`).join('')}</div>
    <h3 style="font-size:17px;margin-top:10px">Meine Notizen (${notes.length})</h3>
    <div class="stack">${notes.length ? notes.map(n => `<div class="item" style="cursor:pointer" data-act="note-edit" data-id="${n.id}"><div class="t"><b>${esc(n.title || 'Ohne Titel')}</b><div class="row wrap" style="gap:4px;margin-top:3px">${modChip(n.moduleId)}<span class="chip c-gray">${esc(n.status)}</span>${(n.tags || []).map(tagChip).join('')}<span class="xs faint">${fmtShort(dkey(new Date(n.u || n.created || Date.now())))}</span></div></div></div>`).join('') : '<div class="card empty">Noch keine Notizen. Wähle oben ein Template.</div>'}</div>`;
}
A['note-new'] = d => openNoteForm(null, d.tpl);
A['note-edit'] = d => openNoteForm(d.id);
function renderMd(text) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); let html = '', inList = false;
  text.split('\n').forEach((ln, i) => {
    const cb = ln.match(/^\s*- \[( |x|X)\] ?(.*)$/), li = ln.match(/^\s*- (.*)$/);
    if (cb) { if (!inList) { html += '<ul>'; inList = true; } html += `<li><input type="checkbox" ${cb[1] !== ' ' ? 'checked' : ''} data-act="md-check" data-line="${i}"><span ${cb[1] !== ' ' ? 'style="text-decoration:line-through;color:var(--faint)"' : ''}>${inl(cb[2])}</span></li>`; return; }
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li><span>•</span><span>${inl(li[1])}</span></li>`; return; }
    if (inList) { html += '</ul>'; inList = false; }
    const h = ln.match(/^(#{1,3}) (.*)$/); if (h) html += `<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`; else if (ln.trim()) html += `<p>${inl(ln)}</p>`;
  });
  return html + (inList ? '</ul>' : '');
}
A['md-check'] = d => {
  const ta = $('#mf [name=content]'); const lines = ta.value.split('\n'), i = +d.line;
  lines[i] = /\[ \]/.test(lines[i]) ? lines[i].replace('[ ]', '[x]') : lines[i].replace(/\[[xX]\]/, '[ ]');
  ta.value = lines.join('\n'); $('#note-view').innerHTML = renderMd(ta.value);
};
A['note-preview'] = (d, el) => {
  const ta = $('#mf [name=content]'), v = $('#note-view'), show = v.classList.contains('hidden');
  if (show) v.innerHTML = renderMd(ta.value);
  v.classList.toggle('hidden', !show); ta.classList.toggle('hidden', show); el.textContent = show ? '✎ Bearbeiten' : '👁 Ansicht';
};
function openNoteForm(id, tpl) {
  const tp = tpl ? TEMPLATES.find(x => x.id === tpl) : null;
  const n = id ? S.notes.find(x => x.id === id) : { title: tp ? tp.name : '', content: tp ? tp.body : '', tags: [], status: S.statuses[0], moduleId: null };
  openModal({
    wide: true, sticky: true, title: id ? 'Notiz' : 'Neue Notiz', danger: id ? 'Löschen' : null,
    onDanger: () => { S.notes = S.notes.filter(x => x.id !== id); save(); render(); },
    body: `<div class="form-grid">
      <div class="full"><label class="f">Titel</label><input type="text" name="title" value="${esc(n.title)}" required></div>
      <div><label class="f">Modul</label><select name="mod">${modOptions(n.moduleId)}</select></div>
      <div><label class="f">Status</label><select name="status">${S.statuses.map(s => `<option ${n.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="full"><label class="f">Tags</label>${tagChecks(n.tags)}</div>
      <div class="full"><div class="row between" style="margin-bottom:4px"><label class="f" style="margin:0">Inhalt (Markdown-light: # Überschrift, - Liste, - [ ] Checkbox, **fett**)</label><button type="button" class="btn btn-ghost btn-sm" data-act="note-preview">👁 Ansicht</button></div>
        <textarea name="content" style="min-height:300px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px">${esc(n.content)}</textarea><div id="note-view" class="md hidden card flat" style="min-height:300px"></div></div></div>`,
    onOk: f => {
      const title = f.title.value.trim(); if (!title) return false; const tags = $$('input[name=tag]:checked', f).map(x => x.value), now = Date.now();
      if (id) Object.assign(n, { title, content: f.content.value, moduleId: f.mod.value || null, status: f.status.value, tags, u: now });
      else S.notes.push({ id: uid(), title, content: f.content.value, moduleId: f.mod.value || null, status: f.status.value, tags, template: tpl || '', created: now, u: now });
      save(); render();
    }
  });
}

/* ---- Statistik ---- */
function uniStats() {
  const total = S.sessions.reduce((a, s) => a + s.sec, 0), wkStart = addKey(today(), -6), wk = S.sessions.filter(s => s.date >= wkStart).reduce((a, s) => a + s.sec, 0);
  const avg = weekdayAvg(8), best = avg.indexOf(Math.max(...avg)), days14 = lastDays(14);
  const mods = S.modules.map(m => ({ name: m.name, color: m.color, sec: secMod(m.id), goal: (m.goalH || 0) * 3600 }));
  const none = S.sessions.filter(s => !s.moduleId || !modById(s.moduleId)).reduce((a, s) => a + s.sec, 0); if (none) mods.push({ name: 'Ohne Modul', color: 'var(--faint)', sec: none, goal: 0 });
  const maxSec = Math.max(...mods.map(m => Math.max(m.sec, m.goal)), 1);
  return `<div class="grid g4">
      ${[['Gesamt', fmtHours(total), 'jade'], ['Letzte 7 Tage', fmtHours(wk), 'pink'], ['Streak', streak() + ' Tage', 'gold'], ['Sessions', S.sessions.length, 'jade']].map(([l, v, c]) => `<div class="card center"><div class="xs muted">${l}</div><div class="${c}-t b" style="font-size:24px">${v}</div></div>`).join('')}</div>
    <div class="grid g2">
      <div class="card"><h3>Produktivste Wochentage</h3><p class="xs muted" style="margin:2px 0 12px">Ø Lernminuten pro Wochentag (letzte 8 Wochen)</p>${barChart(avg, DAYS, true, 'm')}
        <p class="sm mt">${Math.max(...avg) > 0 ? `Dein stärkster Tag: <b class="jade-t">${DAYS_LONG[best]}</b> (Ø ${avg[best]} Min).` : 'Sobald du Zeiten erfasst, siehst du hier dein Muster.'}</p></div>
      <div class="card"><h3>Letzte 14 Tage</h3><p class="xs muted" style="margin:2px 0 12px">Lernminuten pro Tag</p>${barChart(days14.map(x => x.min), days14.map(x => parseD(x.k).getDate()), false, '')}</div></div>
    <div class="card"><h3>Lernzeit pro Modul</h3><div class="stack mt">${mods.length ? mods.map(m => `<div class="hbar"><span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span><div class="bar" style="position:relative">${m.goal ? `<span style="position:absolute;left:${100 * m.goal / maxSec}%;top:0;bottom:0;width:2px;background:var(--gold)"></span>` : ''}<i style="width:${100 * m.sec / maxSec}%;background:${m.color}"></i></div><b>${fmtHours(m.sec)}</b></div>`).join('') : '<div class="empty">Noch keine Module.</div>'}</div>
      <p class="xs faint mt">Goldene Linie = Lernziel des Moduls.</p></div>`;
}

/* =====================  WUSHU & GYM  ===================== */
let wushuTab = 'woche', wushuOpen = null;
const WTABS = () => {
  const t = [{ k: 'woche', i: '📅', l: 'Woche', s: 'Übersicht' }, { k: 'ziel', i: '🎯', l: 'Ziel', s: 'Countdown' }];
  WUSHU_DATA.sessions.forEach((s, i) => t.push({ k: 's' + i, i: s.icon, l: s.day.slice(0, 2), s: s.title.split(' ')[0].replace(/,$/, '') }));
  t.push({ k: 'skill', i: '🥋', l: 'Kurs', s: 'Di · Do · Sa' }); t.push({ k: 'fort', i: '📈', l: 'Werte', s: 'Fortschritt' }); t.push({ k: 'tipps', i: '🧭', l: 'Tipps', s: 'Coach' }); return t;
};
const loadBadge = l => l === 'HART' ? '<span class="chip c-pink">HART</span>' : l === 'MITTEL' ? '<span class="chip c-gold">MITTEL</span>' : '<span class="chip c-jade">LEICHT</span>';
VIEWS.wushu = {
  title: () => '🥋 武术 Wushu & Gym',
  sub: () => 'Gym Mo·Mi·Fr·So + Wushu Di·Do·Sa',
  render() {
    const tabs = `<div class="sub-tabs">${WTABS().map(t => `<button class="${wushuTab === t.k ? 'on' : ''}" data-act="wushu-tab" data-tab="${t.k}"><span>${t.i}</span><span style="text-align:left"><div>${t.l}</div><div class="xs" style="font-weight:500;opacity:.7">${t.s}</div></span></button>`).join('')}</div>`;
    let body;
    if (wushuTab === 'woche') body = checkinCard() + todayWorkoutCard() + wocheView(); else if (wushuTab === 'ziel') body = zielView(); else if (wushuTab === 'fort') body = progressView(); else if (wushuTab === 'tipps') body = tippsView(); else if (wushuTab === 'skill') body = sessionView('skill'); else body = sessionView(+wushuTab.slice(1));
    return tabs + `<div class="stack" style="margin-top:20px">${body}</div>`;
  }
};
A['wushu-tab'] = d => { wushuTab = d.tab; wushuOpen = null; render(); $('#view').scrollTop = 0; };
A['wushu-open'] = d => { wushuTab = d.tab; wushuOpen = null; go('wushu', { top: true }); };
A['wushu-ex'] = d => { wushuOpen = wushuOpen === d.k ? null : d.k; render(); };
A['wushu-chk'] = (d, el) => { const k = today() + '|' + d.k; if (el.checked) S.wushuDone[k] = true; else delete S.wushuDone[k]; save(); render(); };
function wocheView() {
  const td = dow(new Date());
  return `<div class="card hero accent-pink"><h3 class="cn" style="font-size:17px;color:var(--pink-text)">Dein 7-Tage-Trainingsplan</h3><p class="xs muted">4× Gym · 3× Wushu · Sonntag = Deload</p>
    <p class="sm mt"><b>Prinzip:</b> Harte Reize (Wushu + Plyo/Kraft) verteilt, beinschonende Gym-Tage vor Wushu, Sonntag echter Deload. „Harte Tage hart, leichte Tage leicht.“</p></div>
    ${WUSHU_DATA.week.map((w, i) => {
      const si = SESSION_BY_DOW[i];
      return `<div class="card hover" style="border-left:5px solid ${w.color};${i === td ? 'outline:2px solid var(--jade)' : ''};${si !== undefined ? 'cursor:pointer' : ''}" data-act="wushu-tab" data-tab="${tabFor(si)}">
      <div class="row" style="align-items:flex-start;gap:14px"><div class="b" style="font-size:19px;width:32px;color:${w.color}">${w.d}</div>
        <div class="grow"><div class="row wrap" style="gap:6px;margin-bottom:3px"><span class="chip" style="color:${w.color};border-color:${w.color}">${w.type}</span>${loadBadge(w.load)}${i === td ? '<span class="chip c-jade">heute</span>' : ''}${si === 'skill' ? courseChip(addKey(weekStart(today()), i)) : ''}</div>
        <div class="b">${esc(w.title)}</div><div class="xs muted" style="margin-top:2px">${esc(w.note)}</div></div>${si !== undefined ? '<span class="faint">›</span>' : ''}</div></div>`;
    }).join('')}
    <div class="note-box" style="background:var(--gold-soft);border-color:var(--gold)"><b class="gold-t">🔥 Ausdauer & 🐉 Kombination</b><div class="xs muted" style="margin-top:3px">Wushu-spezifisch eingebaut: Ausdauer = komplette Taolu-Durchläufe bei Tempo als Finisher an Wushu-Tagen (Phase 3). Kombination = Sprung-in-Pose & Simulation im Wettkampf-Fokus.</div></div>`;
}
function phaseCards(list) { return list.map(p => `<div class="card" style="border-left:5px solid ${p.color}"><div class="b" style="color:${p.color}">${esc(p.title)}</div><div class="xs faint b" style="margin:2px 0 6px">${esc(p.sub)}</div><div class="sm muted">${esc(p.desc)}</div></div>`).join(''); }
function tippsView() {
  return `<div class="card accent-pink" style="background:var(--pink-soft)"><h3 class="cn pink-t">🧭 Coach-Hinweise</h3><p class="xs muted">Damit die 7-Tage-Woche verletzungsfrei und mit maximaler Power aufgeht.</p></div>
    <div class="stack">${WUSHU_DATA.coachTips.map(t => `<div class="item"><span class="pink-t b">•</span><span class="t">${esc(t)}</span></div>`).join('')}</div>
    <h4 class="cn" style="margin-top:8px">🥋 Wushu-Tage Struktur (Di · Do · Sa)</h4>
    <div class="stack">${WUSHU_DATA.wushuDays.map(w => `<div class="note-box nb-pink"><b>${esc(w.d)}</b><div class="muted" style="margin-top:2px">${esc(w.note)}</div></div>`).join('')}</div>`;
}
function sessionView(idx) {
  const s = getSession(idx); if (!s) return '';
  const t = today(); let total = 0, done = 0;
  s.blocks.forEach((b, bi) => { if (b.kind === 'main') b.items.forEach((e, ei) => { total++; if (S.wushuDone[`${t}|${idx}|${bi}-${ei}`]) done++; }); });
  const trainH = S.habits.find(h => h.id === 'h-train'), trained = trainH && habitDone(t, trainH);
  const blocks = s.blocks.map((b, bi) => {
    if (b.kind !== 'main') {
      return `<div class="stack"><div class="row between"><h4 style="color:${s.color}">${b.kind === 'warmup' ? '🔥' : '🧘'} ${esc(b.name)}</h4><span class="chip c-gray">${esc(b.time)}</span></div>${b.sub ? `<p class="xs muted" style="font-style:italic">${esc(b.sub)}</p>` : ''}
        ${b.items.map(it => `<div class="item" style="align-items:flex-start;flex-wrap:wrap"><b class="sm" style="min-width:90px">${esc(it.n)}</b><span class="t muted">${esc(it.detail)}</span></div>`).join('')}</div>`;
    }
    return `<div style="margin-top:6px"><div class="row between"><h4 style="color:${s.color}">${esc(b.name)}</h4><span class="chip c-gray">${esc(b.time)}</span></div>${b.sub ? `<p class="xs muted" style="font-style:italic;margin:2px 0 8px">${esc(b.sub)}</p>` : ''}
      ${b.items.map((e, ei) => {
        const key = `${idx}|${bi}-${ei}`, ck = !!S.wushuDone[`${t}|${key}`], open = wushuOpen === key;
        return `<div class="ex ${ck ? 'done' : ''}"><div class="row" style="padding:12px 14px"><input type="checkbox" ${ck ? 'checked' : ''} data-change="wushu-chk" data-k="${key}" aria-label="Erledigt">
          <div class="grow" style="cursor:pointer" data-act="wushu-ex" data-k="${key}"><div class="b sm" style="margin-bottom:5px">${esc(e.n)}</div><div class="row wrap" style="gap:5px"><span class="chip c-pink">${esc(e.s)}</span><span class="chip c-gold">${esc(e.r)}</span><span class="chip c-gray">⏱ ${esc(e.p)}</span></div></div>
          <span class="faint" style="${open ? 'transform:rotate(180deg)' : ''}">▼</span></div>
          ${open ? `<div class="stack" style="padding:0 14px 14px;border-top:1px solid var(--border);padding-top:12px"><p class="sm">${esc(e.d)}</p>
            <div class="note-box nb-pink"><b class="pink-t xs">🐉 Wushu-Übertragung</b><div style="margin-top:2px">${esc(e.wt)}</div></div>
            ${e.pe ? `<div class="note-box nb-jade"><b class="jade-t xs">⚡ Dynamik in der Pause: ${esc(e.pe)}</b><div class="muted" style="margin-top:2px">${esc(e.pd)}</div></div>` : ''}</div>` : ''}</div>`;
      }).join('')}</div>`;
  }).join('');
  return `<div class="card hero" style="border-left:6px solid ${s.color}"><div class="row" style="gap:14px"><span style="font-size:32px">${s.icon}</span><div class="grow"><h3 class="cn" style="font-size:17px">${esc(s.day)} · ${esc(s.title)}</h3><p class="xs muted">${esc(s.sub)}</p></div></div>
      <p class="sm mt"><b>Ziel:</b> ${esc(s.target)}</p>
      <div class="row between xs" style="margin-top:12px"><span>Heutiger Fortschritt</span><b>${done}/${total} Übungen</b></div>${bar(total ? 100 * done / total : 0, 'pink')}
      <div class="row wrap mt"><button class="btn btn-pink" data-act="wk-start" data-sid="${idx}">${S.workout ? '↩ Workout fortsetzen' : '▶ Workout starten (Sätze abhaken)'}</button>
      <button class="btn ${trained ? 'btn-jade' : 'btn-ghost'}" data-act="habit-toggle" data-id="h-train">${trained ? '✓ Einheit abgeschlossen' : 'Einheit manuell abhaken'}</button>${idx === 'skill' ? courseChip(t) : ''}</div></div>
    <div class="stack" style="gap:18px">${blocks}</div>`;
}


/* ---- Fortschritt: Kraftwerte, Sprunghöhe, Beweglichkeit ---- */
const measOf = id => S.measures.filter(x => x.metricId === id).sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
const fmtNum = v => String(Math.round(v * 10) / 10).replace('.', ',');
function spark(es) {
  if (es.length < 2) return '<div class="xs faint" style="height:44px;display:grid;align-items:center">Ab 2 Werten siehst du den Verlauf</div>';
  const w = 200, h = 44, v = es.map(e => e.value), mn = Math.min(...v), mx = Math.max(...v), r = (mx - mn) || 1;
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * (w - 8) + 4},${h - 5 - ((y - mn) / r) * (h - 10)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none"><polyline fill="none" stroke="var(--pink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}
function progressView() {
  const cards = S.metrics.map(m => {
    const es = measOf(m.id), last = es[es.length - 1], first = es[0];
    const best = es.length ? (m.up ? Math.max(...es.map(e => e.value)) : Math.min(...es.map(e => e.value))) : null;
    let delta = '';
    if (es.length >= 2) { const dv = last.value - first.value, good = m.up ? dv > 0 : dv < 0; delta = `<span class="chip ${dv === 0 ? 'c-gray' : good ? 'c-jade' : 'c-pink'}">${dv > 0 ? '+' : ''}${fmtNum(dv)} ${esc(m.unit)} seit Start</span>`; }
    return `<div class="card hover"><div class="row between"><h3>${esc(m.name)}</h3><button class="btn btn-ghost btn-sm" data-act="metric-edit" data-id="${m.id}" aria-label="Messwert bearbeiten">✎</button></div>
      <div class="row" style="align-items:baseline;gap:8px;margin:6px 0"><span class="b" style="font-size:28px">${last ? fmtNum(last.value) : '–'}</span><span class="muted sm">${esc(m.unit)}</span>${delta}</div>
      ${spark(es)}
      <div class="row between xs muted" style="margin-top:6px"><span>${es.length} Messung${es.length === 1 ? '' : 'en'}${last ? ' · zuletzt ' + fmtShort(last.date) : ''}</span><span>${best !== null ? 'Bestwert: ' + fmtNum(best) + ' ' + esc(m.unit) : ''}</span></div>
      <button class="btn btn-pink btn-sm mt" data-act="meas-add" data-id="${m.id}">+ Wert eintragen</button>
      ${es.length ? `<div class="stack mt">${es.slice(-4).reverse().map(e => `<div class="item" style="padding:6px 10px"><span class="xs muted" style="width:62px">${fmtShort(e.date)}</span><span class="t"><b>${fmtNum(e.value)}</b> ${esc(m.unit)}</span><button class="btn btn-danger btn-sm" data-act="meas-del" data-id="${e.id}" aria-label="Löschen">✕</button></div>`).join('')}</div>` : ''}</div>`;
  }).join('');
  return `<div class="card hero accent-pink row between wrap"><div><h3 class="cn pink-t">📈 Fortschritt messbar machen</h3><p class="xs muted">Trage regelmäßig deine Werte ein (Coach-Tipp: immer am gleichen Wochentag, nach dem Warm-up). So siehst du, ob Sprunghöhe, Kraft und Spagat wirklich besser werden.</p></div><button class="btn btn-jade" data-act="metric-new">+ Eigener Messwert</button></div>
    <div class="grid g-auto">${cards}</div>${workoutLog()}${exLogCard()}`;
}
A['meas-add'] = d => {
  const m = S.metrics.find(x => x.id === d.id); if (!m) return; const last = measOf(m.id).pop();
  openModal({
    title: `${esc(m.name)} eintragen`, okText: 'Speichern',
    body: `<div class="form-grid"><div><label class="f">Wert (${esc(m.unit)})</label><input type="text" inputmode="decimal" name="val" value="${last ? fmtNum(last.value) : ''}" required autofocus placeholder="z. B. 52,5"></div><div><label class="f">Datum</label><input type="date" name="date" value="${today()}"></div></div>`,
    onOk: f => { const v = parseFloat(String(f.val.value).trim().replace(',', '.')); if (isNaN(v)) return false; S.measures.push({ id: uid(), metricId: m.id, date: f.date.value || today(), value: v, ts: Date.now(), u: Date.now() }); save(); render(); toast('Wert gespeichert 📈'); }
  });
};
A['meas-del'] = d => { S.measures = S.measures.filter(x => x.id !== d.id); save(); render(); };
A['metric-new'] = () => openMetricForm(null);
A['metric-edit'] = d => openMetricForm(d.id);
function openMetricForm(id) {
  const m = id ? S.metrics.find(x => x.id === id) : { name: '', unit: '', up: true };
  openModal({
    title: id ? 'Messwert bearbeiten' : 'Neuer Messwert', danger: id ? 'Löschen' : null,
    onDanger: () => { S.metrics = S.metrics.filter(x => x.id !== id); S.measures = S.measures.filter(x => x.metricId !== id); save(); render(); },
    body: `<div class="form-grid"><div class="full"><label class="f">Name</label><input type="text" name="name" value="${esc(m.name)}" required autofocus placeholder="z. B. Liegestütze"></div>
      <div><label class="f">Einheit</label><input type="text" name="unit" value="${esc(m.unit)}" placeholder="kg, cm, Wdh, s"></div>
      <div><label class="f">Besser ist…</label><select name="up"><option value="1" ${m.up ? 'selected' : ''}>höher</option><option value="0" ${m.up ? '' : 'selected'}>niedriger</option></select></div></div>`,
    onOk: f => { const name = f.name.value.trim(); if (!name) return false; const v = { name, unit: f.unit.value.trim(), up: f.up.value === '1', u: Date.now() }; if (id) Object.assign(m, v); else S.metrics.push({ id: 'mt-' + uid(), ...v }); save(); render(); }
  });
}

/* =====================  KALENDER  ===================== */
let calMonth = (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })(), calSel = today();
VIEWS.calendar = {
  title: () => '📅 历法 Kalender',
  sub: () => 'Termine, Lernplan, Deadlines und Training an einem Ort',
  render() {
    const { y, m } = calMonth, first = new Date(y, m, 1), startOff = dow(first), days = new Date(y, m + 1, 0).getDate(), t = today();
    let cells = '';
    for (let i = 0; i < startOff; i++) {
      const k = dkey(new Date(y, m, 1 - startOff + i)); cells += calCell(k, true, t);
    }
    for (let d = 1; d <= days; d++) cells += calCell(dkey(new Date(y, m, d)), false, t);
    const total = startOff + days, rest = (7 - total % 7) % 7;
    for (let i = 1; i <= rest; i++) cells += calCell(dkey(new Date(y, m + 1, i)), true, t);
    const evs = eventsOn(calSel);
    return `${suggCard('week')}<div class="card">
      <div class="row between wrap"><div class="row"><button class="icon-btn" data-act="cal-nav" data-d="-1" aria-label="Vorheriger Monat">‹</button><h3 style="font-size:17px;min-width:150px;text-align:center">${MONTHS[m]} ${y}</h3><button class="icon-btn" data-act="cal-nav" data-d="1" aria-label="Nächster Monat">›</button><button class="btn btn-ghost btn-sm" data-act="cal-today">Heute</button></div>
        <button class="btn btn-jade" data-act="event-new" data-date="${calSel}">+ Termin</button></div>
      <div class="cal mt">${DAYS.map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div></div>
    <div class="card"><div class="row between"><h3>${fmtDate(calSel)}</h3><span class="chip c-gray">${evs.length} Einträge</span></div>
      <div class="stack mt">${evs.length ? evs.map(a => `<div class="item ${a.done ? 'done' : ''}"><span class="bar-side" style="background:${a.color}"></span><span class="timeline-time">${a.start ? esc(a.start) : 'ganztägig'}</span><span class="t">${esc(a.title)}${a.repeat === 'weekly' ? ' <span class="chip c-gray">wöchentlich</span>' : ''}</span>${a.kind === 'plan' && a.ptype !== 'exam' ? `<input type="checkbox" ${a.done ? 'checked' : ''} data-change="plan-toggle" data-mod="${a.modId}" data-id="${a.id}">` : ''}${a.kind === 'event' && a.type === 'work' && a.start && a.end ? workActions(a, calSel) : ''}${a.kind === 'event' ? `<button class="btn btn-ghost btn-sm" data-act="event-edit" data-id="${a.id}">✎</button>` : ''}</div>`).join('') : '<div class="empty">Keine Einträge an diesem Tag.</div>'}</div></div>
    <div class="card flat row between wrap"><div><b class="sm">Mit dem Handy-Kalender austauschen</b><p class="xs muted">Export als .ics (Termine, Lernplan, Deadlines) oder Import deiner Uni-Termine.</p></div>
      <div class="row"><button class="btn btn-ghost btn-sm" data-act="ics-export">⬇ .ics Export</button><button class="btn btn-ghost btn-sm" data-act="ics-import">⬆ .ics Import</button></div></div>`;
  }
};
function calCell(k, out, t) {
  const all = eventsOn(k);
  const shown = all.slice(0, 3);
  return `<button class="day ${out ? 'out' : ''} ${k === t ? 'today' : ''} ${k === calSel ? 'sel' : ''}" data-act="cal-sel" data-date="${k}"><span class="n">${parseD(k).getDate()}</span>
    ${shown.map(e => `<span class="ev" style="background:${e.color}">${esc(e.title.replace(/^Deadline: /, '⏰ '))}</span>`).join('')}${all.length > 3 ? `<span class="xs faint">+${all.length - 3}</span>` : ''}
    <span class="dots">${all.slice(0, 5).map(e => `<i style="background:${e.color}"></i>`).join('')}</span></button>`;
}
A['cal-nav'] = d => { let { y, m } = calMonth; m += +d.d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } calMonth = { y, m }; render(); };
A['cal-today'] = () => { const n = new Date(); calMonth = { y: n.getFullYear(), m: n.getMonth() }; calSel = today(); render(); };
A['cal-sel'] = d => { calSel = d.date; render(); };
A['event-new'] = d => openEventForm(null, d.date);
A['event-edit'] = d => openEventForm(d.id);
function openEventForm(id, date, presetType) {
  const isW = presetType === 'work', isL = !isW && (!presetType || presetType === 'lecture'), sem = S.settings.semester || {}, e = id ? S.events.find(x => x.id === id) : { title: isW ? 'Arbeit' : '', type: presetType || 'lecture', date: date || today(), start: isW ? '08:00' : '08:00', end: isW ? '16:00' : '09:30', repeat: isL && sem.to ? 'weekly' : 'none', until: isL && sem.to ? sem.to : '', breakMin: isW ? 30 : 0 };
  if (!e) return;
  openModal({
    title: id ? 'Termin bearbeiten' : 'Neuer Termin', danger: id ? 'Löschen' : null,
    onDanger: () => { S.events = S.events.filter(x => x.id !== id); save(); render(); },
    body: `<div class="form-grid"><div class="full"><label class="f">Titel</label><input type="text" name="title" value="${esc(e.title)}" required autofocus placeholder="z. B. Vorlesung Mathe"></div>
      <div><label class="f">Art</label><select name="type">${[['lecture', '🎓 Vorlesung'], ['work', '💼 Arbeit'], ['study', '📖 Lernblock'], ['wushu', '🥋 Training'], ['other', '📌 Sonstiges']].map(([k, l]) => `<option value="${k}" ${e.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="f">Datum</label><input type="date" name="date" value="${esc(e.date)}" required></div>
      <div><label class="f">Beginn</label><input type="time" name="start" value="${esc(e.start || '')}"></div>
      <div><label class="f">Ende</label><input type="time" name="end" value="${esc(e.end || '')}"></div>
      <div><label class="f">Wiederholung</label><select name="repeat"><option value="none" ${e.repeat !== 'weekly' ? 'selected' : ''}>einmalig</option><option value="weekly" ${e.repeat === 'weekly' ? 'selected' : ''}>wöchentlich</option></select></div>
      <div><label class="f">Wiederholen bis (optional)</label><input type="date" name="until" value="${esc(e.until || '')}"></div>
      <div><label class="f">Pause (Min, bei Arbeit)</label><input type="number" name="brk" value="${e.breakMin || 0}" min="0" max="480"></div>
      <div><label class="f">Modul (optional)</label><select name="mod">${modOptions(e.moduleId)}</select></div></div>`,
    onOk: f => {
      const title = f.title.value.trim(); if (!title || !f.date.value) return false;
      const v = { title, type: f.type.value, date: f.date.value, start: f.start.value, end: f.end.value, repeat: f.repeat.value, until: f.until.value, moduleId: f.mod.value || null, breakMin: +f.brk.value || 0, u: Date.now() };
      if (id) Object.assign(e, v); else S.events.push({ id: uid(), ...v });
      calSel = v.date; save(); render();
      if (typeof conflictsOn === 'function') { const cf = conflictsOn(v.date); if (cf.length) setTimeout(() => toast('⚠️ ' + cf[0].replace(/&amp;/g, '&'), 6000), 300); }
    }
  });
}
A['ics-export'] = () => { downloadFile('sakura-jade-kalender.ics', 'text/calendar', buildICS()); toast('Kalenderdatei gespeichert – im Handy-Kalender öffnen/importieren.'); };
A['ics-import'] = () => pickFile('.ics,text/calendar', txt => {
  const evs = parseICS(txt); if (!evs.length) { toast('Keine Termine in der Datei gefunden.'); return; }
  S.events.push(...evs); save(); render(); toast(`${evs.length} Termine importiert 📅`);
});
function pickFile(accept, cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.style.display = 'none'; document.body.appendChild(inp);
  inp.onchange = () => { const f = inp.files[0]; if (f) { const r = new FileReader(); r.onload = () => cb(String(r.result), f); r.readAsText(f); } inp.remove(); };
  inp.click();
}

/* =====================  ERFOLGE (Habits & Meilensteine)  ===================== */
VIEWS.goals = {
  title: () => '🌸 Erfolge 成就',
  sub: () => 'Habit-Grid, Meilensteine und kleine Siege',
  render() {
    const t = today(), ms = S.milestones, open = ms.filter(m => !m.done), done = ms.filter(m => m.done);
    return `<div class="card hero accent-pink">
        <div class="row between wrap"><h3 class="cn">🌸 樱花 Habit-Tracker</h3><div class="row"><span class="chip c-jade">${streak()} Tage Streak 🔥</span><span class="chip c-gold">Lernziel ${S.settings.studyGoalMin} Min</span></div></div>
        <p class="xs muted" style="margin:4px 0 12px">Jedes Quadrat ist ein Tag (26 Wochen). Je mehr Gewohnheiten du schaffst, desto kräftiger das Rosa. Tippe auf ein Quadrat für Details.</p>
        ${habitHeat(26)}
        <div class="row wrap xs muted mt">Weniger <span class="heat" style="display:inline-grid;grid-auto-flow:column;grid-template-rows:none;gap:3px"><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i></span> Mehr</div></div>
      ${sealShelf()}
      <div class="grid g2" style="align-items:start">
        <div class="card"><h3>Heutige Gewohnheiten</h3><div class="stack mt">${S.habits.map(h => {
          const ok = habitDone(t, h);
          return `<div class="item ${ok ? 'done' : ''}">${h.auto ? `<span style="width:17px;text-align:center">${ok ? '✓' : '○'}</span>` : `<input type="checkbox" ${ok ? 'checked' : ''} data-change="habit-toggle" data-id="${h.id}">`}<span class="t">${esc(h.name)}${h.auto ? ` <span class="xs faint">(automatisch: ${autoInfo(h, t)})</span>` : ''}</span>${!['h-study', 'h-train'].includes(h.id) ? `<button class="btn btn-danger btn-sm" data-act="habit-del" data-id="${h.id}" aria-label="Löschen">✕</button>` : ''}</div>`;
        }).join('')}</div>
          <div class="row mt"><input type="text" id="new-habit" placeholder="Neue Gewohnheit, z. B. 10 Min Dehnen" style="flex:1"><button class="btn btn-jade" data-act="habit-add">+</button></div></div>
        <div class="card"><div class="row between"><h3>🏆 Meilensteine</h3><span class="chip c-gray">${done.length}/${ms.length}</span></div>
          <div class="row mt"><input type="text" id="new-ms" placeholder="Neues Ziel, z. B. Alle Bio-Karteikarten durchgehen" style="flex:1"><button class="btn btn-pink" data-act="ms-add">+</button></div>
          <div class="stack mt">${open.map(m => `<div class="item"><input type="checkbox" data-change="ms-check" data-id="${m.id}" aria-label="Erledigt"><span class="t">${esc(m.title)}</span><button class="btn btn-danger btn-sm" data-act="ms-del" data-id="${m.id}" aria-label="Löschen">✕</button></div>`).join('') || (done.length ? '' : '<div class="empty">Setze dir ein erstes Ziel.</div>')}
          ${done.map(m => `<div class="item done"><input type="checkbox" checked data-change="ms-check" data-id="${m.id}"><span class="t">${esc(m.title)}</span><span class="chip c-jade">${m.doneAt ? fmtShort(dkey(new Date(m.doneAt))) : ''}</span></div>`).join('')}</div></div></div>`;
  }
};
A['habit-add'] = () => { const v = $('#new-habit').value.trim(); if (!v) return; S.habits.push({ id: 'h-' + uid(), name: v, auto: null, u: Date.now() }); save(); render(); };
A['habit-del'] = d => confirmBox('Gewohnheit entfernen? Bisherige Haken bleiben im Verlauf nicht erhalten.', 'Entfernen', () => { S.habits = S.habits.filter(h => h.id !== d.id); save(); render(); });
A['ms-add'] = () => { const v = $('#new-ms').value.trim(); if (!v) return; S.milestones.push({ id: uid(), title: v, done: false, u: Date.now() }); save(); render(); };
A['ms-del'] = d => { S.milestones = S.milestones.filter(m => m.id !== d.id); save(); render(); };
A['ms-check'] = (d, el) => {
  const m = S.milestones.find(x => x.id === d.id); if (!m) return; m.done = el.checked; m.u = Date.now(); if (m.done) m.doneAt = Date.now(); else delete m.doneAt;
  if (m.done) { const r = el.getBoundingClientRect(); petals(r.left + 8, r.top + 8, 22); toast('Meilenstein erreicht 🌸'); }
  save(); render();
  if (m.done) { const row = $$('#view .item.done').find(i => i.textContent.includes(m.title)); if (row) row.classList.add('check-pop'); }
};

/* =====================  DATENBANK (Notion-Stil)  ===================== */
let dbQuery = '', dbType = 'all', dbStatus = '', dbTag = '';
VIEWS.db = {
  title: () => '🗄️ 资料库 Datenbank',
  sub: () => 'Alle Aufgaben & Notizen mit eigenen Eigenschaften (Status, Tags)',
  render() {
    return `<div class="card"><div class="grid g4" style="gap:10px">
      <div><label class="f">Suche</label><input type="search" id="db-q" value="${esc(dbQuery)}" data-input="db-search" placeholder="Titel durchsuchen…"></div>
      <div><label class="f">Typ</label><select data-change="db-type"><option value="all">Alle</option><option value="task" ${dbType === 'task' ? 'selected' : ''}>Aufgaben</option><option value="note" ${dbType === 'note' ? 'selected' : ''}>Notizen</option></select></div>
      <div><label class="f">Status</label><select data-change="db-status"><option value="">Alle</option>${S.statuses.map(s => `<option ${dbStatus === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div><label class="f">Tag</label><select data-change="db-tag"><option value="">Alle</option>${S.tags.map(t => `<option value="${t.id}" ${dbTag === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div></div></div>
    <div class="card table-wrap" id="db-table">${dbTable()}</div>`;
  }
};
function dbRows() {
  const q = dbQuery.toLowerCase();
  const rows = [...S.tasks.map(t => ({ kind: 'task', id: t.id, title: t.title, status: t.status, tags: t.tags || [], mod: t.moduleId, due: t.due, area: AREAS[t.area], u: t.u || t.created || 0 })),
    ...S.notes.map(n => ({ kind: 'note', id: n.id, title: n.title, status: n.status, tags: n.tags || [], mod: n.moduleId, due: '', area: '📝 Notiz', u: n.u || n.created || 0 }))];
  return rows.filter(r => (dbType === 'all' || r.kind === dbType) && (!dbStatus || r.status === dbStatus) && (!dbTag || r.tags.includes(dbTag)) && (!q || r.title.toLowerCase().includes(q))).sort((a, b) => b.u - a.u);
}
function dbTable() {
  const rows = dbRows();
  return `<table><thead><tr><th>Titel</th><th>Typ / Bereich</th><th>Modul</th><th>Status</th><th>Tags</th><th>Frist</th><th></th></tr></thead><tbody>${rows.map(r => `<tr>
    <td><b style="cursor:pointer" data-act="${r.kind}-edit" data-id="${r.id}">${esc(r.title)}</b></td><td>${r.area || ''}</td><td>${modChip(r.mod) || '<span class="faint">–</span>'}</td>
    <td><select data-change="db-set-status" data-kind="${r.kind}" data-id="${r.id}" style="padding:4px 8px;font-size:12px;min-width:120px">${S.statuses.map(s => `<option ${r.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
    <td><div class="row wrap" style="gap:3px">${r.tags.map(tagChip).join('') || '<span class="faint">–</span>'}</div></td><td>${r.due ? fmtShort(r.due) : '<span class="faint">–</span>'}</td>
    <td><button class="btn btn-danger btn-sm" data-act="db-del" data-kind="${r.kind}" data-id="${r.id}" aria-label="Löschen">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Keine Einträge.</td></tr>'}</tbody></table>
    <p class="xs faint" style="padding:10px 12px">${rows.length} Einträge · Karteikarten findest du im Study Hub.</p>`;
}
A['db-search'] = (d, el) => { dbQuery = el.value; $('#db-table').innerHTML = dbTable(); };
A['db-type'] = (d, el) => { dbType = el.value; render(); };
A['db-status'] = (d, el) => { dbStatus = el.value; render(); };
A['db-tag'] = (d, el) => { dbTag = el.value; render(); };
A['db-set-status'] = (d, el) => { const o = (d.kind === 'task' ? S.tasks : S.notes).find(x => x.id === d.id); if (!o) return; if (d.kind === 'task') setTaskStatus(o, el.value); else { o.status = el.value; o.u = Date.now(); } save(); render(); };
A['db-del'] = d => confirmBox('Eintrag endgültig löschen?', 'Löschen', () => { if (d.kind === 'task') S.tasks = S.tasks.filter(x => x.id !== d.id); else S.notes = S.notes.filter(x => x.id !== d.id); save(); render(); });

/* =====================  EINSTELLUNGEN  ===================== */
let deferredInstall = null, storageInfo = '';
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const b = $('#btn-install'); if (b) b.hidden = false; });
window.addEventListener('appinstalled', () => { deferredInstall = null; const b = $('#btn-install'); if (b) b.hidden = true; toast('App installiert 🌸'); });
async function refreshStorageInfo() {
  try {
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    storageInfo = `${persisted ? '🔒 Dauerhaft geschützt' : '⚠️ Nicht als „dauerhaft“ markiert'}${est ? ` · belegt: ${(est.usage / 1024).toFixed(0)} KB` : ''}`;
    const el = $('#storage-state'); if (el) el.textContent = storageInfo;
    const l = $('#storage-line'); if (l) l.textContent = persisted ? 'Gerätespeicher gesichert' : '100 % offline';
  } catch (_) { }
}
VIEWS.settings = {
  title: () => '⚙️ 设置 Einstellungen',
  sub: () => 'Darstellung, Timer, Eigenschaften, Backup & Speicher',
  render() {
    const p = S.settings.pomo, th = S.settings.theme, lastB = S.settings.lastBackup;
    return `<div class="grid g2" style="align-items:start">
      <div class="stack">
        ${lookCard()}
        <div class="card"><h3>Lernen & Timer</h3><div class="form-grid mt">
          <div><label class="f">Tagesziel Lernzeit (Min)</label><input type="number" min="5" max="600" value="${S.settings.studyGoalMin}" data-change="set-num" data-k="studyGoalMin"></div>
          <div><label class="f">Fokus (Min)</label><input type="number" min="1" max="180" value="${p.focus}" data-change="set-pomo" data-k="focus"></div>
          <div><label class="f">Kurze Pause (Min)</label><input type="number" min="1" max="60" value="${p.short}" data-change="set-pomo" data-k="short"></div>
          <div><label class="f">Lange Pause (Min)</label><input type="number" min="1" max="90" value="${p.long}" data-change="set-pomo" data-k="long"></div>
          <div><label class="f">Lernfenster von</label><input type="time" value="${S.settings.studyFrom}" data-change="set-str" data-k="studyFrom"></div>
          <div><label class="f">Lernfenster bis</label><input type="time" value="${S.settings.studyTo}" data-change="set-str" data-k="studyTo"></div>
          <div><label class="f">Trainingszeit von</label><input type="time" value="${S.settings.trainFrom}" data-change="set-str" data-k="trainFrom"></div>
          <div><label class="f">Trainingszeit bis</label><input type="time" value="${S.settings.trainTo}" data-change="set-str" data-k="trainTo"></div>
          <div class="full"><label class="f">Länge eines Lernblocks (Min)</label><input type="number" min="15" max="120" value="${S.settings.blockMin}" data-change="set-num" data-k="blockMin"></div>
          <div class="full"><label class="row" style="cursor:pointer"><input type="checkbox" ${S.settings.sound ? 'checked' : ''} data-change="set-sound"> <span class="sm">Signalton bei Timer-Ende (im Zen-Modus immer stumm)</span></label></div>
          <div class="full"><button class="btn btn-ghost btn-sm" data-act="notif-perm">🔔 Systembenachrichtigungen erlauben</button></div></div></div>
        ${menuCard()}
        ${autoCard()}
        ${semCard()}
        <div class="card"><h3>Eigene Eigenschaften</h3>
          <label class="f mt">Status-Felder (letzter = „erledigt“)</label>
          <div class="stack">${S.statuses.map((s, i) => `<div class="row"><input type="text" value="${esc(s)}" data-change="status-rename" data-i="${i}" style="flex:1" aria-label="Status">${S.statuses.length > 2 ? `<button class="btn btn-danger btn-sm" data-act="status-del" data-i="${i}" aria-label="Löschen">✕</button>` : ''}</div>`).join('')}
            <div class="row"><input type="text" id="new-status" placeholder="Neuer Status, z. B. Wartet auf Antwort" style="flex:1"><button class="btn btn-jade" data-act="status-add">+</button></div></div>
          <label class="f mt2">Tags</label>
          <div class="row wrap">${S.tags.map(t => `<span class="chip c-${t.color}">${esc(t.name)} <button class="faint" data-act="tag-del" data-id="${t.id}" aria-label="Tag löschen" style="font-size:11px">✕</button></span>`).join('')}</div>
          <div class="row mt"><input type="text" id="new-tag" placeholder="Neuer Tag" style="flex:1"><select id="new-tag-color" style="width:auto">${COLORS.map(c => `<option value="${c}">${({ pink: 'Rosa', jade: 'Jade', gold: 'Gold', gray: 'Grau' })[c]}</option>`).join('')}</select><button class="btn btn-jade" data-act="tag-add">+</button></div></div>
      </div>
      <div class="stack">
        ${pinCard()}
        ${nativeCard()}
        ${flCard()}
        ${diagCard()}
        <div class="card"><h3>Backup & Gerätewechsel</h3>
          <p class="xs muted" style="margin:4px 0 10px">Alles liegt nur auf diesem Gerät. Sichere regelmäßig – und übertrage Daten per Datei (AirDrop, Nearby Share, USB, Mail) ohne Cloud.</p>
          <p class="xs ${lastB && Date.now() - lastB < 7 * 864e5 ? 'jade-t' : 'pink-t'} b">${lastB ? 'Letztes Backup: ' + fmtDate(dkey(new Date(lastB))) : 'Noch kein Backup erstellt.'}</p>
          <div class="row wrap mt"><button class="btn btn-jade" data-act="backup-export">💾 Backup (.json)</button><button class="btn btn-ghost" data-act="backup-share">📤 Teilen</button><button class="btn btn-ghost" data-act="backup-import">📥 Importieren</button></div>
          <div class="stack mt2" id="autobk"></div></div>
        <div class="card"><h3>Gerätespeicher</h3><p class="sm mt" id="storage-state">${esc(storageInfo) || 'Wird geprüft…'}</p>
          <p class="xs muted" style="margin:4px 0 10px">Daten liegen in der IndexedDB des Geräts (Browser/App-Speicher).</p>
          <div class="row wrap"><button class="btn btn-ghost btn-sm" data-act="persist">🔒 Dauerhaften Speicher anfordern</button>${deferredInstall ? '<button class="btn btn-pink btn-sm" data-act="install">⬇️ App installieren</button>' : ''}</div>
          <p class="xs muted mt">📱 <b>iPhone/iPad:</b> Safari → Teilen → „Zum Home-Bildschirm“. <b>Android/Chrome:</b> Menü → „App installieren“.</p></div>
        <div class="card"><h3>Gefahrenzone</h3><button class="btn btn-danger mt" data-act="reset-all">Alle Daten löschen</button></div>
      </div></div>`;
  },
  after() { refreshStorageInfo(); renderAutoBackups(); }
};
async function renderAutoBackups() {
  const box = $('#autobk'); if (!box) return;
  try {
    const list = (await KV.get('autobackups')) || [];
    box.innerHTML = list.length ? `<label class="f" style="margin:0">Automatische Tages-Sicherungen</label>` + list.map((b, i) => `<div class="item"><span class="t">${fmtDate(b.date)}</span><button class="btn btn-ghost btn-sm" data-act="autobk-restore" data-i="${i}">Wiederherstellen</button></div>`).join('') : '';
  } catch (_) { }
}
A['autobk-restore'] = async d => {
  const list = (await KV.get('autobackups')) || []; const b = list[+d.i]; if (!b) return;
  confirmBox(`Stand vom ${fmtDate(b.date)} wiederherstellen? Der aktuelle Stand wird ersetzt.`, 'Wiederherstellen', () => importBackupText(b.data, 'replace'));
};
A['theme-set'] = d => { setTheme(d.t); render(); };
A['set-num'] = (d, el) => { S.settings[d.k] = clamp(+el.value || 1, 1, 999); save(); };
A['set-pomo'] = (d, el) => { S.settings.pomo[d.k] = clamp(+el.value || 1, 1, 180); if (!S.timer.startedAt && S.timer.elapsed === 0) resetTimerState(S.timer.phase); save(); };
A['set-autoreplan'] = (d, el) => { S.settings.autoReplan = el.checked; save(); if (el.checked && autoReplan()) render(); };
A['set-sound'] = (d, el) => { S.settings.sound = el.checked; save(); };
A['notif-perm'] = async () => { try { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Benachrichtigungen erlaubt 🔔' : 'Nicht erlaubt.'); } catch (_) { toast('Auf diesem Gerät nicht verfügbar.'); } };
A['status-rename'] = (d, el) => {
  const i = +d.i, old = S.statuses[i], nv = el.value.trim();
  if (!nv || (S.statuses.includes(nv) && nv !== old)) { el.value = old; return; }
  S.statuses[i] = nv; S.tasks.forEach(t => { if (t.status === old) t.status = nv; }); S.notes.forEach(n => { if (n.status === old) n.status = nv; }); save();
};
A['status-add'] = () => { const v = $('#new-status').value.trim(); if (!v || S.statuses.includes(v)) return; S.statuses.splice(S.statuses.length - 1, 0, v); save(); render(); toast('Status hinzugefügt (vor „' + S.statuses[S.statuses.length - 1] + '“)'); };
A['status-del'] = d => {
  const i = +d.i, old = S.statuses[i]; const to = i === S.statuses.length - 1 ? S.statuses[i - 1] : S.statuses[0] === old ? S.statuses[1] : S.statuses[0];
  confirmBox(`„${old}“ entfernen? Einträge wandern nach „${to}“.`, 'Entfernen', () => { S.tasks.forEach(t => { if (t.status === old) t.status = to; }); S.notes.forEach(n => { if (n.status === old) n.status = to; }); S.statuses.splice(i, 1); save(); render(); });
};
A['tag-add'] = () => { const v = $('#new-tag').value.trim(); if (!v) return; S.tags.push({ id: 't-' + uid(), name: v, color: $('#new-tag-color').value, u: Date.now() }); save(); render(); };
A['tag-del'] = d => { S.tags = S.tags.filter(t => t.id !== d.id); S.tasks.forEach(t => { t.tags = (t.tags || []).filter(x => x !== d.id); }); S.notes.forEach(n => { n.tags = (n.tags || []).filter(x => x !== d.id); }); save(); render(); };
A['backup-export'] = () => exportBackup();
A['backup-share'] = () => shareBackup();
A['backup-import'] = () => pickFile('.json,application/json', txt => {
  openModal({
    title: 'Backup importieren', okText: 'Importieren', body: `<p class="sm">Wie soll die Datei eingespielt werden?</p><div class="stack mt">
      <label class="item" style="cursor:pointer"><input type="radio" name="mode" value="merge" checked><span class="t"><b>Zusammenführen</b><div class="xs muted">Neue Einträge hinzufügen, bei Konflikten gewinnt der jüngere Stand. Ideal für Handy ↔ Laptop.</div></span></label>
      <label class="item" style="cursor:pointer"><input type="radio" name="mode" value="replace"><span class="t"><b>Ersetzen</b><div class="xs muted">Alle aktuellen Daten werden durch das Backup ersetzt.</div></span></label></div>`,
    onOk: f => { importBackupText(txt, f.querySelector('input[name=mode]:checked').value); }
  });
});
A.persist = async () => { try { const ok = await navigator.storage.persist(); toast(ok ? 'Speicher ist jetzt dauerhaft geschützt 🔒' : 'Der Browser hat abgelehnt – installiere die App, dann klappt es meist.'); } catch (_) { toast('Nicht unterstützt.'); } refreshStorageInfo(); };
A.install = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); };
A['reset-all'] = () => confirmBox('Wirklich ALLE Daten auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden. Erstelle vorher ein Backup.', 'Alles löschen', async () => { S = defaults(); pinSave(null); await persist(); try { await KV.set('autobackups', []); } catch (_) { } applyTheme(); go('today', { top: true }); toast('Alle Daten gelöscht.'); });

/* =====================  ZEN-MODUS  ===================== */
function toggleZen(on) {
  zenOpen = on === undefined ? !zenOpen : on;
  $('#zen').classList.toggle('open', zenOpen); document.body.classList.toggle('zen-on', zenOpen);
  if (zenOpen) { renderZen(); if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  tickUI();
}
function renderZen() {
  if (!zenOpen) return;
  const next = S.tasks.filter(t => !isDoneStatus(t.status)).sort((a, b) => ((a.due || '9') > (b.due || '9') ? 1 : -1))[0];
  $('#zen').innerHTML = `<div class="xs faint cn">禅 · Zen</div><div class="breath"></div>
    <div class="zen-time mono" data-tm="time">--:--</div>
    <div class="sm muted">${S.timer.phase === 'focus' ? (next ? 'Fokus: ' + esc(next.title) : 'Nur du und die Aufgabe.') : 'Atme. Streck dich. Trink etwas.'}</div>
    <div class="row wrap" style="justify-content:center"><button class="btn ${S.timer.startedAt ? 'btn-gold' : 'btn-pink'}" data-act="t-toggle">${S.timer.startedAt ? '⏸ Pause' : '▶ Start'}</button>
      ${tElapsed() >= 1 ? '<button class="btn btn-jade" data-act="t-done">✓ Fertig</button>' : ''}<button class="btn btn-ghost" data-act="zen-close">Beenden</button></div>
    <select data-change="t-module" style="max-width:220px" aria-label="Modul">${modOptions(S.timer.moduleId, 'Ohne Modul')}</select>
    <div class="xs faint">Benachrichtigungen und Töne sind aus.</div>
    <svg width="0" height="0"><circle data-tm="prog"/></svg>`;
  tickUI();
}
A['zen-open'] = () => toggleZen(true);
A['zen-close'] = () => toggleZen(false);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && zenOpen) toggleZen(false); });

/* =====================  PHASEN (dynamisch, datumsabhängig)  ===================== */
function activeGoal() { const t = today(), g1 = S.settings.goal, g2 = S.settings.goal2; return diffDays(t, g1.date) >= 0 ? { g: g1, kind: 'g1' } : { g: g2, kind: 'g2' }; }
function goalPhases(kind) {
  const g1 = S.settings.goal, g2 = S.settings.goal2; let ranges = [], src;
  if (kind === 'g1') {
    const end = g1.date, ts = addKey(end, -9), p3s = addKey(ts, -28), p2s = addKey(p3s, -35), p1s = addKey(p2s, -35);
    ranges = [[p1s, addKey(p2s, -1)], [p2s, addKey(p3s, -1)], [p3s, addKey(ts, -1)], [ts, end]]; src = WUSHU_DATA.phases;
  } else {
    const start = addKey(g1.date, 1), end = g2.date, total = Math.max(8, diffDays(start, end) + 1);
    let tr = 14, sp = 42, pw = 21; if (total < 84) { tr = Math.round(total * .15); sp = Math.round(total * .35); pw = Math.round(total * .2); }
    const off = Math.max(0, total - tr - sp - pw); let cur = start;
    [tr, off, pw, sp].forEach(l => { if (l <= 0) { ranges.push(null); return; } ranges.push([cur, addKey(cur, l - 1)]); cur = addKey(cur, l); });
    src = WUSHU_DATA.nextGoal.phases;
  }
  return src.map((p, i) => ranges[i] ? { title: p.title, desc: p.desc, color: p.color, from: ranges[i][0], to: ranges[i][1] } : null).filter(Boolean);
}
function phaseState(p) { const t = today(); return t > p.to ? 'done' : t < p.from ? 'future' : 'current'; }
function phaseTimeline(phs) {
  const from = phs[0].from, to = phs[phs.length - 1].to, total = diffDays(from, to) + 1, t = today();
  const segs = phs.map(p => `<i style="flex:${diffDays(p.from, p.to) + 1};background:${p.color}" title="${esc(p.title)}"></i>`).join('');
  const inside = t >= from && t <= to, pos = clamp(100 * (diffDays(from, t) + .5) / total, 0, 100);
  return `<div class="tl-wrap"><div class="tl">${segs}</div>${inside ? `<div class="tl-mark" style="left:${pos}%"><span>heute</span></div>` : ''}</div>
    <div class="row between xs faint" style="margin-top:6px"><span>${fmtShort(from)}</span><span>${t < from ? 'Start in ' + diffDays(t, from) + ' Tagen' : t > to ? 'abgeschlossen' : 'Tag ' + (diffDays(from, t) + 1) + ' von ' + total}</span><span>${fmtShort(to)}</span></div>`;
}
function phaseCardsDyn(phs, kind) {
  const t = today();
  return phs.map(p => {
    const st = phaseState(p), len = diffDays(p.from, p.to) + 1, weeks = Math.max(1, Math.round(len / 7)); let meta, extra = '';
    if (st === 'current') {
      const day = diffDays(p.from, t) + 1, wk = Math.floor(diffDays(phs[0].from, t) / 7) + 1;
      meta = `Tag ${day} von ${len} · noch ${diffDays(t, p.to)} Tage`;
      extra = `<div class="mt">${bar(100 * day / len, 'pink')}</div><div class="row wrap mt"><span class="chip c-gold">Woche ${wk} im Zyklus</span>${kind === 'g1' && wk % 4 === 0 ? '<span class="chip c-jade">Deload-Woche: Volumen −40–50 %</span>' : ''}</div>`;
    } else meta = st === 'future' ? `startet in ${diffDays(t, p.from)} Tagen` : 'abgeschlossen';
    return `<div class="card phase ${st}" style="border-left:5px solid ${p.color}"><div class="row between"><div class="b" style="color:${p.color}">${st === 'done' ? '✓ ' : ''}${esc(p.title)}</div>${st === 'current' ? '<span class="chip c-gold">● jetzt</span>' : ''}</div>
      <div class="xs faint b" style="margin:2px 0 6px">${fmtShort(p.from)} – ${fmtShort(p.to)} · ${weeks} Wo. · ${meta}</div><div class="sm muted">${esc(p.desc)}</div>${extra}</div>`;
  }).join('');
}
function goalLine() {
  const { g, kind } = activeGoal(), d = diffDays(today(), g.date), cur = goalPhases(kind).find(p => phaseState(p) === 'current');
  const main = d > 0 ? `Noch ${d} Tage bis: ${esc(g.event)}` : d === 0 ? `Heute: ${esc(g.event)} 🎉` : `${esc(g.event)} liegt hinter dir.`;
  return `<div class="xs gold-t b">${main}</div>${cur ? `<div class="xs muted" style="margin-top:2px">Phase jetzt: ${esc(cur.title)}</div>` : ''}`;
}
function todayWorkoutCard() {
  const d = new Date(), tr = todayTraining(d), si = SESSION_BY_DOW[dow(d)], sid = si !== undefined ? si : 'skill', w = S.workout;
  return `<div class="card hero" style="border-left:6px solid ${tr.color}"><div class="row between wrap"><div><div class="xs b gold-t">Heute · ${DAYS_LONG[dow(d)]}</div><h3 style="font-size:17px">${esc(tr.title)}</h3><p class="xs muted">${esc(tr.note)}</p></div>
    <button class="btn btn-pink" data-act="wk-start" data-sid="${w ? w.sid : sid}">${w ? '↩ Workout fortsetzen' : '▶ Workout starten'}</button></div></div>`;
}
function zielView() {
  const t = today(), g1 = S.settings.goal, g2 = S.settings.goal2, d1 = diffDays(t, g1.date), d2 = diffDays(t, g2.date);
  const first = d1 >= 0, g = first ? g1 : g2, dl = first ? d1 : d2, kind = first ? 'g1' : 'g2';
  const phs = goalPhases(kind), cur = phs.find(p => phaseState(p) === 'current'), otherKind = first ? 'g2' : 'g1', otherPhs = goalPhases(otherKind);
  const count = dl > 0 ? `<div class="b" style="font-size:50px;line-height:1.05">${dl}</div><div class="xs gold-t b">Tage bis zum Wettkampf · ca. ${Math.ceil(dl / 7)} Wochen</div>`
    : dl === 0 ? '<div style="font-size:34px">🎉</div><div class="b gold-t">Heute ist es soweit – viel Erfolg!</div>'
    : '<div style="font-size:30px">🌸</div><div class="b jade-t">Kein offenes Ziel – lege unten einen neuen Wettkampf fest.</div>';
  const field = (gi, f, v, type, w) => `<input type="${type}" value="${esc(v)}" data-change="goal-set" data-g="${gi}" data-f="${f}" style="max-width:${w}px" aria-label="${f}">`;
  return `<div class="card hero accent-pink center"><div style="font-size:26px">🎯</div><h3 class="cn pink-t" style="font-size:19px">${esc(g.event)}</h3><p class="xs muted" style="margin-bottom:12px">Zieltermin: ${fmtDate(g.date)}</p>${count}
      ${!first ? `<div class="xs jade-t b" style="margin-top:12px">🌸 „${esc(g1.event)}“ ist geschafft (vor ${-d1} Tagen) – jetzt Kurs auf die nächste Saison.</div>` : ''}
      ${cur ? `<div class="note-box nb-pink" style="text-align:left;margin-top:14px"><b>Jetzt: ${esc(cur.title)}</b><div class="muted" style="margin-top:2px">${esc(cur.desc)}</div></div>` : ''}</div>
    ${todayWorkoutCard()}
    ${phs.length ? `<div class="card"><h3>Dein Weg zum Ziel</h3><p class="xs muted" style="margin:2px 0 8px">Die Phasen richten sich nach dem Zieldatum und aktualisieren sich jeden Tag.</p>${phaseTimeline(phs)}</div><div class="stack">${phaseCardsDyn(phs, kind)}</div>` : ''}
    ${kind === 'g2' ? `<div class="card" style="background:var(--jade-soft);border-color:var(--jade-border)"><h4 class="cn jade-t">🗓️ ${esc(WUSHU_DATA.nextGoal.heading)}</h4><ul class="xs muted" style="margin:8px 0 0 18px">${WUSHU_DATA.nextGoal.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${packCard()}
    <details class="card"><summary class="b" style="cursor:pointer">${first ? 'Danach: ' + esc(g2.event) + ' (' + fmtShort(g2.date) + ')' : 'Vergangene Saison: ' + esc(g1.event)}</summary>
      <div class="stack mt">${otherPhs.length ? phaseTimeline(otherPhs) + phaseCardsDyn(otherPhs, otherKind) : ''}</div></details>
    <details class="card"><summary class="b" style="cursor:pointer">Ziele bearbeiten</summary><div class="stack mt">
      <label class="f">Aktuelles Ziel</label><div class="row wrap">${field(1, 'event', g1.event, 'text', 260)}${field(1, 'date', g1.date, 'date', 170)}</div>
      <label class="f">Nächstes Ziel</label><div class="row wrap">${field(2, 'event', g2.event, 'text', 260)}${field(2, 'date', g2.date, 'date', 170)}</div></div></details>`;
}
A['goal-set'] = (d, el) => {
  const g = d.g === '2' ? S.settings.goal2 : S.settings.goal;
  if (d.f === 'event') g.event = el.value.trim() || g.event; else if (el.value) g.date = el.value;
  save(); render();
};

/* =====================  WORKOUT-MODUS (Sätze abhaken)  ===================== */
const SKILL_SESSION = {
  day: 'Wushu', icon: '🥋', color: '#C95169', title: 'Taolu / Taiji Skill-Training', sub: 'Technik, Sprung-in-Pose, Routine · 90–120 Min',
  target: 'Saubere Technik, stabile Landungen und eine wettkampfreife Routine.',
  blocks: [
    { kind: 'warmup', name: 'Warm-Up', time: '15 Min', sub: 'Gelenke, Hüfte und Sprunggelenke vorbereiten', items: [
      { n: 'Raise', detail: '5 Min Seilspringen oder lockeres Laufen plus Grundschritte.' },
      { n: 'Mobilize', detail: 'Beinschwünge in alle Richtungen, Hüftkreisen, Schulterkreisen, Ankle Rocks.' },
      { n: 'Activate', detail: 'Glute Bridges, Wadenheben, kurze Pogo Hops.' }] },
    { kind: 'main', name: 'Block A · Technik & Taolu', time: '~60–75 Min', sub: 'Qualität vor Menge – jede Wiederholung mit voller Aufmerksamkeit.', items: [
      { n: 'Grundstellungen (Ma Bu, Gong Bu, Xu Bu)', s: '3 Sätze', r: '2 Min', p: '45 Sek', d: 'Tiefe, saubere Stellungen im Wechsel halten, Rücken aufrecht, Knie über den Füßen.', wt: 'Stabile Stellungen sind die Basis jeder Form und bringen Wertungspunkte.', pe: 'Beine ausschütteln', pd: 'Kurz locker ausschütteln und atmen.' },
      { n: 'Tritte (Zhengti, Chaoti, Cebai)', s: '3 Sätze', r: '10 pro Bein', p: '45 Sek', d: 'Kontrolliert hoch, oben kurz halten, ohne Schwung ins Hohlkreuz.', wt: 'Kick-Höhe und Kontrolle in den Formen.', pe: 'Hüftkreisen', pd: 'Hüftgelenk zwischen den Sätzen geschmeidig halten.' },
      { n: 'Sprung-in-Pose (Wettkampf-Transfer)', s: '4 Sätze', r: '4 Wdh', p: '90 Sek', d: 'Explosiv abspringen, in stabiler Pose landen und 2–3 Sek einfrieren.', wt: 'Stabile Landung entscheidet über Wertungspunkte.', pe: 'Slow-Motion Pose-Halten', pd: 'Zielpose langsam einnehmen und 8 Sek halten.' },
      { n: 'Problemstellen der Taolu (Sektionen)', s: '4 Sätze', r: '1 Sektion', p: '60 Sek', d: 'Die schwächste Sektion isoliert, erst langsam, dann im Tempo.', wt: 'Schwachstellen gezielt schließen statt nur durchlaufen.', pe: 'Visualisierung', pd: 'Augen zu, Sektion mental durchgehen.' },
      { n: 'Komplette Taolu im Wettkampftempo', s: '3 Sätze', r: '1 Durchlauf', p: '2 Min', d: 'Volle Intensität, Ausdruck und Atmung wie im Wettkampf.', wt: 'Ausdauer und Wettkampfhärte.', pe: 'Gehen & Atmen', pd: 'Locker gehen, Puls senken.' }] },
    { kind: 'cooldown', name: 'Cool-Down', time: '10 Min', sub: '', items: [
      { n: 'Dehnen', detail: 'Hüfte, Hamstrings, Waden, Schultern – je 30–45 Sek.' },
      { n: 'Atmung', detail: '4–5 Min ruhige Bauchatmung, Parasympathikus aktivieren.' }] }
  ]
};
const getSession = sid => sid === 'skill' ? SKILL_SESSION : WUSHU_DATA.sessions[+sid];
const setCount = s => { const m = String(s).match(/(\d+)(?:\s*\+\s*(\d+))?/); return m ? (+m[1]) + (+(m[2] || 0)) : 1; };
const restSec = p => { const m = String(p).match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(Sek|Min)/i); if (!m) return 0; return +m[1] * (/min/i.test(m[2]) ? 60 : 1); };
const wkEl = w => w.elapsed + (w.startedAt ? (Date.now() - w.startedAt) / 1000 : 0);
function wkTotals(w) {
  let total = 0, done = 0;
  getSession(w.sid).blocks.forEach((b, bi) => { if (b.kind === 'main') b.items.forEach((e, ei) => { const n = exSets(e); total += n; done += Math.min(n, w.sets[bi + '-' + ei] || 0); }); });
  return { total, done };
}
A['wk-start'] = d => {
  if (S.workout) { go('workout', { top: true }); return; }
  S.workout = { sid: d.sid, start: Date.now(), elapsed: 0, startedAt: Date.now(), sets: {}, chk: {}, vals: {}, log: {}, restUntil: null, restTotal: 0, open: null };
  wake(true); save(); go('workout', { top: true });
};
A['wk-set'] = (d, el) => {
  const w = S.workout; if (!w) return; const n = +d.n, was = w.sets[d.k] || 0; w.sets[d.k] = was >= n ? n - 1 : n;
  const nowN = w.sets[d.k]; w.log = w.log || {}; w.vals = w.vals || {};
  if (nowN > was) { const [bi0, ei0] = d.k.split('-').map(Number), e0 = getSession(w.sid).blocks[bi0].items[ei0], v0 = w.vals[d.k] || {}, lv = S.exLast[e0.n] || {}; for (let i = was + 1; i <= nowN; i++) w.log[d.k + '-' + i] = { kg: numOf(v0.kg !== undefined ? v0.kg : lv.kg), reps: numOf(v0.reps !== undefined ? v0.reps : lv.reps) }; }
  else for (let i = nowN + 1; i <= was; i++) delete w.log[d.k + '-' + i];
  if (w.sets[d.k] > was) {
    const [bi, ei] = d.k.split('-').map(Number), e = getSession(w.sid).blocks[bi].items[ei], rs = restSec(e.p), tot = wkTotals(w);
    if (rs > 0 && tot.done < tot.total) { w.restUntil = Date.now() + rs * 1000; w.restTotal = rs; } else w.restUntil = null;
    const r = el.getBoundingClientRect(); petals(r.left + r.width / 2, r.top + r.height / 2, 6);
  }
  save(); render();
};
A['wk-chk'] = (d, el) => { const w = S.workout; if (!w) return; if (el.checked) w.chk[d.k] = true; else delete w.chk[d.k]; save(); render(); };
A['wk-info'] = d => { const w = S.workout; w.open = w.open === d.k ? null : d.k; render(); };
A['wk-rest-add'] = () => { const w = S.workout; if (w && w.restUntil) { w.restUntil += 15000; w.restTotal += 15; save(); render(); } };
A['wk-rest-skip'] = () => { const w = S.workout; if (w) { w.restUntil = null; save(); render(); } };
A['wk-pause'] = () => { const w = S.workout; if (!w) return; if (w.startedAt) { w.elapsed = wkEl(w); w.startedAt = null; } else w.startedAt = Date.now(); save(); render(); };
A['wk-cancel'] = () => confirmBox('Workout verwerfen? Die abgehakten Sätze gehen verloren.', 'Verwerfen', () => { S.workout = null; wake(!!S.timer.startedAt); save(); go('wushu', { top: true }); });
A['wk-finish'] = () => {
  const w = S.workout; if (!w) return; const t = wkTotals(w), sec = Math.round(wkEl(w)), s = getSession(w.sid);
  let vol = 0; const lsets = [];
  Object.entries(w.log || {}).sort((a, b) => { const x = a[0].split('-').map(Number), y = b[0].split('-').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }).forEach(([x, r]) => {
    const p = x.split('-').map(Number), e = s.blocks[p[0]] && s.blocks[p[0]].items[p[1]]; if (!e) return;
    if (r.kg != null && r.reps != null) vol += r.kg * r.reps; lsets.push({ n: e.n, i: p[2], kg: r.kg, reps: r.reps });
    if (r.kg != null || r.reps != null) S.exLast[e.n] = { kg: r.kg, reps: r.reps, date: today() };
  });
  vol = Math.round(vol);
  S.workouts.push({ id: uid(), date: today(), sid: String(w.sid), title: s.title, sec, done: t.done, total: t.total, vol, lsets, ts: Date.now(), u: Date.now() });
  const l = S.habitLog[today()] || (S.habitLog[today()] = []); if (!l.includes('h-train')) l.push('h-train');
  S.workout = null; wake(!!S.timer.startedAt); save(); wushuTab = 'fort'; go('wushu', { top: true });
  petals(innerWidth / 2, innerHeight / 3, 34);
  openModal({ title: '💪 Workout geschafft!', okText: 'Weiter 🌸', body: `<div class="center"><div style="font-size:42px">🥋</div><h3 style="margin:6px 0">${esc(s.title)}</h3><div class="row" style="justify-content:center;gap:10px;margin-top:10px"><span class="chip c-jade">${t.done}/${t.total} Sätze</span><span class="chip c-gold">${fmtDur(sec)}</span>${vol ? `<span class="chip c-pink">${fmtNum(vol)} kg Volumen</span>` : ''}</div><p class="sm muted" style="margin-top:12px">Training für heute ist abgehakt. Gut gemacht!</p></div>` });
};
VIEWS.workout = {
  title: () => '🏋️ Workout', sub: () => S.workout ? getSession(S.workout.sid).title : 'Starte dein Training und hake Sätze ab',
  render() { return S.workout ? workoutActive() : workoutPicker(); }
};
function workoutPicker() {
  const d = new Date(), si = SESSION_BY_DOW[dow(d)], sid = si !== undefined ? si : 'skill';
  const opts = [...WUSHU_DATA.sessions.map((s, i) => ({ sid: String(i), s })), { sid: 'skill', s: SKILL_SESSION }];
  return `<div class="card hero"><h3>Welches Training startest du?</h3><p class="xs muted">Heute laut Plan: <b>${esc(todayTraining(d).title)}</b></p></div>
    <div class="grid g-auto">${opts.map(o => `<div class="card hover" style="border-left:5px solid ${o.s.color};${String(sid) === o.sid ? 'outline:2px solid var(--gold)' : ''}"><div class="row"><span style="font-size:26px">${o.s.icon}</span><div class="grow"><b>${esc(o.s.day)}</b><div class="xs muted">${esc(o.s.title)}</div></div></div><button class="btn btn-pink btn-sm mt" data-act="wk-start" data-sid="${o.sid}">▶ Starten</button></div>`).join('')}</div>`;
}
function workoutActive() {
  const w = S.workout, s = getSession(w.sid), tot = wkTotals(w), run = !!w.startedAt; let curKey = null;
  s.blocks.forEach((b, bi) => { if (b.kind === 'main') b.items.forEach((e, ei) => { if (!curKey && (w.sets[bi + '-' + ei] || 0) < exSets(e)) curKey = bi + '-' + ei; }); });
  const rest = w.restUntil ? `<div class="rest-box mt"><span>⏳ Pause</span><b class="mono" data-wk="rest" style="font-size:20px">${mmss(Math.max(0, Math.ceil((w.restUntil - Date.now()) / 1000)))}</b><div class="bar gold"><i data-wk="restbar" style="width:${clamp(100 * (w.restUntil - Date.now()) / 1000 / w.restTotal, 0, 100)}%;transition:none"></i></div><button class="btn btn-ghost btn-sm" data-act="wk-rest-add">+15 s</button><button class="btn btn-jade btn-sm" data-act="wk-rest-skip">Weiter</button></div>` : '';
  const blocks = s.blocks.map((b, bi) => {
    if (b.kind !== 'main') return `<div class="card"><div class="row between"><h4>${b.kind === 'warmup' ? '🔥' : '🧘'} ${esc(b.name)}</h4><span class="chip c-gray">${esc(b.time)}</span></div>
      <div class="stack mt">${b.items.map((it, ii) => { const k = bi + '-' + ii, ck = !!w.chk[k]; return `<label class="item ${ck ? 'done' : ''}" style="cursor:pointer"><input type="checkbox" ${ck ? 'checked' : ''} data-change="wk-chk" data-k="${k}"><span class="t"><b>${esc(it.n)}</b> <span class="muted">${esc(it.detail)}</span></span></label>`; }).join('')}</div></div>`;
    return `<div class="stack"><div class="row between"><h4 style="color:${s.color}">${esc(b.name)}</h4><span class="chip c-gray">${esc(b.time)}</span></div>${b.sub ? `<p class="xs muted">${esc(b.sub)}</p>` : ''}
      ${b.items.map((e, ei) => {
        const k = bi + '-' + ei, n = exSets(e), dn = Math.min(n, w.sets[k] || 0), open = w.open === k, isCur = k === curKey;
        return `<div class="card wk-ex ${dn >= n ? 'done' : ''} ${isCur ? 'current' : ''}"><div class="row between" style="align-items:flex-start"><div class="grow"><b>${esc(e.n)}</b><div class="row wrap" style="gap:5px;margin-top:5px"><span class="chip c-gold">${esc(e.r)}</span><span class="chip c-gray">⏱ ${esc(e.p)}</span></div></div><button class="btn btn-ghost btn-sm" data-act="wk-info" data-k="${k}" aria-label="Details">${open ? '▲' : 'ℹ︎'}</button></div>
          <div class="setdots">${Array.from({ length: n }, (_, i) => `<button class="setdot ${i < dn ? 'on' : ''} ${isCur && i === dn ? 'next' : ''}" data-act="wk-set" data-k="${k}" data-n="${i + 1}" aria-label="Satz ${i + 1}">${i < dn ? '✓' : i + 1}</button>`).join('')}</div>
          ${valsRow(w, k, e)}
          ${open ? `<div class="stack mt"><p class="sm">${esc(e.d)}</p><div class="note-box nb-pink"><b class="pink-t xs">🐉 Wushu-Übertragung</b><div style="margin-top:2px">${esc(e.wt)}</div></div>${e.pe ? `<div class="note-box nb-jade"><b class="jade-t xs">⚡ Pause: ${esc(e.pe)}</b><div class="muted" style="margin-top:2px">${esc(e.pd)}</div></div>` : ''}</div>` : ''}</div>`;
      }).join('')}</div>`;
  }).join('');
  return `<div class="card hero wk-bar accent-pink"><div class="row between wrap"><div><h3>${s.icon} ${esc(s.title)}</h3><div class="xs muted">${tot.done}/${tot.total} Sätze ${deloadOn() ? '<span class="chip c-jade">🍃 Deload −40 %</span>' : ''}</div></div><div class="mono b" style="font-size:30px;color:var(--jade-text)" data-wk="time">${fmtClock(wkEl(w))}</div></div>
      ${bar(tot.total ? 100 * tot.done / tot.total : 0, 'pink')}
      <div class="row wrap mt"><button class="btn ${run ? 'btn-gold' : 'btn-pink'} btn-sm" data-act="wk-pause">${run ? '⏸ Pause' : '▶ Weiter'}</button><button class="btn btn-jade btn-sm" data-act="wk-finish">✓ Workout beenden</button><button class="btn btn-danger btn-sm" data-act="wk-cancel">Verwerfen</button></div>${rest}</div>
    ${blocks}`;
}
function workoutLog() {
  const ws = [...S.workouts].sort((a, b) => b.ts - a.ts), month = ws.filter(w => w.date.slice(0, 7) === today().slice(0, 7)).length;
  return `<div class="card"><div class="row between wrap"><h3>🏋️ Workout-Log</h3><span class="chip c-pink">${ws.length} gesamt · ${month} diesen Monat</span></div><div class="stack mt">${ws.slice(0, 6).map(w => `<div class="item"><span class="xs muted" style="width:62px">${fmtShort(w.date)}</span><span class="t"><b>${esc(w.title)}</b> <span class="xs muted">${w.done}/${w.total} Sätze${w.vol ? ' · ' + fmtNum(w.vol) + ' kg Vol.' : ''}</span></span><span class="chip c-gray">${fmtDur(w.sec)}</span></div>`).join('') || '<div class="empty">Noch kein Workout abgeschlossen. Starte eins im Tab „Woche“.</div>'}</div></div>`;
}

/* =====================  SIEGEL & STREAKS  ===================== */
const sealChars = cn => [...cn].map(ch => `<i style="font-style:normal">${ch}</i>`).join('');
const STREAK_STEPS = [7, 14, 30, 60, 100, 365];
const totalSec = () => S.sessions.reduce((a, s) => a + s.sec, 0);
const ACH = [
  ...[[7, '七日', 'pink'], [14, '两周', 'jade'], [30, '一月', 'gold'], [60, '两月', 'red'], [100, '百日', 'pink'], [365, '一年', 'gold']].map(([n, cn, tier]) => ({ id: 'st' + n, cn, tier, name: `${n} Tage Streak`, desc: `${n} Tage in Folge aktiv`, msg: 'Du bleibst dran – so entsteht Meisterschaft. 加油!', val: () => streak(), goal: n })),
  ...[[10, '初学', 'jade'], [50, '勤学', 'gold'], [100, '精进', 'red']].map(([h, cn, tier]) => ({ id: 'h' + h, cn, tier, name: `${h} Stunden gelernt`, desc: `${h} Stunden Lernzeit insgesamt`, msg: 'Stunde für Stunde wächst dein Wissen.', val: () => totalSec() / 3600, goal: h })),
  ...[[1, '初练', 'pink', 'Erstes Workout'], [10, '习武', 'jade', '10 Workouts'], [50, '武者', 'gold', '50 Workouts']].map(([n, cn, tier, name]) => ({ id: 'w' + n, cn, tier, name, desc: `${n} Workout${n > 1 ? 's' : ''} abgeschlossen`, msg: 'Der Weg entsteht beim Gehen – Satz für Satz.', val: () => S.workouts.length, goal: n })),
  { id: 'p25', cn: '专注', tier: 'jade', name: '25 Fokus-Sessions', desc: '25 Pomodoros abgeschlossen', msg: 'Tiefe Konzentration ist eine Superkraft.', val: () => S.sessions.filter(s => s.pomo).length, goal: 25 },
  { id: 'mod', cn: '圆满', tier: 'red', name: 'Modul abgeschlossen', desc: 'Alle Kapitel eines Moduls erledigt', msg: 'Ein ganzes Modul gemeistert – stark!', val: () => S.modules.filter(m => m.chapters && modProgress(m).pct === 100).length, goal: 1 },
  { id: 'pb', cn: '突破', tier: 'gold', name: 'Persönliche Bestleistung', desc: 'Einen Messwert verbessert', msg: 'Neuer Bestwert – die Arbeit zahlt sich aus.', val: () => S.metrics.filter(m => { const es = measOf(m.id); if (es.length < 2) return false; const v = es.map(e => e.value), best = m.up ? Math.max(...v) : Math.min(...v); return v[v.length - 1] === best && v[v.length - 1] !== v[0]; }).length, goal: 1 }
];
function checkAchievements() {
  if (!S || zenOpen) return;
  const got = ACH.filter(a => !S.ach[a.id] && a.val() >= a.goal);
  if (!got.length) return;
  got.forEach(a => { S.ach[a.id] = today(); }); save(); celebrate(got);
}
function celebrate(list) {
  if (!autoOn('cele')) { toast('🏅 ' + list[0].name + (list.length > 1 ? ` (+${list.length - 1})` : ''), 4000); return; }
  const top = list[0], old = $('#cele'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'celebrate'; el.id = 'cele';
  el.innerHTML = `<div class="cele-card"><div class="seal-badge big tier-${top.tier}"><span>${sealChars(top.cn)}</span></div><h2>${esc(top.name)}!</h2><p class="sm muted">${esc(top.msg)}</p>
    ${list.length > 1 ? `<div class="row wrap" style="justify-content:center;margin-top:12px">${list.slice(1).map(a => `<span class="chip c-gold">+ ${esc(a.name)}</span>`).join('')}</div>` : ''}<button class="btn btn-gold mt2" data-act="cele-close">Weiter 🌸</button></div>`;
  document.body.appendChild(el);
  petals(innerWidth / 2, innerHeight / 2 - 40, 46); setTimeout(() => petals(innerWidth / 2, innerHeight / 2, 30), 350);
}
A['cele-close'] = () => { const e = $('#cele'); if (e) e.remove(); };
function streakBar() {
  const s = streak(), next = STREAK_STEPS.find(n => n > s), prev = [0, ...STREAK_STEPS].filter(n => n <= s).pop();
  const warn = s > 0 && !dayLevel(today()) ? '<div class="xs pink-t b" style="margin-top:4px">⚠️ Heute noch aktiv werden, um den Streak zu halten.</div>' : '';
  if (!next) return `<div class="xs gold-t b" style="margin-top:10px">🔥 ${s} Tage – alle Streak-Siegel gesammelt 👑</div>${warn}`;
  const a = ACH.find(x => x.id === 'st' + next);
  return `<div class="row" style="gap:10px;margin-top:10px"><span class="b">🔥 ${s}</span><div class="grow">${bar(100 * (s - prev) / (next - prev), 'gold')}</div><span class="xs muted">noch ${next - s} T bis <b class="cn">${a.cn}</b></span></div>${warn}`;
}
function sealShelf() {
  return `<div class="card"><div class="row between"><h3 class="cn">🏯 Siegel-Sammlung</h3><span class="chip c-gold">${Object.keys(S.ach).length}/${ACH.length}</span></div>
    <div class="seal-grid mt">${ACH.map(a => { const got = S.ach[a.id], v = Math.min(a.goal, a.val()); return `<div><div class="seal-badge tier-${a.tier} ${got ? '' : 'locked'}"><span>${sealChars(a.cn)}</span></div><div class="xs b" style="margin-top:8px">${esc(a.name)}</div><div class="xs faint">${got ? fmtShort(got) : fmtNum(v) + '/' + a.goal}</div></div>`; }).join('')}</div></div>`;
}

/* =====================  LERN-TEMPO (Soll/Ist)  ===================== */
function paceInfo(m) {
  if (!m.goalH || !m.exam) return null;
  const start = m.start || today(), total = Math.max(1, diffDays(start, m.exam)), el = clamp(diffDays(start, today()), 0, total);
  const exp = m.goalH * 3600 * el / total, act = secMod(m.id), rate = el >= 3 ? act / el : 0, need = Math.max(0, m.goalH * 3600 - act);
  let proj = null; if (need === 0) proj = 'done'; else if (rate > 0) proj = addKey(today(), Math.ceil(need / rate));
  return { exp, act, diff: act - exp, proj, rate };
}
const paceChip = p => Math.abs(p.diff) < 900 ? '<span class="chip c-jade">im Plan</span>' : p.diff > 0 ? `<span class="chip c-jade">+${fmtNum(p.diff / 3600)} h vor Plan</span>` : `<span class="chip c-pink">−${fmtNum(-p.diff / 3600)} h hinter Plan</span>`;
function projText(m, p) {
  if (!p || !p.proj) return 'Sobald du ein paar Tage Zeit erfasst, berechne ich dein Tempo.';
  if (p.proj === 'done') return 'Lernziel erreicht 🎉';
  const wk = fmtNum(p.rate * 7 / 3600);
  return p.proj <= m.exam ? `Mit deinem Tempo (Ø ${wk} h/Woche) erreichst du dein Lernziel am ${fmtShort(p.proj)} – rechtzeitig.` : `Mit deinem Tempo (Ø ${wk} h/Woche) wird das Lernziel erst am ${fmtShort(p.proj)} erreicht – nach der Klausur. Etwas mehr Gas!`;
}
function learnBlock(m) {
  const p = modProgress(m), pc = paceInfo(m), secs = secMod(m.id), goal = (m.goalH || 0) * 3600, w = goal ? 100 * secs / goal : 0, mk = pc && goal ? clamp(100 * pc.exp / goal, 0, 100) : null;
  return `<div class="row between xs" style="margin:10px 0 3px"><span>Kapitel ${p.done}/${p.total}</span><b>${p.pct} %</b></div>${bar(p.pct)}
    <div class="row between xs" style="margin:10px 0 3px"><span>Lernzeit ${fmtHours(secs)}${goal ? ' / ' + m.goalH + ' h' : ''}</span>${pc ? paceChip(pc) : ''}</div>
    <div class="bar gold"><i style="width:${clamp(w, 0, 100)}%"></i>${mk !== null ? `<span class="pace-mark" style="left:${mk}%" title="Soll bis heute"></span>` : ''}</div>
    ${pc ? `<p class="xs muted" style="margin-top:8px">${projText(m, pc)}</p>` : ''}`;
}

/* =====================  Blütenregen  ===================== */
function initPetals() {
  const el = $('#petals'); if (!el) return; el.innerHTML = '';
  if (!S.settings.petals || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i'), s = 8 + Math.random() * 8;
    p.style.cssText = `left:${Math.random() * 100}%;--s:${s}px;--d:${16 + Math.random() * 14}s;--dl:-${Math.random() * 30}s;--sw:${(Math.random() * 160 - 80)}px`;
    el.appendChild(p);
  }
}
A['set-petals'] = (d, el) => { S.settings.petals = el.checked; save(); initPetals(); };

/* =====================  SPRACHEN (Chinesisch · Polnisch)  ===================== */
const numOf = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? null : x; };
function ensureLangs() {
  if (S.langInit) return;
  [['Chinesisch', '#C83B3B', 20, 'HSK 1 · Pinyin, Töne & erste Zeichen', 'h-zh'], ['Polnisch', '#5B86B8', 15, 'Alltagssprache & Aussprache', 'h-pl']].forEach(([name, color, min, goalText, hid]) => {
    if (S.modules.some(m => m.name === name)) return;
    const m = { id: 'm-' + uid(), name, color, start: today(), kind: 'lang', exam: '', chapters: 1, buffer: 0, goalH: 0, dailyMin: min, goalText, plan: [], u: Date.now() };
    S.modules.push(m); S.habits.push({ id: hid, name: name + ' üben', auto: 'mod', modId: m.id, min });
  });
  S.langInit = true;
}
function syncLangHabit(m) {
  let h = S.habits.find(x => x.auto === 'mod' && x.modId === m.id);
  if (m.kind === 'lang' && m.dailyMin > 0) { if (!h) { h = { id: 'h-' + uid(), auto: 'mod', modId: m.id }; S.habits.push(h); } h.name = m.name + ' üben'; h.min = m.dailyMin; }
  else if (h) S.habits = S.habits.filter(x => x !== h);
}
function modStreak(m) {
  if (!m.dailyMin) return 0; let n = 0, k = today(); const ok = d => secOn(d, m.id) / 60 >= m.dailyMin;
  if (!ok(k)) k = addKey(k, -1); while (ok(k) && n < 3650) { n++; k = addKey(k, -1); } return n;
}
function autoInfo(h, t) {
  if (h.auto === 'mod') { const m = modById(h.modId); return `${Math.round(secOn(t, h.modId) / 60)}/${m ? m.dailyMin || h.min : h.min} Min`; }
  return `${Math.round(secOn(t) / 60)}/${S.settings.studyGoalMin} Min`;
}
function langBlock(m) {
  const t = today(), goal = m.dailyMin || 15, min = Math.round(secOn(t, m.id) / 60); let wk = 0; for (let i = 0; i < 7; i++) wk += secOn(addKey(t, -i), m.id);
  return `<div class="row between xs" style="margin:10px 0 3px"><span>Heute</span><b>${min}/${goal} Min</b></div>${bar(100 * min / goal, 'pink')}
    <div class="row wrap mt" style="gap:6px"><span class="chip c-jade">🔥 ${modStreak(m)} Tage</span><span class="chip c-gold">7 Tage: ${fmtHours(wk)}</span><span class="chip c-gray">gesamt ${fmtHours(secMod(m.id))}</span></div>`;
}
function langCard() {
  const langs = S.modules.filter(m => m.kind === 'lang'), t = today();
  return `<div class="card"><div class="row between"><h3>🈶 Sprachen</h3><button class="link" data-act="uni-tab" data-tab="modules">verwalten →</button></div><div class="stack mt">${langs.length ? langs.map(m => {
    const min = Math.round(secOn(t, m.id) / 60), goal = m.dailyMin || 15, st = modStreak(m);
    return `<div class="item"><span class="bar-side" style="background:${m.color}"></span><div class="t"><b>${esc(m.name)}</b> <span class="xs muted">${esc(m.goalText || '')}</span><div style="margin-top:5px">${bar(100 * min / goal, 'pink')}</div><div class="xs muted" style="margin-top:3px">${min}/${goal} Min heute${st ? ' · 🔥 ' + st + ' Tage' : ''}</div></div><button class="btn btn-pink btn-sm" data-act="mod-focus" data-id="${m.id}" aria-label="Fokus starten">▶</button></div>`;
  }).join('') : '<div class="empty">Lege im Study Hub eine Sprache an.</div>'}</div></div>`;
}

/* =====================  WUSHU-KURS (Di · Do · Sa) abhaken  ===================== */
A.noop = () => { };
const tabFor = si => si === 'skill' ? 'skill' : 's' + si;
const courseDay = k => [1, 3, 5].includes(dow(parseD(k)));
A['course-toggle'] = (d, el) => {
  const k = d.date; if (el.checked) S.course[k] = true; else delete S.course[k];
  const l = S.habitLog[k] || (S.habitLog[k] = []), i = l.indexOf('h-train');
  if (el.checked) { if (i < 0) l.push('h-train'); const r = el.getBoundingClientRect(); petals(r.left + 8, r.top + 8, 14); }
  else if (i >= 0 && !S.workouts.some(w => w.date === k)) l.splice(i, 1);
  save(); render();
};
const courseChip = k => `<label class="chip ${S.course[k] ? 'c-jade' : 'c-gray'}" style="cursor:pointer" data-act="noop"><input type="checkbox" ${S.course[k] ? 'checked' : ''} data-change="course-toggle" data-date="${k}"> Kurs besucht</label>`;

/* =====================  LERNBLOCK-VORSCHLÄGE (mit Bestätigung)  ===================== */
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
function busyOn(date) {
  const iv = [], evs = eventsOn(date), s = S.settings;
  evs.forEach(e => { if (e.kind === 'event' && e.start) { const a = toMin(e.start); iv.push([a, e.end ? toMin(e.end) : a + 60]); } });
  if (!evs.some(e => e.kind === 'event' && e.type === 'wushu')) iv.push([toMin(s.trainFrom), toMin(s.trainTo)]);
  return iv.sort((a, b) => a[0] - b[0]);
}
function freeSlots(date) {
  const s = S.settings; let from = toMin(s.studyFrom), to = toMin(s.studyTo);
  if (date === today()) { const n = new Date(); from = Math.max(from, Math.ceil((n.getHours() * 60 + n.getMinutes() + 5) / 15) * 15); }
  const out = []; let cur = from;
  busyOn(date).forEach(([a, b]) => { if (b <= cur) return; if (a > cur) out.push([cur, Math.min(a, to)]); cur = Math.max(cur, b); });
  if (cur < to) out.push([cur, to]);
  return out.filter(([a, b]) => b - a >= 15);
}
const evMin = e => Math.max(0, toMin(e.end || e.start) - toMin(e.start));
function suggestions(days = 7) {
  const t = today(), bm = S.settings.blockMin || 50, out = [];
  const exams = S.modules.filter(m => m.exam && m.exam >= t && m.kind !== 'lang'), langs = S.modules.filter(m => m.kind === 'lang' && m.dailyMin > 0);
  const score = m => { const pc = paceInfo(m); return 10 / Math.max(1, diffDays(t, m.exam)) + (pc ? Math.max(0, -pc.diff / 3600) * .5 : 0) + overdueCount(m); };
  const ranked = [...exams].sort((a, b) => score(b) - score(a)), examIds = new Set(exams.map(m => m.id));
  for (let i = 0; i < days; i++) {
    const date = addKey(t, i), slots = freeSlots(date).map(x => [...x]), evs = eventsOn(date).filter(e => e.kind === 'event' && e.modId), blocks = [];
    langs.forEach(m => {
      const need = m.dailyMin - secOn(date, m.id) / 60 - evs.filter(e => e.modId === m.id).reduce((a, e) => a + evMin(e), 0);
      if (need >= 10) blocks.push({ mod: m, len: Math.round(need / 5) * 5, kind: 'lang', why: `${m.name} · Tagesziel ${m.dailyMin} Min${modStreak(m) ? ' · Streak ' + modStreak(m) + ' Tage halten' : ''}` });
    });
    if (ranked.length) {
      const done = S.sessions.filter(s => s.date === date && examIds.has(s.moduleId)).reduce((a, s) => a + s.sec / 60, 0) + evs.filter(e => examIds.has(e.modId)).reduce((a, e) => a + evMin(e), 0);
      let rem = S.settings.studyGoalMin - done, k = 0;
      while (rem >= 20 && k < 3) {
        const m = ranked[k % Math.min(2, ranked.length)], len = Math.min(bm, Math.round(rem / 5) * 5), pc = paceInfo(m), ch = (m.plan || []).find(p => p.type === 'chapter' && !p.done && p.date <= date);
        blocks.push({ mod: m, len, kind: 'study', why: `${m.name} · ${ch ? ch.label + ' steht an · ' : ''}Klausur in ${diffDays(date, m.exam)} T${pc && pc.diff < -1800 ? ' · ' + fmtNum(-pc.diff / 3600) + ' h hinter Plan' : ''}` });
        rem -= len; k++;
      }
    }
    const cnt = {};
    blocks.forEach(b => {
      const sl = slots.find(x => { const l = Math.min(b.len, x[1] - Math.ceil(x[0] / 5) * 5); return l >= Math.max(15, b.len * .6); });
      if (!sl) return;
      const start = Math.ceil(sl[0] / 5) * 5, len = Math.min(b.len, sl[1] - start), end = start + len; sl[0] = end + 10;
      cnt[b.mod.id] = (cnt[b.mod.id] || 0) + 1; const key = `${date}|${b.mod.id}|${cnt[b.mod.id]}`;
      if (S.suggOff[key]) return;
      out.push({ key, date, start: fromMin(start), end: fromMin(end), mod: b.mod, kind: b.kind, why: b.why });
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
function addBlockEvent(s) { S.events.push({ id: uid(), title: `${s.kind === 'lang' ? 'Sprache' : 'Lernblock'}: ${s.mod.name}`, type: 'study', date: s.date, start: s.start, end: s.end, repeat: 'none', until: '', moduleId: s.mod.id, u: Date.now() }); }
A['sugg-ok'] = d => { const s = suggestions(7).find(x => x.key === d.key); if (!s) return; addBlockEvent(s); save(); render(); toast(`Eingetragen: ${s.mod.name} ${s.start}–${s.end} ✓`); };
A['sugg-no'] = d => { S.suggOff[d.key] = true; save(); render(); };
A['sugg-all'] = d => { const l = suggestions(d.scope === 'today' ? 1 : 7); l.forEach(addBlockEvent); save(); render(); toast(l.length ? `${l.length} Lernblöcke eingetragen ✓` : 'Nichts zu übernehmen.'); };
A['ev-focus'] = d => { S.timer.moduleId = d.mod; save(); go('focus', { top: true }); };
const suggItem = s => `<div class="item"><span class="bar-side" style="background:${s.mod.color}"></span><span class="timeline-time" style="width:84px">${s.start}–${s.end}</span><span class="t"><b>${esc(s.mod.name)}</b><div class="xs muted">${esc(s.why.replace(s.mod.name + " · ", ""))}</div></span><button class="btn btn-jade btn-sm" data-act="sugg-ok" data-key="${esc(s.key)}" title="Übernehmen">✓</button><button class="btn btn-danger btn-sm" data-act="sugg-no" data-key="${esc(s.key)}" title="Ablehnen">✕</button></div>`;
function suggCard(scope) {
  if (!autoOn('sugg')) return '';
  const list = suggestions(scope === 'today' ? 1 : 7), s = S.settings;
  const head = `<div class="row between wrap"><div><h3>💡 Lernblock-Vorschläge${scope === 'today' ? ' für heute' : ''}</h3><p class="xs muted">Freie Zeit zwischen ${s.studyFrom} und ${s.studyTo}, nach Klausurnähe und Lernrückstand priorisiert. Nichts wird ohne dein Okay eingetragen.</p></div>${list.length ? `<button class="btn btn-jade btn-sm" data-act="sugg-all" data-scope="${scope}">Alle übernehmen</button>` : ''}</div>`;
  if (!list.length) return `<div class="card hero">${head}<div class="empty">${scope === 'today' ? 'Für heute ist alles abgedeckt ✓' : 'Keine Vorschläge – Ziele erreicht oder keine freien Zeiten.'}</div></div>`;
  if (scope === 'today') return `<div class="card hero">${head}<div class="stack mt">${list.slice(0, 4).map(suggItem).join('')}</div>${list.length > 4 ? `<button class="link mt" data-act="go" data-view="calendar">+ ${list.length - 4} weitere im Kalender →</button>` : ''}</div>`;
  const byDay = {}; list.forEach(x => (byDay[x.date] = byDay[x.date] || []).push(x));
  return `<div class="card hero">${head}${Object.entries(byDay).map(([d, l]) => `<div class="xs b gold-t" style="margin:14px 0 6px">${fmtDate(d)}</div><div class="stack">${l.map(suggItem).join('')}</div>`).join('')}</div>`;
}
A['set-str'] = (d, el) => { if (el.value) { S.settings[d.k] = el.value; save(); } };

/* =====================  CHECK-IN & DELOAD-EMPFEHLUNG  ===================== */
const CHK = [['sleep', '😴 Schlaf', 'schlecht', 'sehr gut'], ['fatigue', '⚡ Erschöpfung', 'frisch', 'kaputt'], ['sore', '💪 Muskelkater', 'keiner', 'stark']];
const readiness = c => (c && c.sleep && c.fatigue && c.sore) ? (c.sleep + (6 - c.fatigue) + (6 - c.sore)) / 3 : null;
const deloadOn = () => !!S.deloadUntil && S.deloadUntil >= today();
const exSets = e => { const n = setCount(e.s); return deloadOn() ? Math.max(1, Math.round(n * .6)) : n; };
function deloadAdvice() {
  if (!autoOn('deload')) return null;
  const t = today(), tc = S.checkins[t], tr = readiness(tc); const last = [];
  for (let i = 0; i < 7; i++) { const c = S.checkins[addKey(t, -i)], r = readiness(c); if (r !== null) last.push({ c, r }); }
  if (last.length >= 3) {
    const avg = last.reduce((a, x) => a + x.r, 0) / last.length, fat = last.reduce((a, x) => a + x.c.fatigue, 0) / last.length;
    if (avg <= 2.7 || fat >= 3.8) return { level: 'deload', text: `Deine Check-ins der letzten ${last.length} Tage zeigen anhaltende Müdigkeit (Ø Bereitschaft ${fmtNum(avg)}/5). Empfehlung: eine Deload-Woche – Sätze −40 %, keine maximalen Sprünge.` };
  }
  if (tr !== null && tr <= 2.2) return { level: 'light', text: 'Heute ist deine Bereitschaft niedrig. Empfehlung: leicht trainieren (Technik, Mobility) oder Ruhetag statt harter Plyometrie.' };
  return null;
}
A['ck-set'] = d => { const c = S.checkins[today()] || (S.checkins[today()] = {}); c[d.f] = +d.v; save(); render(); };
A['ck-reset'] = () => { delete S.checkins[today()]; save(); render(); };
A['deload-start'] = () => { S.deloadUntil = addKey(today(), 6); save(); render(); toast('Deload-Woche gestartet 🍃 – Sätze im Workout −40 %'); };
A['deload-stop'] = () => { S.deloadUntil = ''; save(); render(); };
A['deload-skip'] = () => { S.deloadDismiss = today(); save(); render(); };
function checkinCard() {
  const t = today(), c = S.checkins[t] || {}, full = readiness(c) !== null, adv = deloadAdvice();
  const rows = CHK.map(([f, l, lo, hi]) => `<div><div class="row between xs"><b>${l}</b><span class="faint">1 = ${lo} · 5 = ${hi}</span></div><div class="seg" style="margin-top:4px">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${c[f] === v ? 'on' : ''}" data-act="ck-set" data-f="${f}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('');
  const r = readiness(c);
  const banner = deloadOn() ? `<div class="note-box nb-jade mt row between"><span>🍃 <b>Deload aktiv</b> bis ${fmtShort(S.deloadUntil)} – Sätze im Workout −40 %</span><button class="btn btn-ghost btn-sm" data-act="deload-stop">Beenden</button></div>`
    : adv && S.deloadDismiss !== t ? `<div class="note-box mt" style="background:var(--gold-soft);border-color:var(--gold)"><b class="gold-t">Empfehlung</b><div class="sm" style="margin:3px 0 8px">${esc(adv.text)}</div><div class="row wrap">${adv.level === 'deload' ? '<button class="btn btn-gold btn-sm" data-act="deload-start">Deload-Woche starten</button>' : ''}<button class="btn btn-ghost btn-sm" data-act="deload-skip">${adv.level === 'deload' ? 'Heute ignorieren' : 'Verstanden'}</button></div></div>` : '';
  return `<div class="card"><div class="row between"><h3>🩺 Tages-Check-in</h3>${full ? `<button class="link" data-act="ck-reset">ändern</button>` : '<span class="xs faint">10 Sekunden</span>'}</div>
    ${full ? `<div class="row between xs" style="margin:8px 0 3px"><span>Bereitschaft heute</span><b>${fmtNum(r)}/5</b></div>${bar(100 * (r - 1) / 4, r >= 3.5 ? '' : r >= 2.5 ? 'gold' : 'pink')}<div class="row wrap mt" style="gap:5px">${CHK.map(([f, l]) => `<span class="chip c-gray">${l.split(' ')[0]} ${c[f]}/5</span>`).join('')}</div>` : `<div class="stack mt">${rows}</div>`}${banner}</div>`;
}

/* =====================  WETTKAMPF-CHECKLISTE / PACKLISTE  ===================== */
const PACK = [
  ['reg', 'Organisation', 'Anmeldung / Meldung bestätigt', 21], ['zeit', 'Organisation', 'Startzeit, Ablauf und Aufruf prüfen', 14], ['reise', 'Organisation', 'Anreise und Unterkunft geplant', 14],
  ['routine', 'Training', 'Routine final festgelegt (Dauer, Schwierigkeit, Regelwerk)', 14], ['taper', 'Training', 'Taper: Volumen −40–50 %, Schärfe halten', 10], ['durch', 'Training', '3 komplette Durchläufe im Wettkampftempo', 7], ['vis', 'Training', 'Visualisierung täglich (10 Min)', 7],
  ['kleid', 'Packliste', 'Wettkampfkleidung gewaschen und komplett', 7], ['equip', 'Packliste', 'Waffen / Equipment geprüft', 7], ['ausweis', 'Packliste', 'Ausweis / Startpass / Unterlagen', 3], ['schuhe', 'Packliste', 'Wettkampfschuhe + Ersatz', 3],
  ['tape', 'Packliste', 'Tape, Bandagen, Kühlpad', 3], ['essen', 'Packliste', 'Snacks, Wasser, Elektrolyte', 3], ['handtuch', 'Packliste', 'Handtuch & Wechselkleidung', 3], ['handy', 'Packliste', 'Handy, Ladegerät, Kopfhörer', 3],
  ['schlaf', 'Letzte Tage', 'Früh schlafen (7–9 h)', 2], ['warm', 'Letzte Tage', 'Aufwärmplan für den Wettkampftag bereit', 1]
];
function packState() { const g = activeGoal().g, key = g.date + '|' + g.event; return S.packlist[key] || (S.packlist[key] = { done: {}, custom: [] }); }
function packItems() {
  const st = packState(); return [...PACK.map(([id, grp, t, due]) => ({ id, grp, t, due, done: !!st.done[id], custom: false })), ...st.custom.map(c => ({ id: c.id, grp: 'Eigene', t: c.text, due: 99, done: c.done, custom: true }))];
}
function packDashCard() {
  const dl = diffDays(today(), activeGoal().g.date); if (dl < 0 || dl > 14) return '';
  const items = packItems(), open = items.filter(i => !i.done && i.due >= dl), done = items.filter(i => i.done).length;
  if (!open.length) return '';
  return `<div class="card accent-gold"><div class="row between"><h3>🎒 Wettkampf-Checkliste</h3><span class="chip c-gold">${done}/${items.length} · noch ${dl} Tage</span></div><div class="stack mt">${open.slice(0, 5).map(i => `<label class="item" style="cursor:pointer"><input type="checkbox" data-change="pack-toggle" data-id="${i.id}"><span class="t">${esc(i.t)}</span></label>`).join('')}</div><button class="link mt" data-act="wushu-open" data-tab="ziel">Alle ${open.length} offenen ansehen →</button></div>`;
}
function packCard() {
  const { g } = activeGoal(), dl = diffDays(today(), g.date); if (dl < 0) return '';
  const items = packItems(), done = items.filter(i => i.done).length, groups = [...new Set(items.map(i => i.grp))];
  return `<details class="card" ${dl <= 28 ? 'open' : ''}><summary class="b" style="cursor:pointer">🎒 Wettkampf-Checkliste · ${done}/${items.length} erledigt</summary><div class="mt">${bar(100 * done / items.length, 'gold')}</div>
    ${groups.map(gr => `<div class="xs b gold-t" style="margin:14px 0 6px">${gr}</div><div class="stack">${items.filter(i => i.grp === gr).map(i => {
      const due = i.due !== 99 && dl <= i.due;
      return `<div class="item ${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-change="pack-toggle" data-id="${i.id}"><span class="t">${esc(i.t)}</span>${i.done ? '' : i.due === 99 ? '' : due ? '<span class="chip c-pink">jetzt fällig</span>' : `<span class="chip c-gray">ab in ${dl - i.due} T</span>`}${i.custom ? `<button class="btn btn-danger btn-sm" data-act="pack-del" data-id="${i.id}" aria-label="Löschen">✕</button>` : ''}</div>`;
    }).join('')}</div>`).join('')}
    <div class="row mt2"><input type="text" id="new-pack" placeholder="Eigener Punkt, z. B. Glücksbringer" style="flex:1"><button class="btn btn-jade" data-act="pack-add">+</button></div></details>`;
}
A['pack-toggle'] = (d, el) => {
  const st = packState(), c = st.custom.find(x => x.id === d.id);
  if (c) c.done = el.checked; else if (el.checked) st.done[d.id] = true; else delete st.done[d.id];
  if (el.checked) { const r = el.getBoundingClientRect(); petals(r.left + 8, r.top + 8, 8); }
  save(); render();
};
A['pack-add'] = () => { const v = $('#new-pack').value.trim(); if (!v) return; packState().custom.push({ id: 'pc-' + uid(), text: v, done: false }); save(); render(); };
A['pack-del'] = d => { const st = packState(); st.custom = st.custom.filter(x => x.id !== d.id); save(); render(); };

/* =====================  WORKOUT: Gewicht & Wiederholungen je Satz  ===================== */
A['wk-val'] = (d, el) => { const w = S.workout; if (!w) return; w.vals = w.vals || {}; (w.vals[d.k] || (w.vals[d.k] = {}))[d.f] = el.value; save(); };
function valsRow(w, k, e) {
  const v = (w.vals && w.vals[k]) || {}, lv = S.exLast[e.n];
  const logged = Object.entries(w.log || {}).filter(([x]) => x.startsWith(k + '-')).sort((a, b) => +a[0].split('-').pop() - +b[0].split('-').pop());
  const val = f => esc(v[f] !== undefined ? v[f] : lv && lv[f] != null ? fmtNum(lv[f]) : '');
  return `<div class="row wrap" style="margin-top:12px;gap:8px;align-items:flex-end"><div style="width:96px"><label class="f">Gewicht (kg)</label><input type="text" inputmode="decimal" value="${val('kg')}" data-input="wk-val" data-k="${k}" data-f="kg" placeholder="–"></div>
    <div style="width:80px"><label class="f">Wdh</label><input type="text" inputmode="numeric" value="${val('reps')}" data-input="wk-val" data-k="${k}" data-f="reps" placeholder="–"></div>
    <div class="xs muted grow">${lv ? 'Zuletzt: ' + (lv.kg != null ? fmtNum(lv.kg) + ' kg × ' : '') + (lv.reps != null ? lv.reps : '–') + ' Wdh' : 'Wird beim Abhaken je Satz gespeichert'}</div></div>
    ${logged.length ? `<div class="row wrap" style="gap:5px;margin-top:8px">${logged.map(([x, r]) => `<span class="chip c-jade">S${x.split('-').pop()}: ${r.kg != null ? fmtNum(r.kg) + ' kg × ' : ''}${r.reps != null ? r.reps : '–'}</span>`).join('')}</div>` : ''}`;
}
function exLogCard() {
  const rows = Object.entries(S.exLast).sort((a, b) => (b[1].date || '').localeCompare(a[1].date || '')).slice(0, 10);
  return `<div class="card"><h3>📋 Letzte Werte je Übung</h3><div class="stack mt">${rows.map(([n, r]) => `<div class="item"><span class="xs muted" style="width:62px">${fmtShort(r.date)}</span><span class="t"><b>${esc(n)}</b></span><span class="chip c-pink">${r.kg != null ? fmtNum(r.kg) + ' kg × ' : ''}${r.reps != null ? r.reps + ' Wdh' : '–'}</span></div>`).join('') || '<div class="empty">Trage im Workout Gewicht und Wiederholungen ein – sie erscheinen hier.</div>'}</div></div>`;
}

/* =====================  WOCHENRÜCKBLICK  ===================== */
let revWeek = null;
const weekStart = k => addKey(k, -dow(parseD(k)));
const weekDays = ws => Array.from({ length: 7 }, (_, i) => addKey(ws, i));
function weekStats(ws) {
  const days = weekDays(ws), prev = weekDays(addKey(ws, -7)), t = today(), past = days.filter(d => d <= t);
  const inW = d => days.includes(d), sess = S.sessions.filter(s => inW(s.date)), sec = sess.reduce((a, s) => a + s.sec, 0), psec = S.sessions.filter(s => prev.includes(s.date)).reduce((a, s) => a + s.sec, 0);
  const byMod = {}; sess.forEach(s => { const k = s.moduleId && modById(s.moduleId) ? s.moduleId : '-'; byMod[k] = (byMod[k] || 0) + s.sec; });
  const perDay = days.map(d => Math.round(secOn(d) / 60)), bestI = perDay.indexOf(Math.max(...perDay));
  const wk = S.workouts.filter(w => inW(w.date)), courses = days.filter(d => S.course[d]).length;
  const chapters = S.modules.reduce((a, m) => a + (m.plan || []).filter(p => p.type === 'chapter' && p.done && inW(p.date)).length, 0);
  const tasks = S.tasks.filter(x => x.doneAt && inW(dkey(new Date(x.doneAt)))).length;
  const ck = days.map(d => S.checkins[d]).filter(c => readiness(c) !== null);
  const meas = S.metrics.map(m => { const es = measOf(m.id).filter(e => inW(e.date)); return es.length ? { m, first: es[0].value, last: es[es.length - 1].value, n: es.length } : null; }).filter(Boolean);
  const ach = ACH.filter(a => S.ach[a.id] && inW(S.ach[a.id]));
  const habits = S.habits.map(h => ({ h, n: past.filter(d => habitDone(d, h)).length, of: past.length }));
  return { days, sec, psec, byMod, perDay, bestI, wk, courses, chapters, tasks, ck, meas, ach, habits, pomos: sess.filter(s => s.pomo).length, active: past.filter(d => dayLevel(d) > 0).length, of: past.length };
}
VIEWS.review = {
  title: () => '📝 回顾 Wochenrückblick',
  sub: () => revWeek ? `${fmtShort(revWeek)} – ${fmtShort(addKey(revWeek, 6))}` : '',
  render() {
    if (!revWeek) revWeek = weekStart(today());
    const ws = revWeek, st = weekStats(ws), r = S.reviews[ws] || {}, isCur = ws === weekStart(today());
    const diffPct = st.psec ? Math.round(100 * (st.sec - st.psec) / st.psec) : null;
    const hi = [];
    if (st.sec > 0) hi.push(`Stärkster Lerntag: <b>${DAYS_LONG[st.bestI]}</b> mit ${st.perDay[st.bestI]} Min.`);
    if (diffPct !== null) hi.push(`Lernzeit ${diffPct >= 0 ? '+' : ''}${diffPct} % gegenüber der Vorwoche.`);
    if (st.wk.length) hi.push(`${st.wk.length} Workout${st.wk.length > 1 ? 's' : ''} abgeschlossen (${st.wk.reduce((a, w) => a + w.done, 0)} Sätze).`);
    if (st.courses) hi.push(`${st.courses} von 3 Wushu-Kursen besucht.`);
    st.meas.forEach(x => hi.push(`${esc(x.m.name)}: ${fmtNum(x.first)} → ${fmtNum(x.last)} ${esc(x.m.unit)}`));
    st.ach.forEach(a => hi.push(`Neues Siegel: <b class="cn">${a.cn}</b> ${esc(a.name)}`));
    if (st.ck.length) hi.push(`Ø Schlaf ${fmtNum(st.ck.reduce((a, c) => a + c.sleep, 0) / st.ck.length)}/5 · Ø Erschöpfung ${fmtNum(st.ck.reduce((a, c) => a + c.fatigue, 0) / st.ck.length)}/5`);
    const maxSec = Math.max(...Object.values(st.byMod), 1);
    return `<div class="row between wrap"><div class="row"><button class="icon-btn" data-act="rev-nav" data-d="-1" aria-label="Vorherige Woche">‹</button><b>${fmtShort(ws)} – ${fmtShort(addKey(ws, 6))}${isCur ? ' (diese Woche)' : ''}</b><button class="icon-btn" data-act="rev-nav" data-d="1" aria-label="Nächste Woche">›</button></div><button class="btn btn-jade btn-sm" data-act="rev-note">📝 Als Notiz speichern</button></div>
    <div class="grid g4">${[['Lernzeit', fmtHours(st.sec), 'jade', diffPct !== null ? (diffPct >= 0 ? '+' : '') + diffPct + ' % zur Vorwoche' : ''], ['Workouts', st.wk.length, 'pink', st.courses + '/3 Kurse'], ['Aktive Tage', st.active + '/' + st.of, 'gold', '🔥 Streak ' + streak() + ' · 💼 ' + fmtNum(weekDays(ws).reduce((a, d) => a + workMinOn(d), 0) / 60) + ' h Arbeit'], ['Kapitel / Aufgaben', st.chapters + ' / ' + st.tasks, 'jade', st.pomos + ' Fokus-Sessions']].map(([l, v, c, s]) => `<div class="card center" style="border-color:var(--gold-border)"><div class="xs muted">${l}</div><div class="${c}-t b" style="font-size:26px">${v}</div><div class="xs faint">${s}</div></div>`).join('')}</div>
    <div class="grid g2" style="align-items:start">
      <div class="card"><h3>Lernzeit pro Tag</h3><div class="mt">${barChart(st.perDay, DAYS, true, 'm')}</div></div>
      <div class="card"><h3>Lernzeit pro Modul</h3><div class="stack mt">${Object.entries(st.byMod).sort((a, b) => b[1] - a[1]).map(([id, s]) => { const m = modById(id); return `<div class="hbar"><span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m ? esc(m.name) : 'Ohne Modul'}</span><div class="bar"><i style="width:${100 * s / maxSec}%;background:${m ? m.color : 'var(--faint)'}"></i></div><b>${fmtHours(s)}</b></div>`; }).join('') || '<div class="empty">Keine Lernzeit erfasst.</div>'}</div></div></div>
    <div class="grid g2" style="align-items:start">
      <div class="card"><h3>Gewohnheiten</h3><div class="stack mt">${st.habits.map(x => `<div class="hbar"><span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.h.name)}</span>${bar(x.of ? 100 * x.n / x.of : 0, 'pink')}<b>${x.n}/${x.of}</b></div>`).join('')}</div></div>
      <div class="card"><h3>✨ Highlights</h3><ul class="sm" style="margin:10px 0 0 18px;line-height:1.7">${hi.map(x => `<li>${x}</li>`).join('') || '<li class="muted">Noch keine Daten in dieser Woche.</li>'}</ul></div></div>
    <div class="card"><h3>Deine Reflexion</h3><div class="stack mt">${[['good', 'Was lief gut?'], ['hard', 'Was hat gehakt?'], ['focus', 'Fokus für nächste Woche']].map(([f, l]) => `<div><label class="f">${l}</label><textarea data-input="rev-text" data-f="${f}" style="min-height:70px">${esc(r[f] || '')}</textarea></div>`).join('')}</div></div>`;
  }
};
A['rev-nav'] = d => { revWeek = addKey(revWeek, 7 * +d.d); render(); };
A['rev-text'] = (d, el) => { (S.reviews[revWeek] || (S.reviews[revWeek] = {}))[d.f] = el.value; save(); };
A['rev-open'] = d => { revWeek = d.ws; go('review', { top: true }); };
A['rev-note'] = () => {
  const ws = revWeek, st = weekStats(ws), r = S.reviews[ws] || {}, now = Date.now();
  const md = `# Wochenrückblick ${fmtShort(ws)} – ${fmtShort(addKey(ws, 6))}\n\n## Zahlen\n- Lernzeit: ${fmtHours(st.sec)}\n- Workouts: ${st.wk.length} · Wushu-Kurse: ${st.courses}/3\n- Aktive Tage: ${st.active}/${st.of}\n- Kapitel erledigt: ${st.chapters} · Aufgaben erledigt: ${st.tasks}\n\n## Was lief gut?\n${r.good || '-'}\n\n## Was hat gehakt?\n${r.hard || '-'}\n\n## Fokus nächste Woche\n- [ ] ${r.focus || ''}\n`;
  S.notes.push({ id: uid(), title: `Wochenrückblick ${fmtShort(ws)}`, content: md, tags: [], status: S.statuses[0], moduleId: null, template: 'week', created: now, u: now });
  save(); toast('Als Notiz gespeichert 📝 (Study Hub → Notizen)');
};
function reviewHint() {
  if (!autoOn('review')) return '';
  const t = today(), d = dow(parseD(t)); if (d !== 6 && d !== 0) return '';
  const ws = d === 6 ? weekStart(t) : addKey(weekStart(t), -7); if (S.reviews[ws] && (S.reviews[ws].good || S.reviews[ws].hard || S.reviews[ws].focus)) return '';
  return `<div class="card hero accent-gold row between wrap"><div><h3>📝 Dein Wochenrückblick ist bereit</h3><p class="xs muted">Zahlen, Highlights und drei Reflexionsfragen – dauert 2 Minuten.</p></div><button class="btn btn-gold" data-act="rev-open" data-ws="${ws}">Öffnen</button></div>`;
}
function dashExtras() {
  const two = [dashOn('lang') && langCard(), dashOn('checkin') && checkinCard()].filter(Boolean);
  return `${dashOn('review') ? reviewHint() : ''}${autoOn('worklead') && dashOn('worklead') ? workLeadCard() : ''}${semHint()}${dashOn('wgoals') ? wgCard(weekStart(today())) : ''}${dashOn('sugg') ? suggCard('today') : ''}${two.length === 2 ? `<div class="grid g2">${two.join('')}</div>` : two.join('')}${dashOn('exp') ? expCard() : ''}${dashOn('pack') ? packDashCard() : ''}`;
}

/* =====================  ARBEIT: planen · einstempeln · abhaken  ===================== */
const wkKey = (date, id) => date + '|' + id;
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const planMinOf = e => Math.max(0, toMin(e.end) - toMin(e.start) - (e.breakMin || 0));
const workPlannedMin = date => eventsOn(date).filter(e => e.kind === 'event' && e.type === 'work' && e.start && e.end).reduce((a, e) => a + planMinOf(e), 0);
const workMinOn = date => Object.values(S.workLog).filter(v => v.date === date).reduce((a, v) => a + v.min, 0);
const workPct = date => { const p = workPlannedMin(date), d = workMinOn(date); return p > 0 ? clamp(Math.round(100 * d / p), 0, 100) : d > 0 ? 100 : null; };

function workActions(a, date) {
  const key = wkKey(date, a.id), L = S.workLog[key], clk = S.workClock && S.workClock.key === key, at = `data-date="${date}" data-id="${a.id}"`;
  if (L) return `<span class="chip c-jade">✓ ${fmtNum(L.min / 60)} h</span><button class="btn btn-ghost btn-sm" data-act="work-done" ${at} aria-label="Arbeitszeit bearbeiten">✎</button>`;
  if (clk) return `<span class="chip c-gold mono" data-wc="time">00:00</span><button class="btn btn-jade btn-sm" data-act="work-out">■ Ausstempeln</button>`;
  return `<button class="btn btn-ghost btn-sm" data-act="work-in" ${at}>▶ Einstempeln</button><button class="btn btn-jade btn-sm" data-act="work-done" ${at}>✓ Erledigt</button>`;
}
A['work-in'] = d => {
  if (S.workClock) { toast('Es läuft bereits eine Arbeitszeit.'); return; }
  const e = eventsOn(d.date).find(x => x.kind === 'event' && x.id === d.id);
  S.workClock = { key: wkKey(d.date, d.id), date: d.date, id: d.id, title: e ? e.title : 'Arbeit', brk: e ? e.breakMin || 0 : 0, startedAt: Date.now() };
  save(); render(); toast('Eingestempelt ⏱');
};
A['work-out'] = () => { const c = S.workClock; if (!c) return; openWorkForm({ key: c.key, date: c.date, id: c.id, title: c.title, start: hhmm(new Date(c.startedAt)), end: hhmm(new Date()), brk: c.brk, clock: true }); };
A['work-done'] = d => {
  const e = eventsOn(d.date).find(x => x.kind === 'event' && x.id === d.id), key = wkKey(d.date, d.id), L = S.workLog[key] || {};
  openWorkForm({ key, date: d.date, id: d.id, title: e ? e.title : (L.title || 'Arbeit'), start: e && e.start || '08:00', end: e && e.end || '16:00', brk: e ? e.breakMin || 0 : 0 });
};
A['work-plan'] = () => openEventForm(null, today(), 'work');
A['work-add'] = () => openWorkForm({ key: 'm|' + uid(), date: today(), id: '', title: 'Arbeit', start: '08:00', end: '16:00', brk: 30, manual: true });
A['work-del'] = d => { delete S.workLog[d.key]; save(); render(); };
function openWorkForm(o) {
  const L = S.workLog[o.key], v = L ? L : o;
  openModal({
    title: o.clock ? '■ Ausstempeln' : L ? 'Arbeitszeit bearbeiten' : o.manual ? 'Arbeitszeit nachtragen' : '✓ Arbeit erledigt',
    danger: L ? 'Zurücksetzen' : null, onDanger: () => { delete S.workLog[o.key]; save(); render(); },
    okText: 'Speichern',
    body: `<div class="form-grid">${o.manual ? `<div class="full"><label class="f">Tätigkeit</label><input type="text" name="title" value="${esc(v.title)}"></div><div class="full"><label class="f">Datum</label><input type="date" name="date" value="${esc(v.date)}"></div>` : `<div class="full"><b>${esc(v.title)}</b> <span class="xs muted">${fmtDate(v.date)}</span></div>`}
      <div><label class="f">Beginn</label><input type="time" name="start" value="${esc(v.start)}" required></div><div><label class="f">Ende</label><input type="time" name="end" value="${esc(v.end)}" required></div>
      <div><label class="f">Pause (Min)</label><input type="number" name="brk" value="${v.brk || 0}" min="0" max="480"></div>
      <div class="full"><label class="f">Notiz (optional)</label><input type="text" name="note" value="${esc(v.note || '')}" placeholder="z. B. Projekt, Besonderheiten"></div>
      <p class="xs muted full">Die Arbeitszeit fließt in deine Balance (工) und in den Stundenzettel ein.</p></div>`,
    onOk: f => {
      const a = toMin(f.start.value); let b = toMin(f.end.value); if (b <= a) b += 1440;
      const brk = +f.brk.value || 0, min = Math.max(0, b - a - brk);
      if (!f.start.value || !f.end.value || min <= 0) { toast('Bitte gültige Zeiten eingeben.'); return false; }
      S.workLog[o.key] = { date: o.manual ? (f.date.value || o.date) : o.date, id: o.id, title: o.manual ? (f.title.value.trim() || 'Arbeit') : o.title, start: f.start.value, end: f.end.value, brk, min, note: f.note.value.trim(), ts: Date.now() };
      if (o.clock) S.workClock = null;
      save(); render(); petals(innerWidth / 2, innerHeight / 3, 16); toast(`${fmtNum(min / 60)} h Arbeit erfasst ✓`);
    }
  });
}
function workCsv() {
  const rows = Object.values(S.workLog).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)), q = s => '"' + String(s || '').replace(/"/g, '""') + '"';
  return ['Datum;Beginn;Ende;Pause (Min);Minuten;Stunden;Tätigkeit;Notiz', ...rows.map(v => [v.date, v.start, v.end, v.brk, v.min, (v.min / 60).toFixed(2).replace('.', ','), q(v.title), q(v.note)].join(';'))].join('\r\n');
}
A['work-csv'] = () => { downloadFile('arbeitszeiten.csv', 'text/csv;charset=utf-8', '\ufeff' + workCsv()); toast('Stundenzettel gespeichert (CSV, in Excel öffenbar)'); };
function workTimeCard() {
  const t = today(), days = weekDays(weekStart(t)), planW = days.reduce((a, d) => a + workPlannedMin(d), 0), doneW = days.reduce((a, d) => a + workMinOn(d), 0);
  const month = Object.values(S.workLog).filter(v => v.date.slice(0, 7) === t.slice(0, 7)).reduce((a, v) => a + v.min, 0);
  const up = []; for (let i = 0; i < 14; i++) { const d = addKey(t, i); eventsOn(d).filter(e => e.kind === 'event' && e.type === 'work' && !S.workLog[wkKey(d, e.id)]).forEach(e => up.push({ d, e })); }
  const entries = Object.entries(S.workLog).sort((a, b) => b[1].date.localeCompare(a[1].date) || b[1].ts - a[1].ts).slice(0, 6);
  return `<div class="card hero accent-gold"><div class="row between wrap"><h3>💼 Arbeitszeit</h3><div class="row wrap"><button class="btn btn-jade btn-sm" data-act="work-plan">+ Schicht planen</button><button class="btn btn-ghost btn-sm" data-act="work-add">+ Zeit nachtragen</button><button class="btn btn-ghost btn-sm" data-act="work-csv">⬇ Stundenzettel</button></div></div>
    <div class="grid g3 mt" style="gap:12px"><div><div class="xs muted">Diese Woche</div><div class="b jade-t" style="font-size:22px">${fmtNum(doneW / 60)} h <span class="xs muted">/ ${fmtNum(planW / 60)} h geplant</span></div>${bar(planW ? 100 * doneW / planW : 0, 'gold')}</div>
      <div><div class="xs muted">Dieser Monat</div><div class="b" style="font-size:22px">${fmtNum(month / 60)} h</div></div>
      <div><div class="xs muted">Stempeluhr</div><div class="b" style="font-size:22px">${S.workClock ? `<span class="mono gold-t" data-wc="time">00:00</span> <span class="xs muted">läuft</span>` : '<span class="faint">aus</span>'}</div></div></div>
    <div class="xs b gold-t" style="margin:14px 0 6px">Anstehend (14 Tage)</div><div class="stack">${up.slice(0, 6).map(({ d, e }) => `<div class="item"><span class="bar-side" style="background:${'#2E6F9E'}"></span><span class="timeline-time" style="width:96px">${DAYS[dow(parseD(d))]} ${fmtShort(d)}<br>${esc(e.start)}–${esc(e.end)}</span><span class="t">${esc(e.title)}</span>${workActions(e, d)}</div>`).join('') || '<div class="empty">Keine Schicht geplant. Mit „+ Schicht planen“ trägst du sie vorab in den Kalender ein.</div>'}</div>
    <div class="xs b gold-t" style="margin:14px 0 6px">Zuletzt erfasst</div><div class="stack">${entries.map(([k, v]) => `<div class="item"><span class="xs muted" style="width:62px">${fmtShort(v.date)}</span><span class="t">${esc(v.title)} <span class="xs muted">${esc(v.start)}–${esc(v.end)}${v.brk ? ' · ' + v.brk + ' Min Pause' : ''}</span></span><span class="chip c-jade">${fmtNum(v.min / 60)} h</span><button class="btn btn-danger btn-sm" data-act="work-del" data-key="${esc(k)}" aria-label="Löschen">✕</button></div>`).join('') || '<div class="empty">Noch keine Arbeitszeit erfasst.</div>'}</div></div>`;
}

/* ---- Balance (Yin-Yang): Körper · Geist · Arbeit ---- */
function balanceBlock(koerper, geist) {
  const t = today(), wp = workPct(t), goalMin = S.settings.studyGoalMin;
  const parts = [['武', 'Körper', koerper, 'pink', 'pink-t', 'Training'], ['文', 'Geist', geist, '', 'jade-t', 'Ziel ' + goalMin + ' Min']];
  if (wp !== null) parts.push(['工', 'Arbeit', wp, 'gold', 'gold-t', fmtNum(workMinOn(t) / 60) + ' von ' + fmtNum(workPlannedMin(t) / 60) + ' h']);
  const avg = Math.round(parts.reduce((a, p) => a + p[2], 0) / parts.length), C = 2 * Math.PI * 30;
  return `<div class="row wrap" style="gap:18px"><div style="text-align:center"><svg width="76" height="76" viewBox="0 0 72 72" role="img" aria-label="Balance ${avg} Prozent"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--surface2)" stroke-width="6"/><circle cx="36" cy="36" r="30" fill="none" stroke="var(--gold)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - avg / 100)}" transform="rotate(-90 36 36)"/><text x="36" y="44" text-anchor="middle" font-size="24" fill="var(--gold-text)">☯</text></svg><div class="xs b gold-t">${avg} % Balance</div></div>
    ${parts.map(p => `<div style="min-width:92px"><div class="b ${p[4]}" style="font-size:20px"><span class="cn">${p[0]}</span> ${p[2]}%</div>${bar(p[2], p[3])}<div class="xs faint">${p[1]} · ${p[5]}</div></div>`).join('')}</div>`;
}

/* =====================  SPEICHERORT AUF DEM GERÄT (Datei-Verknüpfung)  ===================== */
const FL = { handle: null, ok: false, last: 0, busy: false, t: null };
async function flInit() {
  try { if (!KV.db) return; const h = await KV.get('filelink'); if (h && h.queryPermission) { FL.handle = h; FL.ok = (await h.queryPermission({ mode: 'readwrite' })) === 'granted'; } } catch (_) { }
}
async function flWrite(force) {
  if (!FL.handle || !FL.ok || !S) return;
  if (!force && Date.now() - FL.last < 15000) { clearTimeout(FL.t); FL.t = setTimeout(() => flWrite(true), 15000 - (Date.now() - FL.last) + 50); return; }
  if (FL.busy) return; FL.busy = true;
  try { const w = await FL.handle.createWritable(); await w.write(backupText()); await w.close(); FL.last = Date.now(); }
  catch (e) { FL.ok = false; }
  FL.busy = false; if (current === 'settings') { const el = $('#fl-state'); if (el) el.innerHTML = flState(); }
}
const flState = () => !FL.handle ? '' : `Verknüpft: <b>${esc(FL.handle.name)}</b> · ${FL.ok ? '✓ aktiv' + (FL.last ? ' · zuletzt gespeichert ' + hhmm(new Date(FL.last)) : '') : '⚠️ Zugriff muss bestätigt werden'}`;
function flCard() {
  const sup = !!window.showSaveFilePicker;
  return `<div class="card"><h3>📁 Speicherort auf deinem Gerät</h3>
    <p class="xs muted" style="margin:4px 0 10px">Normalerweise liegen die Daten im geschützten Browser-Speicher. Hier verknüpfst du zusätzlich eine <b>echte Datei</b> auf deinem Gerät: Die App sichert nach jeder Änderung automatisch hinein (höchstens alle 15 Sek.). Wählst du einen Ordner, der mit Syncthing, OneDrive oder Dropbox synchronisiert wird, hast du Sync zwischen Geräten ohne eigenen Server.</p>
    ${!sup ? '<div class="note-box nb-pink">Dieser Browser kann keine Dateien direkt verknüpfen. Das klappt in Chrome oder Edge am Laptop. Am Handy nutze „Backup teilen“.</div>' : `<p class="sm" id="fl-state">${flState()}</p>
    <div class="row wrap mt">${!FL.handle ? '<button class="btn btn-jade" data-act="fl-pick">Speicherort wählen</button>' : `${!FL.ok ? '<button class="btn btn-gold" data-act="fl-reauth">Zugriff bestätigen</button>' : '<button class="btn btn-jade btn-sm" data-act="fl-now">Jetzt speichern</button>'}<button class="btn btn-ghost btn-sm" data-act="fl-load">Aus Datei laden</button><button class="btn btn-danger btn-sm" data-act="fl-off">Trennen</button>`}</div>`}</div>`;
}
A['fl-pick'] = async () => {
  try {
    const h = await window.showSaveFilePicker({ suggestedName: 'sakura-jade-daten.json', types: [{ description: 'Sakura & Jade Daten', accept: { 'application/json': ['.json'] } }] });
    FL.handle = h; FL.ok = true; try { await KV.set('filelink', h); } catch (_) { }
    await flWrite(true); toast('Speicherort verknüpft ✓'); render();
  } catch (e) { if (e.name !== 'AbortError') toast('Verknüpfen nicht möglich: ' + e.message); }
};
A['fl-reauth'] = async () => { try { FL.ok = (await FL.handle.requestPermission({ mode: 'readwrite' })) === 'granted'; if (FL.ok) { await flWrite(true); toast('Zugriff aktiv ✓'); } } catch (_) { toast('Zugriff nicht erteilt.'); } render(); };
A['fl-now'] = async () => { await flWrite(true); toast(FL.ok ? 'Gespeichert ✓' : 'Zugriff fehlt'); render(); };
A['fl-off'] = async () => { FL.handle = null; FL.ok = false; try { await KV.set('filelink', null); } catch (_) { } render(); };
A['fl-load'] = async () => {
  try {
    const [h] = await window.showOpenFilePicker({ types: [{ description: 'Sakura & Jade Daten', accept: { 'application/json': ['.json'] } }] });
    const txt = await (await h.getFile()).text();
    confirmBox('Daten aus dieser Datei mit den aktuellen Daten zusammenführen? (Neue Einträge werden ergänzt, bei Konflikten gewinnt der jüngere Stand.)', 'Zusammenführen', () => importBackupText(txt, 'merge'));
  } catch (e) { if (e.name !== 'AbortError') toast('Laden nicht möglich.'); }
};

/* =====================  INSTALLATIONS-CHECK  ===================== */
async function installDiag() {
  const out = [], add = (ok, label, hint) => out.push({ ok, label, hint });
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), crios = /CriOS/.test(ua);
  const secure = window.isSecureContext && location.protocol !== 'file:';
  add(secure, 'Sichere Adresse (https oder localhost)', secure ? location.origin : `Die App läuft als lokale Datei (${location.protocol}). Öffne stattdessen deine https://…github.io-Adresse im Browser.`);
  if (ios) add(!crios, 'iPhone: Safari verwenden', crios ? 'Chrome kann auf dem iPhone keine Apps installieren. Öffne die Adresse in Safari → Teilen → „Zum Home-Bildschirm“.' : 'In Safari: Teilen → „Zum Home-Bildschirm“.');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  add(true, standalone ? 'Du nutzt bereits die installierte App' : 'Läuft im Browser-Tab', standalone ? '' : 'Normal, solange du noch nicht installiert hast.');
  const link = document.querySelector('link[rel=manifest]');
  if (!link) add(false, 'Manifest (App-Beschreibung) gefunden', 'Diese Version hat kein Manifest (die Einzel-Datei „Sakura-Jade.html“). Lade den ganzen Ordner aus dem ZIP hoch, nicht nur diese Datei.');
  else {
    try {
      const r = await fetch(link.href), mf = await r.json(); add(r.ok, 'Manifest erreichbar', link.href);
      const bad = []; for (const ic of mf.icons || []) { try { const ir = await fetch(new URL(ic.src, link.href)); if (!ir.ok) bad.push(ic.src); } catch (_) { bad.push(ic.src); } }
      add(!bad.length, 'App-Symbole (icons) erreichbar', bad.length ? 'Fehlen auf dem Server: ' + bad.join(', ') + '. Lade den Ordner „icons“ erneut hoch.' : (mf.icons || []).length + ' Symbole gefunden');
    } catch (e) { add(false, 'Manifest erreichbar', 'Datei „manifest.webmanifest“ fehlt oder ist nicht lesbar. Sie muss neben index.html liegen.'); }
  }
  let reg = null; try { reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); } catch (_) { }
  add(!!(reg && reg.active), 'Offline-Dienst (sw.js) aktiv', reg && reg.active ? 'Registriert für ' + reg.scope : (secure ? 'Noch nicht aktiv. Seite einmal neu laden, 15 Sek. warten. Prüfe, ob „sw.js“ neben index.html liegt.' : 'Ohne sichere Adresse nicht möglich.'));
  try { const est = await navigator.storage.estimate(); if (est.quota && est.quota < 140 * 1024 * 1024) add(false, 'Normaler (nicht privater) Modus', 'Der Speicher ist sehr klein: vermutlich Inkognito/Privatmodus. Dort kann nicht installiert werden.'); } catch (_) { }
  const allOk = out.every(r => r.ok);
  add(allOk, 'Bereit zur Installation', deferredInstall ? 'Chrome bietet die Installation an: oben rechts auf ⬇️ tippen.' : standalone ? 'Bereits installiert.' : allOk ? 'Alle Voraussetzungen sind erfüllt. Jetzt in Chrome: Menü ⋮ → „App installieren“ (Android: auch „Zum Startbildschirm hinzufügen“). Laptop: Symbol rechts in der Adressleiste. iPhone nur über Safari.' : 'Behebe zuerst die ❌ Punkte oben, lade die Seite neu und prüfe erneut.');
  return out;
}
A['diag-run'] = async (d, el) => {
  const box = $('#diag'); box.innerHTML = '<span class="xs muted">Prüfe…</span>';
  const res = await installDiag();
  box.innerHTML = res.map(r => `<div class="item" style="align-items:flex-start"><span style="width:20px">${r.ok ? '✅' : '❌'}</span><span class="t"><b>${esc(r.label)}</b><div class="xs muted">${esc(r.hint)}</div></span></div>`).join('');
};
function diagCard() { if (IS_NATIVE) return ''; return `<div class="card"><h3>🔧 Installations-Check</h3><p class="xs muted" style="margin:4px 0 10px">Zeigt dir, warum sich die App evtl. nicht installieren lässt, und was du ändern musst.</p><button class="btn btn-jade btn-sm" data-act="diag-run">Jetzt prüfen</button><div class="stack mt" id="diag"></div></div>`; }


/* =====================  AUSGABEN-TRACKER  ===================== */
const EXP_CATS = {
  essen: ['🍜', 'Essen & Trinken', '#C95169'], uni: ['📚', 'Uni & Material', '#3B7A57'], sport: ['🥋', 'Training & Sport', '#D4A017'],
  mobil: ['🚆', 'Mobilität', '#5B86B8'], wohnen: ['🏠', 'Wohnen & Fixkosten', '#8E63B5'], freizeit: ['🎮', 'Freizeit', '#D07F45'],
  shopping: ['🛍️', 'Shopping', '#E58BA0'], sonst: ['🧾', 'Sonstiges', '#8A8A80']
};
let expMonth = today().slice(0, 7);
const fmtEur = c => (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const parseEur = s => {
  const t = String(s ?? '').trim().replace(/[\s€]/g, '');
  const n = t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
  return isFinite(n) ? Math.round(n * 100) : NaN;
};
const eurInput = c => c ? (c / 100).toFixed(2).replace('.', ',') : '';
const daysInMonth = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
const monthLabel = m => `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
const shiftMonth = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

/* Alle Ausgaben eines Monats (monatliche Fixkosten werden ab ihrem Startmonat mitgerechnet) */
function expensesIn(month) {
  const out = [], dim = daysInMonth(month);
  S.expenses.forEach(e => {
    if (e.rec === 'monthly') {
      if (e.date.slice(0, 7) > month) return;
      out.push({ ...e, date: `${month}-${pad(Math.min(+e.date.slice(8, 10), dim))}`, virt: e.date.slice(0, 7) !== month });
    } else if (e.date.slice(0, 7) === month) out.push(e);
  });
  return out.sort((a, b) => b.date.localeCompare(a.date) || (b.u || 0) - (a.u || 0));
}
const expTotal = list => list.reduce((a, e) => a + e.amt, 0);
const workMinInMonth = m => Object.values(S.workLog).filter(v => v.date.slice(0, 7) === m).reduce((a, v) => a + v.min, 0);

VIEWS.expenses = {
  title: () => '💰 开支 Ausgaben',
  sub: () => 'Monatsbudget, Kategorien & Fixkosten – nur auf deinem Gerät',
  render() {
    const m = expMonth, cur = today().slice(0, 7), list = expensesIn(m), total = expTotal(list), budget = S.settings.budget || 0, wage = S.settings.wage || 0;
    const dim = daysInMonth(m), dayNow = m === cur ? +today().slice(8) : m < cur ? dim : 0, daysLeft = Math.max(1, dim - dayNow + 1);
    const left = budget - total, pct = budget ? total / budget * 100 : 0;
    const byCat = {}; list.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amt; });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const fixed = list.filter(e => e.rec === 'monthly').reduce((a, e) => a + e.amt, 0);
    const mins = workMinInMonth(m), income = wage ? Math.round(mins / 60 * wage) : 0;
    const budgetBlock = budget
      ? `<div class="mt"><div class="row between"><span class="sm b">${fmtEur(total)} <span class="muted">von ${fmtEur(budget)}</span></span><span class="xs b ${left < 0 ? 'red-t' : 'jade-t'}">${left < 0 ? fmtEur(-left) + ' über Budget' : 'noch ' + fmtEur(left) + ' frei'}</span></div>
          <div class="bar ${pct > 100 ? 'red' : pct > 85 ? 'pink' : 'gold'}" style="margin-top:6px"><i style="width:${clamp(pct, 0, 100)}%"></i></div>
          <div class="xs muted" style="margin-top:6px">${m === cur && left > 0 ? `≈ ${fmtEur(left / daysLeft)} pro Tag bis Monatsende` : ''}${m === cur && dayNow >= 3 ? ` · Hochrechnung: ${fmtEur(fixed + (total - fixed) / dayNow * dim)}` : ''}</div></div>`
      : `<p class="xs muted mt">Lege oben ein Monatsbudget fest, dann siehst du, wie viel pro Tag noch frei ist.</p>`;
    return `<div class="stack">
      <div class="card hero accent-gold">
        <div class="row between wrap"><div class="row"><button class="icon-btn" data-act="exp-nav" data-d="-1" aria-label="Vorheriger Monat">‹</button><h3 style="min-width:150px;text-align:center">${monthLabel(m)}</h3><button class="icon-btn" data-act="exp-nav" data-d="1" aria-label="Nächster Monat">›</button></div>
          <div class="row wrap"><button class="btn btn-jade btn-sm" data-act="exp-add">+ Ausgabe</button><button class="btn btn-ghost btn-sm" data-act="exp-budget">⚙ Budget & Lohn</button><button class="btn btn-ghost btn-sm" data-act="exp-csv">⬇ CSV</button></div></div>
        <div class="grid g3 mt" style="gap:12px">
          <div><div class="xs muted">Ausgaben</div><div class="b" style="font-size:24px">${fmtEur(total)}</div><div class="xs faint">${list.length} ${list.length === 1 ? 'Buchung' : 'Buchungen'} · davon Fixkosten ${fmtEur(fixed)}</div></div>
          <div><div class="xs muted">Verdienst aus Arbeit</div><div class="b jade-t" style="font-size:24px">${wage ? fmtEur(income) : '–'}</div><div class="xs faint">${wage ? fmtNum(mins / 60) + ' h × ' + fmtEur(wage) + '/h (brutto)' : 'Stundenlohn unter „Budget & Lohn“'}</div></div>
          <div><div class="xs muted">Bilanz</div><div class="b ${income - total >= 0 ? 'jade-t' : 'red-t'}" style="font-size:24px">${wage ? (income - total >= 0 ? '+' : '−') + fmtEur(Math.abs(income - total)) : '–'}</div><div class="xs faint">Verdienst − Ausgaben</div></div></div>
        ${budgetBlock}</div>
      <div class="grid g2" style="align-items:start">
        <div class="card"><h3>Wofür geht das Geld drauf?</h3><div class="stack mt">${cats.map(([k, v]) => { const c = EXP_CATS[k] || EXP_CATS.sonst; return `<div><div class="row between"><span class="sm">${c[0]} ${c[1]}</span><span class="sm b">${fmtEur(v)} <span class="xs muted">${Math.round(100 * v / total)} %</span></span></div><div class="bar" style="margin-top:4px"><i style="width:${100 * v / total}%;background:${c[2]}"></i></div></div>`; }).join('') || '<div class="empty">In diesem Monat noch nichts eingetragen.</div>'}</div></div>
        <div class="card"><h3>Buchungen</h3><div class="stack mt">${list.map(e => { const c = EXP_CATS[e.cat] || EXP_CATS.sonst; return `<div class="item" data-act="exp-edit" data-id="${e.id}" style="cursor:pointer"><span class="xs muted" style="width:40px">${fmtShort(e.date)}</span><span style="font-size:18px">${c[0]}</span><span class="t">${esc(e.note || c[1])}${e.rec === 'monthly' ? ' <span class="chip c-gold">↻ monatlich</span>' : ''}</span><b class="mono">${fmtEur(e.amt)}</b></div>`; }).join('') || '<div class="empty">Tippe auf „+ Ausgabe“, um die erste Buchung einzutragen.</div>'}</div></div></div></div>`;
  }
};
A['exp-nav'] = d => { expMonth = shiftMonth(expMonth, +d.d); render(); };
A['exp-add'] = () => openExpForm(null);
A['exp-edit'] = d => openExpForm(d.id);
function openExpForm(id) {
  const e = id ? S.expenses.find(x => x.id === id) : null, v = e || { amt: 0, cat: 'essen', note: '', date: today(), rec: '' };
  const date = e && e.rec === 'monthly' ? e.date : (e ? e.date : (expMonth === today().slice(0, 7) ? today() : expMonth + '-01'));
  openModal({
    title: e ? 'Ausgabe bearbeiten' : '💰 Neue Ausgabe', okText: 'Speichern', danger: e ? 'Löschen' : null,
    onDanger: () => { S.expenses = S.expenses.filter(x => x.id !== id); save(); render(); toast('Gelöscht'); },
    body: `<div class="form-grid"><div class="full"><label class="f">Betrag (€)</label><input type="text" name="amt" inputmode="decimal" placeholder="z. B. 4,50" value="${eurInput(v.amt)}" required autofocus style="font-size:20px"></div>
      <div class="full"><label class="f">Kategorie</label><div class="row wrap">${Object.entries(EXP_CATS).map(([k, c]) => `<label class="chip c-gray" style="cursor:pointer"><input type="radio" name="cat" value="${k}" ${k === v.cat ? 'checked' : ''}> ${c[0]} ${c[1]}</label>`).join('')}</div></div>
      <div class="full"><label class="f">Notiz (optional)</label><input type="text" name="note" value="${esc(v.note)}" placeholder="z. B. Mensa, Semesterticket"></div>
      <div><label class="f">Datum</label><input type="date" name="date" value="${esc(date)}" required></div>
      <div style="align-self:end"><label class="row" style="cursor:pointer"><input type="checkbox" name="rec" ${v.rec === 'monthly' ? 'checked' : ''}> <span class="sm">Jeden Monat (Fixkosten)</span></label></div></div>`,
    onOk: f => {
      const amt = parseEur(f.amt.value); if (!(amt > 0)) { toast('Bitte einen Betrag eingeben, z. B. 4,50'); return false; }
      const cat = (f.querySelector('[name=cat]:checked') || {}).value || 'sonst', rec = f.rec.checked ? 'monthly' : '';
      const data = { amt, cat, note: f.note.value.trim(), date: f.date.value || today(), rec, u: Date.now() };
      if (e) Object.assign(e, data); else S.expenses.push({ id: uid(), ...data });
      save(); render(); toast(`${fmtEur(amt)} gespeichert 💰`);
    }
  });
}
A['exp-budget'] = () => openModal({
  title: '⚙ Budget & Stundenlohn', okText: 'Speichern',
  body: `<div class="form-grid"><div class="full"><label class="f">Monatsbudget (€)</label><input type="text" name="budget" inputmode="decimal" value="${eurInput(S.settings.budget)}" placeholder="z. B. 900"></div>
    <div class="full"><label class="f">Stundenlohn brutto (€/h) – optional</label><input type="text" name="wage" inputmode="decimal" value="${eurInput(S.settings.wage)}" placeholder="z. B. 13,50"></div>
    <p class="xs muted full">Mit Stundenlohn rechnet die App aus deiner erfassten Arbeitszeit (Work Space) den Verdienst aus und zeigt die Bilanz. Alles bleibt auf deinem Gerät.</p></div>`,
  onOk: f => { const b = parseEur(f.budget.value), w = parseEur(f.wage.value); S.settings.budget = b > 0 ? b : 0; S.settings.wage = w > 0 ? w : 0; save(); render(); }
});
function expCsv(m) {
  const q = s => '"' + String(s || '').replace(/"/g, '""') + '"';
  return ['Datum;Kategorie;Betrag (EUR);Notiz;Fixkosten', ...expensesIn(m).slice().reverse().map(e => [e.date, q((EXP_CATS[e.cat] || EXP_CATS.sonst)[1]), (e.amt / 100).toFixed(2).replace('.', ','), q(e.note), e.rec === 'monthly' ? 'ja' : 'nein'].join(';'))].join('\r\n');
}
A['exp-csv'] = () => { downloadFile(`ausgaben-${expMonth}.csv`, 'text/csv;charset=utf-8', '﻿' + expCsv(expMonth)); toast('Ausgaben als CSV gespeichert'); };
function expCard() {
  const m = today().slice(0, 7), list = expensesIn(m), total = expTotal(list), budget = S.settings.budget || 0;
  if (!list.length && !budget) return '';
  const pct = budget ? total / budget * 100 : 0;
  return `<div class="card"><div class="row between"><h3>💰 Ausgaben im ${MONTHS[+m.slice(5, 7) - 1]}</h3><button class="btn btn-ghost btn-sm" data-act="go" data-view="expenses">Öffnen</button></div>
    <div class="b" style="font-size:22px;margin-top:6px">${fmtEur(total)} ${budget ? `<span class="xs muted">von ${fmtEur(budget)}</span>` : ''}</div>
    ${budget ? `<div class="bar ${pct > 100 ? 'red' : pct > 85 ? 'pink' : 'gold'}" style="margin-top:6px"><i style="width:${clamp(pct, 0, 100)}%"></i></div>` : ''}</div>`;
}

/* =====================  PIN-SPERRE  ===================== */
/* SHA-256 in reinem JS (läuft überall, auch ohne sichere Adresse) */
const SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function sha256(msg) {
  const l = msg.length, n = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(n); buf.set(msg); buf[l] = 0x80;
  const dv = new DataView(buf.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296));
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const w = new Uint32Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = (w[i - 16] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = [a, b, c, d, e, f, g, h].map((v, i) => (H[i] + v) | 0);
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((v, i) => ov.setUint32(i * 4, v)); return out;
}
const utf8 = s => new TextEncoder().encode(s);
const toHex = u => [...u].map(b => b.toString(16).padStart(2, '0')).join('');
function pinHash(pin, salt) { // gesalzen und 4000-fach wiederholt
  let h = sha256(utf8(salt + ':' + pin)); const sb = utf8(salt);
  for (let i = 0; i < 4000; i++) { const x = new Uint8Array(h.length + sb.length); x.set(h); x.set(sb, h.length); h = sha256(x); }
  return toHex(h);
}
const LOCK = { on: false, buf: '', busy: false, hiddenAt: 0, shake: false, timer: null };
const LOCK_OPTS = [[0, 'Sofort beim Verlassen der App'], [1, 'Nach 1 Minute'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten'], [-1, 'Nur beim Start']];
function pinCfg() { try { const c = JSON.parse(localStorage.getItem('sj-pin')); return c && c.h && c.s ? c : null; } catch (_) { return null; } }
function pinSave(c) { try { if (c) localStorage.setItem('sj-pin', JSON.stringify(c)); else { localStorage.removeItem('sj-pin'); localStorage.removeItem('sj-pin-fail'); } } catch (_) { toast('PIN konnte nicht gespeichert werden.'); } lockSync(); }
const failGet = () => { try { return JSON.parse(localStorage.getItem('sj-pin-fail')) || { n: 0, until: 0 }; } catch (_) { return { n: 0, until: 0 }; } };
const failSet = f => { try { localStorage.setItem('sj-pin-fail', JSON.stringify(f)); } catch (_) { } };
function lockSync() { const b = $('#btn-lock'); if (b) b.hidden = !pinCfg(); }
function lockInert(on) { [...document.body.children].forEach(el => { if (el.id === 'lock' || el.tagName === 'SCRIPT') return; if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }); }
function lockShow() {
  const c = pinCfg(); if (!c) { document.documentElement.classList.remove('locked'); return; }
  LOCK.on = true; LOCK.buf = ''; LOCK.busy = false;
  document.documentElement.classList.add('locked'); lockInert(true);
  try { if (typeof closeModal === 'function' && modalCfg) closeModal(); } catch (_) { }
  lockRender(); clearInterval(LOCK.timer); LOCK.timer = setInterval(lockTick, 1000);
  if (c.bio && typeof lockBio === 'function') setTimeout(lockBio, 350);
}
function lockTick() {
  const f = failGet(), wait = Math.ceil((f.until - Date.now()) / 1000), m = $('#lock-msg'); if (!m) return;
  if (wait > 0) m.textContent = `Zu viele Versuche. Bitte ${wait} s warten.`; else if (f.n >= 5 && m.dataset.wait) { m.textContent = 'PIN eingeben'; delete m.dataset.wait; }
  if (wait > 0) m.dataset.wait = '1';
}
function lockRender(msg) {
  const c = pinCfg(), el = $('#lock'); if (!c || !el) return;
  const dots = Array.from({ length: c.n }, (_, i) => `<i class="${i < LOCK.buf.length ? 'on' : ''}"></i>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" data-act="pin-key" data-k="${k}" aria-label="${k === '⌫' ? 'Löschen' : k}">${k}</button>`).join('');
  const prevForgot = $('#lock-forgot') ? $('#lock-forgot').innerHTML : '';
  el.innerHTML = `<div class="lock-box"><div class="logo-mark">🌸</div><h2 class="cn" style="color:var(--jade-text)">Sakura &amp; Jade</h2><p class="sm muted" id="lock-msg">${esc(msg || 'PIN eingeben')}</p>
    <div class="pin-dots ${LOCK.shake ? 'shake' : ''}" aria-label="${LOCK.buf.length} von ${c.n} Ziffern">${dots}</div><div class="keypad">${keys}</div>
    ${c.bio && typeof bioAvail === 'function' && bioAvail() ? '<button type="button" class="btn btn-jade btn-sm" data-act="pin-bio">👆 Mit Fingerabdruck entsperren</button>' : ''}<button type="button" class="btn btn-ghost btn-sm" data-act="pin-forgot">PIN vergessen?</button><div id="lock-forgot">${prevForgot}</div></div>`;
  LOCK.shake = false; lockTick();
}
function lockOpen() { try { localStorage.removeItem('sj-pin-fail'); } catch (_) { } LOCK.on = false; LOCK.buf = ''; LOCK.busy = false; LOCK.unlockedAt = Date.now(); clearInterval(LOCK.timer); document.documentElement.classList.remove('locked'); lockInert(false); $('#lock').innerHTML = ''; }
async function lockSubmit() {
  const c = pinCfg(); if (!c || LOCK.busy) return; LOCK.busy = true;
  const f = failGet(); if (f.until > Date.now()) { LOCK.busy = false; LOCK.buf = ''; lockRender(); return; }
  const ok = pinHash(LOCK.buf, c.s) === c.h;
  if (ok) { lockOpen(); return; }
  f.n = (f.n || 0) + 1; if (f.n >= 5) f.until = Date.now() + Math.min(30 * 2 ** (f.n - 5), 900) * 1000; failSet(f);
  LOCK.buf = ''; LOCK.busy = false; LOCK.shake = true; try { navigator.vibrate && navigator.vibrate(200); } catch (_) { }
  lockRender(f.n >= 5 ? '' : `Falsche PIN (${f.n}/5)`);
}
A['pin-key'] = d => {
  const c = pinCfg(); if (!LOCK.on || !c || LOCK.busy) return;
  if (failGet().until > Date.now()) return;
  if (d.k === '⌫') LOCK.buf = LOCK.buf.slice(0, -1); else if (LOCK.buf.length < c.n) LOCK.buf += d.k;
  lockRender(); if (LOCK.buf.length === c.n) setTimeout(lockSubmit, 60);
};
A['pin-forgot'] = () => {
  $('#lock-forgot').innerHTML = `<div class="card" style="margin-top:12px;text-align:left"><p class="xs">Ohne PIN kommst du nur wieder hinein, wenn <b>alle Daten auf diesem Gerät gelöscht</b> werden. Danach kannst du ein Backup (.json) importieren.</p><button type="button" class="btn btn-danger btn-sm mt" data-act="pin-wipe">Alles löschen &amp; entsperren</button></div>`;
};
A['pin-wipe'] = async (d, el) => {
  if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = 'Ja, wirklich alles löschen'; return; }
  wiping = true; clearTimeout(saveT);
  try { localStorage.clear(); } catch (_) { }
  try { if (KV.db) KV.db.close(); await new Promise(r => { const q = indexedDB.deleteDatabase('sakura-jade'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); } catch (_) { }
  location.reload();
};
A['pin-now'] = () => lockShow();
document.addEventListener('keydown', e => {
  if (!LOCK.on) return;
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); A['pin-key']({ k: e.key }); }
  else if (e.key === 'Backspace') { e.preventDefault(); A['pin-key']({ k: '⌫' }); }
}, true);
document.addEventListener('visibilitychange', () => {
  const c = pinCfg(); if (!c) return;
  if (document.hidden) LOCK.hiddenAt = Date.now();
  else if (!LOCK.on && !LOCK.bioBusy && !(c.bio && Date.now() - (LOCK.unlockedAt || 0) < 2500) && c.lock >= 0 && LOCK.hiddenAt && Date.now() - LOCK.hiddenAt >= c.lock * 60000) lockShow();
});
function pinCard() {
  const c = pinCfg();
  return `<div class="card"><h3>🔒 App-Sperre (PIN)</h3>
    <p class="xs muted" style="margin:4px 0 10px">Hält neugierige Blicke fern, wenn jemand dein Handy oder deinen Laptop in die Hand nimmt. Das ist eine Bildschirmsperre, keine Verschlüsselung der gespeicherten Daten.</p>
    ${c ? `<p class="sm jade-t b">✓ PIN aktiv (${c.n} Stellen)</p>
      <label class="f mt">Automatisch sperren</label><select data-change="pin-lockmin">${LOCK_OPTS.map(([v, l]) => `<option value="${v}" ${v === c.lock ? 'selected' : ''}>${l}</option>`).join('')}</select>${typeof bioRow === 'function' ? bioRow(c) : ''}
      <div class="row wrap mt"><button class="btn btn-jade btn-sm" data-act="pin-now">🔒 Jetzt sperren</button><button class="btn btn-ghost btn-sm" data-act="pin-change">PIN ändern</button><button class="btn btn-danger btn-sm" data-act="pin-off">PIN entfernen</button></div>`
    : `<button class="btn btn-jade btn-sm" data-act="pin-set">PIN festlegen</button>`}
    <p class="xs muted mt">Die PIN liegt nur auf diesem Gerät und ist nicht im Backup. Nach 5 falschen Versuchen wird gewartet. PIN vergessen? Dann hilft nur Löschen auf dem Sperrbildschirm – mach regelmäßig ein Backup.</p></div>`;
}
A['pin-lockmin'] = (d, el) => { const c = pinCfg(); if (c) { c.lock = +el.value; pinSave(c); } };
const pinField = (name, label) => `<div><label class="f">${label}</label><input type="password" name="${name}" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" style="letter-spacing:6px;font-size:18px"></div>`;
function openPinForm(mode) {
  const c = pinCfg(), needOld = mode !== 'set';
  openModal({
    title: mode === 'set' ? '🔒 PIN festlegen' : mode === 'change' ? 'PIN ändern' : 'PIN entfernen', okText: mode === 'off' ? 'Entfernen' : 'Speichern',
    body: `<div class="form-grid">${needOld ? `<div class="full">${pinField('cur', 'Aktuelle PIN')}</div>` : ''}${mode !== 'off' ? `<div>${pinField('p1', 'Neue PIN (4–6 Ziffern)')}</div><div>${pinField('p2', 'Wiederholen')}</div>` : ''}</div>`,
    onOk: f => {
      if (needOld && pinHash(f.cur.value, c.s) !== c.h) { toast('Aktuelle PIN stimmt nicht.'); return false; }
      if (mode === 'off') { pinSave(null); closeModal(); render(); toast('PIN entfernt'); return false; }
      const p = f.p1.value;
      if (!/^\d{4,6}$/.test(p)) { toast('Die PIN braucht 4 bis 6 Ziffern.'); return false; }
      if (p !== f.p2.value) { toast('Die beiden PINs sind verschieden.'); return false; }
      const s = uid() + uid(); pinSave({ s, h: pinHash(p, s), n: p.length, lock: c ? c.lock : 1 }); closeModal(); render(); toast('PIN gespeichert 🔒'); return false;
    }
  });
}
A['pin-set'] = () => openPinForm('set'); A['pin-change'] = () => openPinForm('change'); A['pin-off'] = () => openPinForm('off');
function lockInit() { lockSync(); $('#btn-lock').addEventListener('click', () => lockShow()); if (pinCfg()) lockShow(); else document.documentElement.classList.remove('locked'); }

/* =====================  NATIVE APP (Capacitor / Android)  ===================== */
const IS_NATIVE = !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
/* Native Plugins direkt über die Capacitor-Brücke ansprechen (ohne Bundler) */
const NP = n => {
  const C = window.Capacitor; if (!C || typeof C.nativePromise !== 'function' || !(C.PluginHeaders || []).some(h => h.name === n)) return null;
  return new Proxy({}, { get: (_, m) => m === 'then' ? undefined : o => C.nativePromise(n, String(m), o || {}) });
};
/* Dateien (Backup, CSV) lassen sich in der App nicht per Download-Link speichern: über das Teilen-Menü anbieten */
function nativeSave(name, text, b64) {
  const FS = NP('Filesystem'), SH = NP('Share'); if (!FS || !SH) return false;
  FS.writeFile(b64 ? { path: name, data: text, directory: 'CACHE' } : { path: name, data: text, directory: 'CACHE', encoding: 'utf8' })
    .then(r => SH.share({ title: name, url: r.uri, dialogTitle: 'Speichern oder teilen' }))
    .catch(e => { if (!/cancel/i.test(String(e && (e.message || e)))) toast('Speichern fehlgeschlagen.'); });
  return true;
}
/* Erinnerungen vor Terminen/Schichten der nächsten 7 Tage (echte Systembenachrichtigungen, auch bei geschlossener App) */
let nsT = null;
function nativeRemind() { if (!IS_NATIVE || !S || !S.settings.nativeRemind) return; clearTimeout(nsT); nsT = setTimeout(nativeSchedule, 4000); }
const idHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2147483000 + 1; };
async function nativeSchedule() {
  const LN = NP('LocalNotifications'); if (!LN || !S.settings.nativeRemind) return;
  try {
    const perm = await LN.checkPermissions(); if (perm.display !== 'granted') return;
    const pend = await LN.getPending(); if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
    const lead = S.settings.remindLead ?? 15, now = Date.now(), list = [];
    for (let i = 0; i < 7; i++) {
      const d = addKey(today(), i);
      eventsOn(d).filter(e => e.kind === 'event' && e.start).forEach(e => {
        const at = new Date(parseD(d).getTime() + (toMin(e.start) - lead) * 60000);
        if (at.getTime() > now) list.push({ id: idHash(d + e.id), title: (e.type === 'work' ? '💼 ' : '📌 ') + e.title, body: `Beginn ${e.start} Uhr${lead ? ` (in ${lead} Min)` : ''}`, schedule: { at: at.toISOString(), allowWhileIdle: true } });
      });
    }
    if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
  } catch (_) { }
}
A['native-remind'] = async (d, el) => {
  const LN = NP('LocalNotifications');
  if (el.checked) { try { const r = await LN.requestPermissions(); if (r.display !== 'granted') { el.checked = false; toast('Benachrichtigungen sind in den Android-Einstellungen ausgeschaltet.'); return; } } catch (_) { el.checked = false; return; } }
  S.settings.nativeRemind = el.checked; save();
  if (el.checked) { nativeSchedule(); toast('Erinnerungen aktiv 🔔'); } else { try { const p = await LN.getPending(); if (p.notifications.length) await LN.cancel({ notifications: p.notifications.map(n => ({ id: n.id })) }); } catch (_) { } }
};
A['native-lead'] = (d, el) => { S.settings.remindLead = +el.value; save(); nativeSchedule(); };
function nativeCard() {
  if (!IS_NATIVE) return '';
  return `<div class="card"><h3>📱 Android-App</h3>
    <label class="row mt" style="cursor:pointer"><input type="checkbox" ${S.settings.nativeRemind ? 'checked' : ''} data-change="native-remind"> <span class="sm">🔔 Erinnerung vor Terminen &amp; Schichten (nächste 7 Tage)</span></label>
    <label class="f mt">Vorlauf</label><select data-change="native-lead">${[0, 5, 15, 30, 60].map(v => `<option value="${v}" ${(S.settings.remindLead ?? 15) === v ? 'selected' : ''}>${v ? v + ' Minuten vorher' : 'Zum Beginn'}</option>`).join('')}</select>
    ${NP('WidgetBridge') ? '<p class="xs muted mt">🧩 <b>Widget:</b> Homescreen lange antippen → Widgets → „Sakura &amp; Jade“. Es zeigt Streak, Lernfortschritt, nächsten Termin und offene Aufgaben (aktualisiert sich alle 30 Min und wenn du die App verlässt).</p>' : ''}
    <p class="xs muted mt">Backups und CSV-Dateien öffnen das Teilen-Menü von Android: dort wählst du „In Dateien speichern“, Drive, Mail usw.</p></div>`;
}


/* =====================  INDIVIDUALISIERUNG: Farben · Menü · Autopilot  ===================== */
const PALETTES = {
  sakura: { n: 'Sakura & Jade', pink: '#F4A6B7', jade: '#3B7A57', gold: '#D4A017' },
  mohn: { n: 'Kaiserrot', pink: '#F4A6B7', jade: '#B3363A', gold: '#D4A017' },
  pflaume: { n: 'Pflaume', pink: '#D9A8E0', jade: '#6D4C9F', gold: '#D4A017' },
  ozean: { n: 'Ozean', pink: '#9CCBEA', jade: '#2F6F8F', gold: '#E0B04A' },
  bambus: { n: 'Bambus', pink: '#F2B8A0', jade: '#5E8C3A', gold: '#C9A227' },
  tusche: { n: 'Tusche', pink: '#BDB6AA', jade: '#3F4C57', gold: '#C9A24A' }
};
const BG_TONES = {
  warm: { n: 'Warm', light: {}, dark: {} },
  kuehl: {
    n: 'Kühl',
    light: { '--bg': '#F2F5F7', '--surface': '#FFFFFF', '--surface2': '#F7F9FA', '--border': '#E0E6EA', '--text': '#1F2A30', '--muted': '#5F6C74', '--faint': '#8E9AA2' },
    dark: { '--bg': '#0F151B', '--surface': '#17202A', '--surface2': '#1E2933', '--border': '#2B3845', '--text': '#E6EBEF', '--muted': '#9FACB7', '--faint': '#7B8893' }
  },
  rein: {
    n: 'Neutral',
    light: { '--bg': '#F5F5F5', '--surface': '#FFFFFF', '--surface2': '#FAFAFA', '--border': '#E4E4E4', '--text': '#222222', '--muted': '#666666', '--faint': '#8F8F8F' },
    dark: { '--bg': '#121212', '--surface': '#1C1C1C', '--surface2': '#242424', '--border': '#333333', '--text': '#EAEAEA', '--muted': '#A8A8A8', '--faint': '#7F7F7F' }
  }
};
const UI_SCALES = [90, 100, 110, 125];
const hex2hsl = h => {
  const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: hh * 60, s, l };
};
const hsl2hex = (h, s, l) => {
  s = clamp(s, 0, 1); l = clamp(l, 0, 1); const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
const lumOf = h => { const n = parseInt(h.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const hex2rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

function palColors() { const s = S.settings; return s.palette === 'custom' ? { ...PALETTES.sakura, ...(s.custom || {}) } : (PALETTES[s.palette] || PALETTES.sakura); }
function palMaps() {
  const s = S.settings, P = palColors(), out = { light: {}, dark: {} };
  if (s.palette && s.palette !== 'sakura') {
    [['jade', P.jade], ['pink', P.pink], ['gold', P.gold]].forEach(([nm, hx]) => {
      const c = hex2hsl(hx), L = out.light, D = out.dark;
      let l0 = c.l; if (nm === 'jade') while (contrast('#FFFFFF', hsl2hex(c.h, c.s, l0)) < 4.5 && l0 > .16) l0 -= .02; // weiße Schrift auf der Hauptfarbe muss lesbar bleiben
      L[`--${nm}`] = nm === 'jade' ? hsl2hex(c.h, c.s, l0) : hx; L[`--${nm}-hover`] = hsl2hex(c.h, c.s, clamp(l0 - .16, .1, .9)); L[`--${nm}-text`] = hsl2hex(c.h, Math.max(c.s * .9, .3), clamp(c.l * .58, .2, .36));
      L[`--${nm}-soft`] = hsl2hex(c.h, clamp(c.s, .25, .9), .95); L[`--${nm}-border`] = hsl2hex(c.h, clamp(c.s * .8, .2, .8), .78);
      let m = clamp(c.l, .4, .62); if (nm === 'jade') while (contrast('#FFFFFF', hsl2hex(c.h, c.s * .85, m)) < 4.5 && m > .16) m -= .02; D[`--${nm}`] = hsl2hex(c.h, c.s * .85, m); D[`--${nm}-hover`] = hsl2hex(c.h, c.s * .85, m + .1); D[`--${nm}-text`] = hsl2hex(c.h, clamp(c.s, .35, .75), .72);
      D[`--${nm}-soft`] = hsl2hex(c.h, clamp(c.s * .4, .1, .4), .13); D[`--${nm}-border`] = hsl2hex(c.h, clamp(c.s * .4, .1, .4), .25);
    });
    const k = hex2hsl(P.pink), L = out.light, D = out.dark;
    L['--lv1'] = hsl2hex(k.h, clamp(k.s, .3, .9), .9); L['--lv2'] = P.pink; L['--lv3'] = hsl2hex(k.h, k.s, clamp(k.l - .1, .2, .8)); L['--lv4'] = L['--pink-text'];
    D['--lv1'] = hsl2hex(k.h, .22, .25); D['--lv2'] = hsl2hex(k.h, .35, .42); D['--lv3'] = hsl2hex(k.h, .45, .55); D['--lv4'] = D['--pink-text'];
    L['--shadow'] = `0 4px 20px -2px ${hex2rgba(P.jade, .08)}`; L['--shadow-hover'] = `0 10px 25px -4px ${hex2rgba(P.pink, .3)}`;
    D['--shadow-hover'] = `0 10px 25px -4px ${hex2rgba(D['--pink'], .18)}`;
  }
  const tone = BG_TONES[s.bgTone] || BG_TONES.warm; Object.assign(out.light, tone.light); Object.assign(out.dark, tone.dark);
  return out;
}
let PAL_KEYS = [];
function applyPalette() {
  if (!S) return; const root = document.documentElement, s = S.settings;
  PAL_KEYS.forEach(k => root.style.removeProperty(k)); PAL_KEYS = [];
  const maps = palMaps(), cur = resolvedTheme() === 'dark' ? maps.dark : maps.light;
  Object.entries(cur).forEach(([k, v]) => { root.style.setProperty(k, v); PAL_KEYS.push(k); });
  const z = UI_SCALES.includes(s.uiScale) ? s.uiScale : 100; root.style.zoom = z === 100 ? '' : String(z / 100);
  const m = $('#theme-color'); if (m && s.palette !== 'sakura') m.content = (resolvedTheme() === 'dark' ? maps.dark['--bg'] : maps.light['--bg']) || m.content;
  try { localStorage.setItem('sj-pal', JSON.stringify({ light: maps.light, dark: maps.dark, z: z === 100 ? 0 : z })); } catch (_) { }
}
const autoOn = k => !(S.settings.auto && S.settings.auto[k] === false);
const dashOn = k => !(S.settings.dashHide && S.settings.dashHide[k]);
const DASH_WIDGETS = [['review', '📝 Wochenrückblick-Hinweis'], ['sugg', '💡 Lernblock-Vorschläge'], ['lang', '🈶 Sprachen'], ['checkin', '😴 Check-in'], ['wgoals', '🎯 Wochenziele'], ['worklead', '💼 Arbeits-Erinnerung'], ['exp', '💰 Ausgaben'], ['pack', '🎒 Packliste'], ['heat', '🌸 Habit-Grid'], ['chart', '📊 Lernzeit-Diagramm']];
const AUTO_ITEMS = [
  ['sugg', '💡 Lernblock-Vorschläge', 'Schlägt freie Zeitfenster zum Lernen vor – du bestätigst nur.'],
  ['replan', '🗓 Lernplan automatisch anpassen', 'Verschiebt verpasste Kapitel von selbst und rechnet rückwärts neu.'],
  ['deload', '🍃 Deload-Hinweise', 'Empfiehlt eine Entlastungswoche, wenn Schlaf und Erschöpfung es nahelegen.'],
  ['cele', '🏅 Erfolgs-Feier', 'Feierfenster bei neuen Siegeln und Streaks (gesammelt werden sie immer).'],
  ['worklead', '💼 Arbeit rechtzeitig eintragen', 'Erinnert dich, Schichten mindestens 2 Wochen im Voraus einzutragen.'],
  ['review', '📝 Wochenrückblick-Hinweis', 'Erinnert am Wochenende an deinen Rückblick.'],
  ['backup', '💾 Backup-Erinnerung', 'Meldet sich, wenn dein letztes Backup älter als 2 Wochen ist.']
];

/* ---- Menü: Reihenfolge und Sichtbarkeit ---- */
function navList() {
  const o = S.settings.navOrder || [], idx = k => { const i = o.indexOf(k); return i < 0 ? 1000 + NAV.findIndex(n => n[0] === k) : i; };
  return [...NAV].sort((a, b) => idx(a[0]) - idx(b[0]));
}
const navHidden = k => k !== 'today' && k !== 'settings' && (S.settings.navHide || []).includes(k);
const navVisible = () => navList().filter(n => !navHidden(n[0]));
function bnavKeys() {
  const vis = navVisible().map(n => n[0]).filter(k => k !== 'settings');
  if (!(S.settings.navOrder || []).length) { const keys = BNAV.filter(k => vis.includes(k)); for (const k of vis) { if (keys.length >= 4) break; if (!keys.includes(k)) keys.push(k); } return keys; }
  return vis.slice(0, 4);
}

/* ---- Einstellungen: Karten ---- */
const palSwatch = p => `<i><b style="background:${p.jade}"></b><b style="background:${p.pink}"></b><b style="background:${p.gold}"></b></i>`;
function lookCard() {
  const s = S.settings, th = s.theme, cur = s.palette || 'sakura', cu = { ...PALETTES.sakura, ...(s.custom || {}) };
  return `<div class="card"><h3>🎨 Darstellung &amp; Farben</h3>
    <div class="seg mt">${[['light', '☀️ Hell'], ['dark', '🌙 Dunkel'], ['auto', '🖥 Auto']].map(([k, l]) => `<button type="button" class="${th === k ? 'on' : ''}" data-act="theme-set" data-t="${k}">${l}</button>`).join('')}</div>
    <label class="f mt2">Farbwelt</label>
    <div class="pal-grid">${Object.entries(PALETTES).map(([k, p]) => `<button type="button" class="pal ${cur === k ? 'on' : ''}" data-act="pal-set" data-k="${k}">${palSwatch(p)}${p.n}</button>`).join('')}<button type="button" class="pal ${cur === 'custom' ? 'on' : ''}" data-act="pal-set" data-k="custom">${palSwatch(cu)}Eigene</button></div>
    ${cur === 'custom' ? `<div class="row wrap mt" style="gap:16px">${[['jade', 'Hauptfarbe'], ['pink', 'Akzent'], ['gold', 'Gold']].map(([k, l]) => `<label class="row xs b"><input type="color" value="${cu[k]}" data-input="pal-custom" data-k="${k}" aria-label="${l}"> ${l}</label>`).join('')}</div><p class="xs muted mt">Die App leitet Hell-/Dunkelmodus, Schatten und Kontraste automatisch aus deinen drei Farben ab.</p>` : ''}
    <label class="f mt2">Hintergrundton</label><div class="seg">${Object.entries(BG_TONES).map(([k, t]) => `<button type="button" class="${(s.bgTone || 'warm') === k ? 'on' : ''}" data-act="bg-set" data-k="${k}">${t.n}</button>`).join('')}</div>
    <label class="f mt2">Größe der Oberfläche</label><div class="seg">${UI_SCALES.map(z => `<button type="button" class="${(s.uiScale || 100) === z ? 'on' : ''}" data-act="ui-scale" data-z="${z}">${z} %</button>`).join('')}</div>
    <label class="f mt2">Dein Name (für die Begrüßung)</label><input type="text" maxlength="24" value="${esc(s.userName || '')}" placeholder="optional" data-change="set-name">
    <label class="row mt2" style="cursor:pointer"><input type="checkbox" ${s.petals ? 'checked' : ''} data-change="set-petals"> <span class="sm">🌸 Blütenregen im Hintergrund</span></label>
    <button class="btn btn-ghost btn-sm mt" data-act="look-reset">Darstellung auf Standard zurücksetzen</button></div>`;
}
A['pal-set'] = d => { const s = S.settings; if (d.k === 'custom' && !s.custom) s.custom = { ...palColors() }; s.palette = d.k; applyPalette(); persist(); render(); };
A['pal-custom'] = (d, el) => { const s = S.settings; s.custom = { ...PALETTES.sakura, ...(s.custom || {}), [d.k]: el.value }; applyPalette(); save(); };
A['bg-set'] = d => { S.settings.bgTone = d.k; applyPalette(); persist(); render(); };
A['ui-scale'] = d => { S.settings.uiScale = +d.z; applyPalette(); persist(); render(); };
A['set-name'] = (d, el) => { S.settings.userName = el.value.trim().slice(0, 24); save(); };
A['look-reset'] = () => { Object.assign(S.settings, { palette: 'sakura', bgTone: 'warm', uiScale: 100 }); applyPalette(); persist(); render(); toast('Darstellung zurückgesetzt'); };

function menuCard() {
  const list = navList(), hide = S.settings.navHide || [];
  return `<div class="card"><h3>🧭 Menü &amp; Startseite</h3>
    <p class="xs muted" style="margin:4px 0 10px">Blende aus, was du nicht brauchst, und sortiere um. Ausgeblendete Bereiche arbeiten im Hintergrund weiter, nichts geht verloren.</p>
    <div class="stack">${list.map((n, i) => `<div class="navrow"><input type="checkbox" ${hide.includes(n[0]) ? '' : 'checked'} ${n[0] === 'today' || n[0] === 'settings' ? 'disabled' : ''} data-change="nav-vis" data-k="${n[0]}" aria-label="${n[2]} anzeigen"><span>${n[1]}</span><span class="t sm">${n[2]}</span><button class="btn btn-ghost btn-sm" ${i === 0 ? 'disabled' : ''} data-act="nav-move" data-k="${n[0]}" data-d="-1" aria-label="Nach oben">▲</button><button class="btn btn-ghost btn-sm" ${i === list.length - 1 ? 'disabled' : ''} data-act="nav-move" data-k="${n[0]}" data-d="1" aria-label="Nach unten">▼</button></div>`).join('')}</div>
    <label class="f mt2">Karten auf der Startseite</label>
    <div class="row wrap">${DASH_WIDGETS.map(([k, l]) => `<label class="chip c-gray" style="cursor:pointer"><input type="checkbox" ${dashOn(k) ? 'checked' : ''} data-change="dash-vis" data-k="${k}"> ${l}</label>`).join('')}</div>
    <button class="btn btn-ghost btn-sm mt" data-act="menu-reset">Menü zurücksetzen</button></div>`;
}
A['nav-vis'] = (d, el) => { const h = new Set(S.settings.navHide || []); if (el.checked) h.delete(d.k); else h.add(d.k); S.settings.navHide = [...h]; save(); render(); };
A['nav-move'] = d => {
  const keys = navList().map(n => n[0]), i = keys.indexOf(d.k), j = i + +d.d; if (i < 0 || j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]]; S.settings.navOrder = keys; save(); render();
};
A['dash-vis'] = (d, el) => { S.settings.dashHide = { ...(S.settings.dashHide || {}), [d.k]: !el.checked }; save(); };
A['menu-reset'] = () => { S.settings.navOrder = []; S.settings.navHide = []; S.settings.dashHide = {}; save(); render(); toast('Menü zurückgesetzt'); };

function autoCard() {
  return `<div class="card"><h3>🤖 Autopilot</h3>
    <p class="xs muted" style="margin:4px 0 10px">Was die App von selbst für dich erledigt. Standardmäßig ist alles an: sie plant, erinnert und passt sich an, du bestätigst nur. Schalte einzeln ab, was dich stört.</p>
    <div class="stack">${AUTO_ITEMS.map(([k, l, desc]) => { const on = k === 'replan' ? S.settings.autoReplan : autoOn(k); return `<label class="navrow" style="cursor:pointer"><input type="checkbox" ${on ? 'checked' : ''} data-change="auto-set" data-k="${k}"><span class="t"><b class="sm">${l}</b><div class="xs muted">${desc}</div></span></label>`; }).join('')}</div></div>`;
}
A['auto-set'] = (d, el) => {
  if (d.k === 'replan') { S.settings.autoReplan = el.checked; save(); if (el.checked && autoReplan()) render(); return; }
  S.settings.auto = { ...(S.settings.auto || {}), [d.k]: el.checked }; save(); if (d.k !== 'cele') render();
};


/* =====================  WOCHENZIELE · SEMESTER · WOCHENPLAN · JAHRESRÜCKBLICK  ===================== */
const isoWeek = k => { const d = parseD(k); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7); };
const weekLabel = ws => `KW ${isoWeek(ws)} · ${fmtShort(ws)}–${fmtShort(addKey(ws, 6))}`;
const evIcon = e => e.kind === 'plan' ? '📘' : e.kind === 'task' ? '⏰' : e.kind === 'train' ? '🥋' : ({ lecture: '🎓', work: '💼', study: '📖', wushu: '🥋', other: '📌' })[e.type] || '📌';
const overlap = (a, b) => a[0] < b[1] && b[0] < a[1];

/* ---- Wochenziele ---- */
const WG_DEF = { study: 10, work: 0, train: null, lang: null, spend: 0 };
const wg = () => ({ ...WG_DEF, ...(S.settings.wg || {}) });
function wgTargets() {
  const g = wg(), langs = S.modules.filter(m => m.kind === 'lang' && m.dailyMin > 0), autoLang = langs.reduce((a, m) => a + m.dailyMin * 7, 0);
  const autoTrain = WUSHU_DATA.week.filter(w => w.load !== 'LEICHT').length;
  return { study: +g.study || 0, work: +g.work || 0, train: g.train === null || g.train === '' || g.train === undefined ? autoTrain : +g.train || 0, lang: g.lang === null || g.lang === '' || g.lang === undefined ? autoLang : +g.lang || 0, spend: +g.spend || 0, autoTrain, autoLang };
}
function wgProgress(ws) {
  const days = weekDays(ws), t = today(), T = wgTargets(), inW = d => days.includes(d), now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const langIds = new Set(S.modules.filter(m => m.kind === 'lang').map(m => m.id));
  let study = 0, lang = 0; S.sessions.forEach(s => { if (!inW(s.date)) return; if (langIds.has(s.moduleId)) lang += s.sec / 60; else study += s.sec / 60; });
  const work = days.reduce((a, d) => a + workMinOn(d), 0), th = S.habits.find(x => x.id === 'h-train');
  const train = days.filter(d => th && habitDone(d, th)).length;
  const spend = S.expenses.filter(e => e.rec !== 'monthly' && inW(e.date)).reduce((a, e) => a + e.amt, 0) / 100;
  let pS = 0, pL = 0, pW = 0, pT = 0;
  days.filter(d => d >= t).forEach(d => {
    eventsOn(d).forEach(e => {
      if (e.kind !== 'event' || !e.start) return;
      if (e.type === 'study' && !(d === t && toMin(e.start) < nowMin)) { if (langIds.has(e.modId)) pL += evMin(e); else pS += evMin(e); }
      if (e.type === 'work' && e.end && !S.workLog[wkKey(d, e.id)]) pW += planMinOf(e);
    });
    const tr = WUSHU_DATA.week[dow(parseD(d))]; if (tr && tr.load !== 'LEICHT' && !(th && habitDone(d, th))) pT++;
  });
  const frac = ws === weekStart(t) ? (dow(parseD(t)) + 1) / 7 : ws < weekStart(t) ? 1 : 0;
  return { frac, study: { done: study / 60, plan: pS / 60, target: T.study, unit: 'h' }, work: { done: work / 60, plan: pW / 60, target: T.work, unit: 'h' }, train: { done: train, plan: pT, target: T.train, unit: '×' }, lang: { done: lang, plan: pL, target: T.lang, unit: 'Min' }, spend: { done: spend, plan: 0, target: T.spend, unit: '€', max: true } };
}
const WG_ROWS = [['study', '📖 Lernen', 'gold'], ['work', '💼 Arbeit', ''], ['train', '🥋 Training', 'pink'], ['lang', '🈶 Sprachen', 'pink'], ['spend', '💰 Ausgaben', 'gold']];
const wgFmt = (k, v) => k === 'spend' ? fmtEur(Math.round(v * 100)) : k === 'train' ? String(Math.round(v)) : k === 'lang' ? String(Math.round(v)) : fmtNum(v);
function wgStatus(k, p, frac) {
  if (p.max) return p.done > p.target ? ['red-t', '⚠ über dem Limit'] : ['jade-t', 'im Limit'];
  if (p.done >= p.target) return ['jade-t', '✓ geschafft'];
  if (p.done + p.plan >= p.target) return ['gold-t', 'mit Plan erreichbar'];
  if (frac > 0 && p.done < p.target * frac - p.target * .1) return ['pink-t', 'hinter dem Plan'];
  return ['muted', frac === 0 ? 'noch nicht gestartet' : 'im Plan'];
}
function wgRows(ws) {
  const P = wgProgress(ws), rows = WG_ROWS.filter(([k]) => P[k].target > 0);
  return rows.map(([k, label, col]) => {
    const p = P[k], pct = 100 * Math.min(1, p.done / p.target), [cls, txt] = wgStatus(k, p, P.frac);
    return `<div><div class="row between"><span class="sm b">${label}</span><span class="sm"><b>${wgFmt(k, p.done)}</b> / ${wgFmt(k, p.target)} ${p.unit === '€' ? '' : p.unit}${p.plan > 0 ? ` <span class="xs muted">· +${wgFmt(k, p.plan)} geplant</span>` : ''}</span></div>
      <div class="bar ${p.max && p.done > p.target ? 'red' : col}" style="margin:5px 0 2px"><i style="width:${pct}%"></i>${p.max || P.frac === 0 || P.frac === 1 ? '' : `<span class="pace-mark" style="left:${P.frac * 100}%"></span>`}</div><div class="xs ${cls}">${txt}</div></div>`;
  }).join('');
}
function wgCard(ws) {
  const rows = wgRows(ws);
  return `<div class="card"><div class="row between"><h3>🎯 Wochenziele</h3><button class="link" data-act="go" data-view="plan">Wochenplan →</button></div>${rows ? `<div class="stack mt">${rows}</div>` : '<div class="empty">Noch keine Ziele. Lege sie im Wochenplan fest.</div>'}</div>`;
}
A['wg-set'] = (d, el) => {
  const v = el.value.trim().replace(',', '.'), g = { ...(S.settings.wg || {}) };
  g[d.k] = v === '' ? (d.k === 'train' || d.k === 'lang' ? null : 0) : Math.max(0, parseFloat(v) || 0);
  S.settings.wg = g; save(); setTimeout(render, 0);
};

/* ---- Semester & fester Stundenplan ---- */
const lectures = () => S.events.filter(e => e.type === 'lecture' && e.repeat === 'weekly');
function semCard() {
  const sem = S.settings.semester || {}, lec = lectures().sort((a, b) => dow(parseD(a.date)) - dow(parseD(b.date)) || (a.start || '').localeCompare(b.start || '')), end = sem.to ? diffDays(today(), sem.to) : null;
  return `<div class="card"><h3>🎓 Semester &amp; Stundenplan</h3>
    <p class="xs muted" style="margin:4px 0 10px">Deine Vorlesungen gelten fest für das ganze Semester: einmal eintragen, sie wiederholen sich bis zum Semesterende. Der Wochenplan plant Lernzeit und Arbeit immer um sie herum.</p>
    <div class="form-grid"><div><label class="f">Semesterbeginn</label><input type="date" value="${esc(sem.from || '')}" data-change="sem-set" data-k="from"></div><div><label class="f">Semesterende</label><input type="date" value="${esc(sem.to || '')}" data-change="sem-set" data-k="to"></div>
      <div class="full"><label class="f">Arbeitsplan mindestens … Tage im Voraus eintragen (Erinnerung)</label><input type="number" min="0" max="60" value="${S.settings.workLead ?? 14}" data-change="set-num0" data-k="workLead"></div></div>
    ${end !== null ? `<p class="xs ${end < 0 ? 'faint' : end <= 21 ? 'pink-t b' : 'muted'} mt">${end < 0 ? 'Das Semester ist zu Ende.' : end === 0 ? 'Heute ist der letzte Semestertag.' : `Noch ${end} Tage bis zum Semesterende.`}</p>` : ''}
    <div class="stack mt">${lec.map(e => `<div class="item" data-act="ev-edit" data-id="${e.id}" style="cursor:pointer"><span class="chip c-jade">${DAYS[dow(parseD(e.date))]}</span><span class="t">${esc(e.title)} <span class="xs muted">${esc(e.start || '')}–${esc(e.end || '')}${e.until ? ' · bis ' + fmtShort(e.until) : ''}</span></span><span class="xs faint">🔒 fix</span></div>`).join('') || '<div class="empty">Noch keine Vorlesungen. Mit „+ Vorlesung“ eintragen.</div>'}</div>
    <div class="row wrap mt"><button class="btn btn-jade btn-sm" data-act="lec-add">+ Vorlesung</button><button class="btn btn-ghost btn-sm" data-act="sem-apply" ${sem.to && lec.length ? '' : 'disabled'}>Semesterende auf alle anwenden</button><button class="btn btn-ghost btn-sm" data-act="sem-copy" ${lec.length ? '' : 'disabled'}>Neues Semester: Plan übernehmen</button></div></div>`;
}
A['set-num0'] = (d, el) => { S.settings[d.k] = clamp(parseInt(el.value, 10) || 0, 0, 60); save(); };
A['sem-set'] = (d, el) => { S.settings.semester = { ...(S.settings.semester || {}), [d.k]: el.value }; save(); setTimeout(render, 0); };
A['ev-edit'] = d => openEventForm(d.id);
A['lec-add'] = () => openEventForm(null, today(), 'lecture');
A['sem-apply'] = () => { const to = (S.settings.semester || {}).to; if (!to) return; lectures().forEach(e => { e.until = to; e.u = Date.now(); }); save(); render(); toast(`Alle Vorlesungen laufen bis ${fmtShort(to)} ✓`); };
A['sem-copy'] = () => {
  const old = S.settings.semester || {}, nf = old.to ? addKey(old.to, 1) : today(), nt = addKey(nf, 125);
  openModal({
    title: 'Stundenplan ins neue Semester übernehmen', okText: 'Übernehmen',
    body: `<p class="xs muted" style="margin-bottom:10px">Kopiert alle ${lectures().length} wöchentlichen Vorlesungen auf die gleichen Wochentage und Zeiten. Du kannst sie danach einzeln anpassen.</p><div class="form-grid"><div><label class="f">Beginn</label><input type="date" name="from" value="${nf}" required></div><div><label class="f">Ende</label><input type="date" name="to" value="${nt}" required></div></div>`,
    onOk: f => {
      const from = f.from.value, to = f.to.value; if (!from || !to || to < from) { toast('Bitte Beginn und Ende prüfen.'); return false; }
      const src = lectures(); src.forEach(e => { const wd = dow(parseD(e.date)); let d = from; while (dow(parseD(d)) !== wd) d = addKey(d, 1); S.events.push({ ...e, id: uid(), date: d, until: to, u: Date.now() }); });
      S.settings.semester = { from, to }; save(); render(); toast(`${src.length} Vorlesungen übernommen ✓`);
    }
  });
};
function semHint() {
  const sem = S.settings.semester || {}; if (!sem.to || !lectures().length) return '';
  const left = diffDays(today(), sem.to); if (left < 0 || left > 21) return '';
  return `<div class="card hero accent-gold row between wrap"><div><h3>🎓 Das Semester endet in ${left} Tagen</h3><p class="xs muted">Danach hast du mehr Zeit zum Lernen. Neues Semester schon planen?</p></div><button class="btn btn-gold btn-sm" data-act="sem-copy">Stundenplan übernehmen</button></div>`;
}

/* ---- Arbeit rechtzeitig eintragen ---- */
const hasWorkEver = () => S.events.some(e => e.type === 'work') || Object.keys(S.workLog).length > 0;
function workLeadWeeks() {
  const lead = S.settings.workLead ?? 14; if (!hasWorkEver() || lead <= 0) return [];
  const t = today(), end = addKey(t, lead - 1), out = [], nw = S.noWork || {};
  for (let ws = weekStart(t); ws <= end; ws = addKey(ws, 7)) {
    if (!weekDays(ws).some(d => d >= t && d <= end) || nw[ws]) continue;
    if (!weekDays(ws).some(d => eventsOn(d).some(e => e.kind === 'event' && e.type === 'work'))) out.push(ws);
  }
  return out;
}
function workLeadCard() {
  const w = workLeadWeeks(); if (!w.length) return '';
  return `<div class="card hero accent-gold"><h3>💼 Arbeit der nächsten ${S.settings.workLead ?? 14} Tage eintragen</h3><p class="xs muted" style="margin:3px 0 10px">Für diese Wochen fehlt noch eine Schicht. So kann der Wochenplan Lernzeit und Training darum herum legen.</p>
    <div class="stack">${w.map(ws => `<div class="item"><span class="t b sm">${weekLabel(ws)}</span><button class="btn btn-jade btn-sm" data-act="wl-add" data-ws="${ws}">+ Schicht</button><button class="btn btn-ghost btn-sm" data-act="wl-none" data-ws="${ws}">Keine Arbeit</button></div>`).join('')}</div></div>`;
}
A['wl-add'] = d => { const t = today(), first = weekDays(d.ws).find(x => x >= t) || d.ws; openEventForm(null, first, 'work'); };
A['wl-none'] = d => { S.noWork = { ...(S.noWork || {}), [d.ws]: true }; save(); render(); };

/* ---- Überschneidungen ---- */
function conflictsOn(date) {
  const out = [], s = S.settings, evs = eventsOn(date).filter(e => e.kind === 'event' && e.start && e.end), tw = [toMin(s.trainFrom), toMin(s.trainTo)];
  for (let i = 0; i < evs.length; i++) for (let j = i + 1; j < evs.length; j++) {
    const a = evs[i], b = evs[j]; if (a.type === 'study' || b.type === 'study') continue;
    if (overlap([toMin(a.start), toMin(a.end)], [toMin(b.start), toMin(b.end)])) out.push(`${esc(a.title)} und ${esc(b.title)} überschneiden sich`);
  }
  if (!evs.some(e => e.type === 'wushu')) evs.filter(e => e.type === 'work' || e.type === 'lecture').forEach(e => { if (overlap([toMin(e.start), toMin(e.end)], tw)) out.push(`${esc(e.title)} (bis ${esc(e.end)}) liegt in deiner Trainingszeit ${s.trainFrom}–${s.trainTo}`); });
  return out;
}

/* ---- Wochenplan-Assistent ---- */
function examRank() {
  const t = today(), sc = m => { const pc = paceInfo(m); return 10 / Math.max(1, diffDays(t, m.exam)) + (pc ? Math.max(0, -pc.diff / 3600) * .5 : 0) + overdueCount(m); };
  return S.modules.filter(m => m.exam && m.exam >= t && m.kind !== 'lang').sort((a, b) => sc(b) - sc(a));
}
function weekPlan(ws) {
  const t = today(), days = weekDays(ws).filter(d => d >= t), bm = S.settings.blockMin || 50, T = wgTargets(), P = wgProgress(ws), items = [], notes = [];
  const slots = {}, load = {}, cnt = {}, nb = {}; days.forEach(d => { slots[d] = freeSlots(d).map(x => [...x]); load[d] = secOn(d) / 60 + eventsOn(d).filter(e => e.kind === 'event' && e.type === 'work' && e.end).reduce((a, e) => a + planMinOf(e) * .5, 0) + eventsOn(d).filter(e => e.kind === 'event' && e.type === 'lecture' && e.end).reduce((a, e) => a + evMin(e) * .3, 0); nb[d] = 0; const wd = dow(parseD(d)); if (wd >= 5) load[d] += wd === 5 ? 60 : 120; });
  const place = (d, mod, len, kind, why) => {
    const sl = slots[d].find(x => { const l = Math.min(len, x[1] - Math.ceil(x[0] / 5) * 5); return l >= Math.max(15, len * .6); }); if (!sl) return 0;
    const start = Math.ceil(sl[0] / 5) * 5, L = Math.min(len, sl[1] - start), end = start + L; sl[0] = end + 10;
    const ck = `${d}|${mod.id}`; cnt[ck] = (cnt[ck] || 0) + 1; const key = `w|${ck}|${cnt[ck]}`; load[d] += L; nb[d]++;
    if (!S.suggOff[key]) items.push({ key, date: d, start: fromMin(start), end: fromMin(end), mod, kind, why }); return L;
  };
  // Lernen (Klausurmodule)
  const ranked = examRank();
  if (T.study > 0 && ranked.length) {
    let rem = (T.study - P.study.done - P.study.plan) * 60, guard = 0;
    while (rem >= 20 && guard++ < 40) {
      const cand = days.filter(d => nb[d] < 4 && load[d] < 240 && slots[d].some(x => x[1] - x[0] >= 25)).sort((a, b) => load[a] - load[b] || a.localeCompare(b));
      if (!cand.length) break;
      const d = cand[0], m = ranked[items.filter(i => i.kind === 'study').length % Math.min(2, ranked.length)], len = Math.min(bm, Math.round(rem / 5) * 5), pc = paceInfo(m);
      const L = place(d, m, len, 'study', `${m.name} · Klausur in ${diffDays(d, m.exam)} T${pc && pc.diff < -1800 ? ' · ' + fmtNum(-pc.diff / 3600) + ' h hinter Plan' : ''}`);
      if (!L) { slots[d] = []; continue; } rem -= L;
    }
    if (rem >= 20) notes.push(`📖 Für das Lernziel fehlen noch ${fmtNum(rem / 60)} h: in den freien Zeiten ist kein Platz mehr. Erweitere das Lernfenster in den Einstellungen oder senke das Ziel.`);
  } else if (T.study > 0 && !ranked.length) notes.push('📖 Lege im Study Hub ein Modul mit Klausurdatum an, dann verteilt die App deine Lernstunden automatisch.');
  // Sprachen
  S.modules.filter(m => m.kind === 'lang' && m.dailyMin > 0).forEach(m => {
    const f = T.autoLang > 0 && T.lang > 0 ? T.lang / T.autoLang : 1;
    days.forEach(d => {
      const need = m.dailyMin * f - secOn(d, m.id) / 60 - eventsOn(d).filter(e => e.kind === 'event' && e.modId === m.id).reduce((a, e) => a + evMin(e), 0);
      if (need >= 10 && T.lang > 0) place(d, m, Math.round(need / 5) * 5, 'lang', `${m.name} · Tagesziel ${Math.round(m.dailyMin * f)} Min`);
    });
  });
  // Hinweise
  const conf = []; days.forEach(d => conflictsOn(d).forEach(c => conf.push(`${DAYS[dow(parseD(d))]} ${fmtShort(d)}: ${c}`)));
  if (T.work > 0) { const pl = P.work.done + P.work.plan; if (pl < T.work - .5) notes.push(`💼 Für das Arbeitsziel (${fmtNum(T.work)} h) sind erst ${fmtNum(pl)} h eingetragen.`); else if (pl > T.work + 2) notes.push(`💼 Du hast ${fmtNum(pl)} h Arbeit geplant, ${fmtNum(pl - T.work)} h über deinem Ziel: weniger Zeit zum Lernen.`); }
  weekDays(ws).forEach(d => S.modules.filter(m => m.exam === d).forEach(m => notes.push(`🎯 Klausur ${m.name} am ${DAYS[dow(parseD(d))]} ${fmtShort(d)}`)));
  const nx = S.modules.filter(m => m.exam && m.kind !== 'lang' && diffDays(t, m.exam) > 0 && diffDays(t, m.exam) <= 7 + 7).map(m => `${m.name} in ${diffDays(t, m.exam)} T`); if (nx.length) notes.push('📅 Klausuren bald: ' + nx.join(', '));
  items.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return { items, notes, conf };
}
let planWeek = '';
VIEWS.plan = {
  title: () => '🗓 周计划 Wochenplan',
  sub: () => weekLabel(planWeek || weekStart(today())),
  render() {
    const ws = planWeek || (planWeek = weekStart(today())), cur = ws === weekStart(today()), t = today(), plan = weekPlan(ws), T = wgTargets();
    const goalInp = ([k, l, unit, ph]) => { const g = wg()[k]; return `<div><label class="f">${l} (${unit})</label><input type="text" inputmode="decimal" value="${g === null || g === undefined || g === 0 && k !== 'study' ? '' : (k === 'spend' ? g : g)}" placeholder="${ph}" data-change="wg-set" data-k="${k}"></div>`; };
    const dayRows = weekDays(ws).map(d => {
      const evs = eventsOn(d).filter(e => !(e.kind === 'plan' && e.ptype === 'exam' && false)), sug = plan.items.filter(i => i.date === d), past = d < t;
      return `<div class="item" style="align-items:flex-start;${past ? 'opacity:.55' : ''}"><span class="timeline-time" style="width:70px"><b>${DAYS[dow(parseD(d))]}</b><br>${fmtShort(d)}${d === t ? ' <span class="chip c-gold">heute</span>' : ''}</span><div class="t"><div class="row wrap" style="gap:5px">${evs.map(e => `<span class="chip ${e.type === 'lecture' ? 'c-jade' : e.type === 'work' ? 'c-gray' : e.kind === 'train' ? 'c-pink' : 'c-gold'}" title="${esc(e.title)}">${evIcon(e)} ${e.start ? esc(e.start) + (e.end ? '–' + esc(e.end) : '') + ' ' : ''}${esc(e.title.replace(/^(Lernblock|Sprache): /, '').slice(0, 26))}${e.type === 'lecture' ? ' 🔒' : ''}</span>`).join('') || '<span class="xs faint">frei</span>'}${sug.map(i => `<span class="chip c-gold" style="border-style:dashed">💡 ${i.start}–${i.end} ${esc(i.mod.name)}</span>`).join('')}</div></div></div>`;
    }).join('');
    const byDay = {}; plan.items.forEach(x => (byDay[x.date] = byDay[x.date] || []).push(x));
    return `<div class="stack">
      <div class="row between wrap"><div class="row"><button class="icon-btn" data-act="plan-nav" data-d="-1" aria-label="Vorwoche">‹</button><h3 style="min-width:210px;text-align:center">${weekLabel(ws)}</h3><button class="icon-btn" data-act="plan-nav" data-d="1" aria-label="Nächste Woche">›</button></div>${cur ? '' : '<button class="btn btn-ghost btn-sm" data-act="plan-now">Diese Woche</button>'}</div>
      ${semHint()}${workLeadCard()}
      <div class="grid g2" style="align-items:start">
        <div class="card"><h3>🗓 Die Woche im Überblick</h3><p class="xs muted" style="margin:4px 0 10px">🔒 Vorlesungen sind fix. Gestrichelt: Vorschläge, die du unten bestätigen kannst.</p><div class="stack">${dayRows}</div></div>
        <div class="stack">
          <div class="card hero"><div class="row between wrap"><h3>💡 Vorschlag für diese Woche</h3>${plan.items.length ? `<button class="btn btn-jade btn-sm" data-act="wplan-all">Alle übernehmen (${plan.items.length})</button>` : ''}</div>
            <p class="xs muted" style="margin:3px 0 10px">Passt Lernen und Sprachen in freie Zeiten, nach Klausurnähe, Wochenzielen und deiner Arbeitsbelastung.</p>
            ${plan.items.length ? Object.entries(byDay).map(([d, l]) => `<div class="xs b gold-t" style="margin:12px 0 6px">${fmtDate(d)}</div><div class="stack">${l.map(i => suggItem(i).replace(/data-act="sugg-ok"/, 'data-act="wplan-ok"').replace(/data-act="sugg-no"/, 'data-act="wplan-no"')).join('')}</div>`).join('') : `<div class="empty">${ws < weekStart(t) ? 'Vergangene Woche.' : 'Nichts mehr zu planen: Ziele sind erreicht oder es ist kein Platz frei ✓'}</div>`}
            ${plan.notes.length ? `<div class="stack mt">${plan.notes.map(n => `<div class="xs">${esc(n)}</div>`).join('')}</div>` : ''}
            ${plan.conf.length ? `<div class="mt"><div class="xs b pink-t">⚠️ Überschneidungen</div>${plan.conf.map(c => `<div class="xs">${c}</div>`).join('')}</div>` : ''}</div>
          ${wgCard(ws)}
          <div class="card"><h3>Ziele pro Woche</h3><p class="xs muted" style="margin:4px 0 10px">Leer lassen = automatisch (Training und Sprachen) bzw. aus. Die App rechnet damit Fortschritt und Vorschläge.</p>
            <div class="form-grid">${[['study', '📖 Lernen', 'h', '10'], ['work', '💼 Arbeit', 'h', 'aus'], ['train', '🥋 Training', 'Einheiten', 'auto: ' + T.autoTrain], ['lang', '🈶 Sprachen', 'Min', 'auto: ' + T.autoLang], ['spend', '💰 Ausgaben-Limit', '€', 'aus']].map(goalInp).join('')}</div></div>
        </div></div></div>`;
  }
};
A['plan-nav'] = d => { planWeek = addKey(planWeek || weekStart(today()), 7 * +d.d); render(); };
A['plan-now'] = () => { planWeek = weekStart(today()); render(); };
A['wplan-ok'] = d => { const s = weekPlan(planWeek).items.find(x => x.key === d.key); if (!s) return; addBlockEvent(s); save(); render(); toast(`Eingetragen: ${s.mod.name} ${s.start}–${s.end} ✓`); };
A['wplan-no'] = d => { S.suggOff[d.key] = true; save(); render(); };
A['wplan-all'] = () => { const l = weekPlan(planWeek).items; l.forEach(addBlockEvent); save(); render(); toast(`${l.length} Blöcke eingetragen ✓`); };

/* ---- Jahresrückblick ---- */
let yearSel = new Date().getFullYear();
function yearStats(y) {
  const inY = k => String(k || '').slice(0, 4) === String(y), langIds = new Set(S.modules.filter(m => m.kind === 'lang').map(m => m.id));
  const sess = S.sessions.filter(s => inY(s.date)), sec = sess.reduce((a, s) => a + s.sec, 0), byMonth = Array(12).fill(0), byMod = {};
  sess.forEach(s => { byMonth[+s.date.slice(5, 7) - 1] += s.sec / 3600; byMod[s.moduleId || '-'] = (byMod[s.moduleId || '-'] || 0) + s.sec; });
  let active = 0, best = 0, run = 0; const last = y === new Date().getFullYear() ? today() : `${y}-12-31`;
  for (let k = `${y}-01-01`; k <= last; k = addKey(k, 1)) { if (dayLevel(k) > 0) { active++; run++; best = Math.max(best, run); } else run = 0; }
  const topMod = Object.entries(byMod).filter(([k]) => modById(k)).sort((a, b) => b[1] - a[1])[0];
  const work = Object.values(S.workLog).filter(v => inY(v.date)).reduce((a, v) => a + v.min, 0);
  let spent = 0; for (let m = 1; m <= 12; m++) spent += expTotal(expensesIn(`${y}-${pad(m)}`));
  const ach = ACH.filter(a => S.ach[a.id] && inY(S.ach[a.id]));
  return {
    y, hours: sec / 3600, byMonth, active, best, workouts: S.workouts.filter(w => inY(w.date)).length, course: Object.keys(S.course).filter(inY).length, workH: work / 60, earned: S.settings.wage ? Math.round(work / 60 * S.settings.wage) : 0, spent,
    chapters: S.modules.reduce((a, m) => a + (m.plan || []).filter(p => p.type === 'chapter' && p.done && inY(p.date)).length, 0), tasks: S.tasks.filter(x => x.doneAt && inY(dkey(new Date(x.doneAt)))).length, langH: sess.filter(s => langIds.has(s.moduleId)).reduce((a, s) => a + s.sec, 0) / 3600,
    ach, top: topMod ? { name: modById(topMod[0]).name, h: topMod[1] / 3600 } : null, bestMonth: byMonth.indexOf(Math.max(...byMonth))
  };
}
VIEWS.year = {
  title: () => `🎊 Jahresrückblick ${yearSel}`,
  sub: () => 'Dein Jahr in Zahlen',
  render() {
    const s = yearStats(yearSel), kp = [['📖', fmtNum(s.hours) + ' h', 'Lernzeit'], ['🔥', s.best + ' Tage', 'längster Streak'], ['🌸', s.active, 'aktive Tage'], ['🥋', s.workouts + s.course, 'Trainings & Kurse'], ['💼', fmtNum(s.workH) + ' h', 'Arbeitszeit'], ['🏅', s.ach.length, 'Siegel']];
    const mx = Math.max(...s.byMonth, 1);
    return `<div class="stack"><div class="row between wrap"><div class="row"><button class="icon-btn" data-act="year-nav" data-d="-1" aria-label="Vorjahr">‹</button><h3 style="min-width:90px;text-align:center">${yearSel}</h3><button class="icon-btn" data-act="year-nav" data-d="1" aria-label="Nächstes Jahr">›</button></div><button class="btn btn-gold btn-sm" data-act="year-img">🖼 Als Bild teilen</button></div>
      <div class="grid g3">${kp.map(([i, v, l]) => `<div class="card center"><div style="font-size:26px">${i}</div><div class="b" style="font-size:26px">${v}</div><div class="xs muted">${l}</div></div>`).join('')}</div>
      <div class="card"><h3>Lernstunden pro Monat</h3><div class="bars mt">${s.byMonth.map((v, i) => `<div class="bcol ${i === s.bestMonth && v > 0 ? 'best' : ''}"><em>${v ? fmtNum(v) : ''}</em><b style="height:${Math.max(3, 100 * v / mx)}%"></b><span>${MONTHS[i].slice(0, 3)}</span></div>`).join('')}</div></div>
      <div class="grid g2"><div class="card"><h3>Highlights</h3><ul class="sm" style="margin:10px 0 0 18px;line-height:1.8">
        ${s.top ? `<li>Meiste Zeit: <b>${esc(s.top.name)}</b> (${fmtNum(s.top.h)} h)</li>` : ''}${s.hours > 0 ? `<li>Stärkster Monat: <b>${MONTHS[s.bestMonth]}</b> (${fmtNum(s.byMonth[s.bestMonth])} h)</li>` : ''}
        <li>${s.chapters} Kapitel und ${s.tasks} Aufgaben erledigt</li>${s.langH > 0 ? `<li>${fmtNum(s.langH)} h Sprachen geübt</li>` : ''}${s.ach.length ? `<li>Neue Siegel: ${s.ach.map(a => `<span class="cn">${a.cn}</span> ${esc(a.name)}`).join(', ')}</li>` : ''}</ul></div>
        <div class="card"><h3>💰 Geld (privat, nicht im Bild)</h3><ul class="sm" style="margin:10px 0 0 18px;line-height:1.8"><li>Ausgaben: <b>${fmtEur(s.spent)}</b></li>${s.earned ? `<li>Verdienst aus Arbeit (brutto): <b>${fmtEur(s.earned)}</b></li><li>Bilanz: <b class="${s.earned - s.spent >= 0 ? 'jade-t' : 'red-t'}">${fmtEur(s.earned - s.spent)}</b></li>` : '<li class="muted">Stundenlohn unter „Ausgaben → Budget & Lohn“ eintragen für den Verdienst.</li>'}</ul></div></div></div>`;
  }
};
A['year-open'] = () => { yearSel = new Date().getFullYear(); go('year', { top: true }); };
A['year-nav'] = d => { yearSel += +d.d; render(); };
function yearImage(s) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, v('--pink-soft') || '#FDF0F3'); g.addColorStop(.55, v('--bg') || '#F8F6F0'); g.addColorStop(1, v('--jade-soft') || '#EDF5F0'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = v('--gold'); x.lineWidth = 6; x.strokeRect(36, 36, W - 72, H - 72); x.lineWidth = 2; x.strokeRect(54, 54, W - 108, H - 108);
  const F = '"Plus Jakarta Sans", system-ui, sans-serif', CN = '"Noto Serif SC","Songti SC",serif'; x.textAlign = 'center';
  x.fillStyle = v('--gold-text'); x.font = `700 44px ${CN}`; x.fillText('樱花 · 翡翠', W / 2, 138);
  x.fillStyle = v('--jade-text'); x.font = `800 92px ${F}`; x.fillText(`Mein Jahr ${s.y}`, W / 2, 250);
  x.fillStyle = v('--muted'); x.font = `500 30px ${F}`; x.fillText(S.settings.userName ? S.settings.userName + ' · Sakura & Jade' : 'Sakura & Jade WorkFlow', W / 2, 302);
  const kp = [['📖', fmtNum(s.hours) + ' h', 'Lernzeit'], ['🔥', s.best, 'Tage Streak'], ['🌸', s.active, 'aktive Tage'], ['🥋', s.workouts + s.course, 'Trainings'], ['💼', fmtNum(s.workH) + ' h', 'Arbeit'], ['🏅', s.ach.length, 'Siegel']];
  kp.forEach(([ic, val, lab], i) => {
    const cx = 135 + (i % 3) * 280, cy = 360 + Math.floor(i / 3) * 250, w = 250, h = 220; x.fillStyle = v('--surface'); x.strokeStyle = v('--gold-border'); x.lineWidth = 3;
    x.beginPath(); x.roundRect(cx, cy, w, h, 28); x.fill(); x.stroke(); x.fillStyle = v('--text'); x.font = `46px ${F}`; x.fillText(ic, cx + w / 2, cy + 64);
    x.fillStyle = v('--jade-text'); x.font = `800 ${String(val).length > 6 ? 40 : 52}px ${F}`; x.fillText(String(val), cx + w / 2, cy + 134); x.fillStyle = v('--muted'); x.font = `600 26px ${F}`; x.fillText(lab, cx + w / 2, cy + 180);
  });
  const mx = Math.max(...s.byMonth, 1), bw = 50, gap = 14, bx = (W - (12 * bw + 11 * gap)) / 2, by = 1190, bh = 260; x.fillStyle = v('--gold-text'); x.font = `700 30px ${F}`; x.fillText('Lernstunden pro Monat', W / 2, 886 + 24);
  s.byMonth.forEach((val, i) => { const h = Math.max(6, bh * val / mx), px = bx + i * (bw + gap) - 0; x.fillStyle = i === s.bestMonth && val > 0 ? v('--jade') : v('--pink'); x.beginPath(); x.roundRect(px, by - h, bw, h, 12); x.fill(); x.fillStyle = v('--muted'); x.font = `600 22px ${F}`; x.fillText(MONTHS[i].slice(0, 3), px + bw / 2, by + 36); });
  return c;
}
A['year-img'] = async () => {
  const s = yearStats(yearSel); try { await document.fonts.ready; } catch (_) { }
  const c = yearImage(s), name = `sakura-jade-jahr-${s.y}.png`;
  if (IS_NATIVE && nativeSave(name, c.toDataURL('image/png').split(',')[1], true)) return;
  c.toBlob(async b => {
    if (!b) { toast('Bild konnte nicht erstellt werden.'); return; }
    try { const f = new File([b], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: `Mein Jahr ${s.y}` }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 1500); toast('Bild gespeichert 🖼');
  }, 'image/png');
};
{ const _rr = VIEWS.review.render; VIEWS.review.render = function () { return _rr.call(this) + `<div class="card hero row between wrap"><div><h3>🎊 Jahresrückblick</h3><p class="xs muted">Dein ganzes Jahr in Zahlen, als Bild zum Teilen.</p></div><button class="btn btn-gold btn-sm" data-act="year-open">Öffnen</button></div>`; }; }


/* =====================  ANDROID: Fingerabdruck & Homescreen-Widget  ===================== */
const bioApi = () => IS_NATIVE ? NP('BiometricAuthNative') : null;
const bioAvail = () => !!bioApi();
async function bioAuth(reason) {
  const B = bioApi(); if (!B) return false; LOCK.bioBusy = true;
  try { await B.internalAuthenticate({ reason: reason || 'App entsperren', title: 'Sakura & Jade', cancelTitle: 'PIN verwenden', androidBiometryStrength: 0, deviceCredential: false }); return true; }
  catch (_) { return false; } finally { setTimeout(() => { LOCK.bioBusy = false; }, 1500); }
}
async function lockBio() { const c = pinCfg(); if (!c || !c.bio || !LOCK.on) return; if (await bioAuth()) lockOpen(); }
A['pin-bio'] = () => lockBio();
A['pin-biomode'] = async (d, el) => {
  const c = pinCfg(), B = bioApi(); if (!c || !B) return;
  if (el.checked) {
    try { const r = await B.checkBiometry({}); if (!r.isAvailable) { el.checked = false; toast(r.reason || 'Es ist noch kein Fingerabdruck oder Gesicht eingerichtet (Android-Einstellungen).', 5000); return; } } catch (_) { el.checked = false; return; }
    if (!(await bioAuth('Zum Aktivieren bestätigen'))) { el.checked = false; toast('Nicht bestätigt.'); return; }
  }
  c.bio = el.checked; pinSave(c); render();
};
const bioRow = c => bioAvail() ? `<label class="row mt" style="cursor:pointer"><input type="checkbox" ${c.bio ? 'checked' : ''} data-change="pin-biomode"> <span class="sm">👆 Mit Fingerabdruck / Gesicht entsperren (PIN bleibt als Ersatz)</span></label>` : '';

/* Daten für das Homescreen-Widget (kleine Zusammenfassung, nur auf dem Gerät) */
function widgetData() {
  const t = today(), n = new Date(), nowMin = n.getHours() * 60 + n.getMinutes(); let next = '';
  for (let i = 0; i < 7 && !next; i++) {
    const d = addKey(t, i), e = eventsOn(d).find(x => x.kind === 'event' && x.start && (i > 0 || toMin(x.start) >= nowMin));
    if (e) next = (i === 0 ? '' : i === 1 ? 'Morgen ' : DAYS[dow(parseD(d))] + ' ') + e.start + ' ' + e.title;
  }
  return { streak: streak(), studyMin: Math.round(secOn(t) / 60), goalMin: S.settings.studyGoalMin, next, tasks: S.tasks.filter(x => !isDoneStatus(x.status)).length, ts: Date.now() };
}
let wdT = null;
function nativeWidget() { if (!IS_NATIVE) return; clearTimeout(wdT); wdT = setTimeout(nativeWidgetPush, 3000); }
function nativeWidgetPush() { const W = IS_NATIVE && S ? NP('WidgetBridge') : null; if (!W) return; try { W.update({ json: JSON.stringify(widgetData()) }).catch(() => { }); } catch (_) { } }
document.addEventListener('visibilitychange', () => { if (document.hidden) nativeWidgetPush(); });

/* =====================  START  ===================== */
$('#btn-theme').addEventListener('click', () => { setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark'); });
$('#btn-zen').addEventListener('click', () => toggleZen());
$('#btn-install').addEventListener('click', () => A.install());
$('#fab').addEventListener('click', openCapture);
$('#zen').addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && A[el.dataset.act]) A[el.dataset.act](el.dataset, el, e); });
document.addEventListener('keydown', e => {
  if (LOCK.on) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCapture(); }
  if (e.target.matches && e.target.matches('input,textarea,select')) return;
  if (e.key === 'n' && !modalCfg) { e.preventDefault(); openCapture(); }
});

async function boot() {
  await loadState();
  await flInit();
  applyTheme();
  initPetals();
  autoReplan();
  const qs = new URLSearchParams(location.search), hash = location.hash.replace('#', '');
  const v = qs.get('view') || hash; if (v && VIEWS[v]) current = v;
  if (S.timer.mode === 'pomodoro' && !S.timer.startedAt && S.timer.elapsed === 0 && S.timer.phase === 'focus') S.timer.duration = phaseDur('focus');
  render(true);
  if (qs.get('capture')) openCapture();
  nativeWidget();
  if (S.timer.startedAt) wake(true);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(refreshStorageInfo).catch(() => { });
  else refreshStorageInfo();
  if (!IS_NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (IS_NATIVE && 'serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => { });
  // Backup-Erinnerung
  setTimeout(() => { if (autoOn('backup') && S.settings.lastBackup && Date.now() - S.settings.lastBackup > 14 * 864e5) toast('💾 Dein letztes Backup ist über 2 Wochen alt.', 5000); }, 2500);
}
lockInit();
boot();
window.addEventListener('hashchange', () => { const v = location.hash.replace('#', ''); if (VIEWS[v] && v !== current) go(v); });
