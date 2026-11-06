// Reel Mode: a deterministic 29-second, 9:16 tour built from the same data.json.
// Every visual state is a pure function of the reel time t, so it can be scrubbed and captured frame by frame.
import { buildOffice, P, h, fmtDay, fmtTime, esc, AREAS } from './office.js';

const data = await (await fetch('data.json', { cache: 'no-store' })).json();
const DUR = 29;
const MIN = 60e3;
const T0 = Date.parse(data.window.start), T1 = Date.parse(data.window.end);
const ev = data.events.map((e) => ({ ...e, ms: Date.parse(e.t) }));
const reels = data.reels.map((r) => ({ ...r, ms: Date.parse(r.t) }));
const $ = (s) => document.getElementById(s);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const params = new URLSearchParams(location.search);
if (params.has('capture')) document.body.classList.add('capture');

// ---------- layout / scale ----------
const reelEl = $('reel');
function fit() {
  const ctl = document.body.classList.contains('capture') ? 0 : 52;
  const s = Math.min(innerWidth / 1080, (innerHeight - ctl) / 1920);
  reelEl.style.transform = `scale(${s}) translate(-50%, -50%)`;
}
addEventListener('resize', fit); fit();

// ---------- office ----------
const O = buildOffice($('office'));
const roomLabels = [];
for (const a of Object.values(AREAS)) {
  const n = h('div', 'room-label', `<div class="rl-name">${a.name}</div>`);
  roomLabels.push(n);
  O.pin(n, P(a.x0 + 0.3, 0, 3.3), a.key, 'bottom');
  n.style.transform = 'translate(0,-100%)';
}
const wall = reels.map((r, i) => {
  const s = O.wallSlot(0.7 + i * 1.72, 1.36, 0.85, 2.0);
  const n = h('div', 'wallthumb');
  Object.assign(n.style, { left: s.left + 'px', top: s.top + 'px', width: s.width + 'px', height: s.height + 'px', backgroundImage: `url(${r.thumb})`, opacity: 0 });
  n.dataset.area = 'content';
  O.overlay.appendChild(n);
  return { n, s };
});
const page = O.pin(h('div', 'page'), O.at('scriptDesk'), 'content');
const render = O.pin(h('div', 'thumbcard'), O.at('render'), 'content');
const flyer = O.pin(h('div', 'thumbcard', '<img alt="">'), [0, 0], 'content');
const leadEls = data.cleanic.cards.map((c, i) => {
  const n = h('div', 'leadcard ' + (c.outcome === 'emailed' ? 'emailed' : ''),
    `<div class="k">${esc(c.kind)}</div><div class="m">${esc(c.area)}</div><div class="o">${c.outcome === 'emailed' ? '✓ emailed' : esc(c.outcome)}</div>`);
  const b = O.at('table');
  const pos = [b[0] + ((i % 2) ? 1 : -1) * 103, b[1] + 28 - (2 - Math.floor(i / 2)) * 80];
  O.pin(n, pos, 'cleanic', 'bottom');
  return { n, pos };
});
const env = [0, 1].map(() => O.pin(h('div', 'tag', '✉ intro sent'), [0, 0], 'cleanic', 'bottom'));
const trackerNote = O.pin(h('div', 'tag', '+1 logged in tracker'), P(18.6, 7.2, 1.7), 'jobs', 'bottom');
for (const [area, pt, txt] of [['jobs', P(15.2, 9.4, 0), 'Drafted'], ['jobs', P(17.9, 9.4, 0), 'Submitted'], ['jobs', P(20.7, 9.4, 0), 'Inbox watch'],
  ['cleanic', P(25.1, 9.9, 0), 'Emailed'], ['cleanic', P(28.7, 9.9, 0), 'Replies: 0']]) {
  O.pin(h('div', 'counter', `<div class="l">${txt}</div>`), pt, area, 'center');
}
const rings = [...O.svg.querySelectorAll('.radar .ring')];

// ---------- cameras ----------
let CAM = {};
function computeCams() {
  const ov = O.fit(null, 0.98, { x: 0, y: -10 });
  CAM = {
    hook0: { ...ov, s: ov.s * 1.45, x: ov.x - 120, y: ov.y - 20 },
    all: ov,
    content: O.fit('content', 1.0, { x: 20, y: -10 }),
    jobs: O.fit('jobs', 0.98, { x: 10, y: -10 }),
    cleanic: O.fit('cleanic', 0.98, { x: 35, y: -30 }),
  };
}
computeCams();
const SHOTS = [
  { t: 0, cam: 'hook0', dur: 0 },
  { t: 0.15, cam: 'all', dur: 2.8 },
  { t: 6.3, cam: 'content', dur: 1.0 },
  { t: 13.85, cam: 'jobs', dur: 1.0 },
  { t: 19.35, cam: 'cleanic', dur: 1.0 },
  { t: 24.35, cam: 'all', dur: 1.2 },
];
function camAt(t) {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
  const cur = SHOTS[i], prev = SHOTS[Math.max(0, i - 1)];
  const k = cur.dur ? ease(seg(t, cur.t, cur.t + cur.dur)) : 1;
  const a = CAM[prev.cam], b = CAM[cur.cam];
  // interpolate in log-scale for a natural dolly
  const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), k));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s };
}

// ---------- replay-time keyframes (t -> real timestamp) ----------
const nz = (s) => Date.parse(s + 'Z');
const KF = [[0, T0], [2.7, T1], [6.25, T1], [6.7, nz('2025-02-01T14:30:00')]];
reels.forEach((r, i) => KF.push([7.3 + i * 0.72, r.ms + MIN]));
KF.push([12.3, nz('2025-02-03T12:18:00')], [13.9, nz('2025-02-03T12:18:00')],
  [14.3, nz('2025-02-02T07:50:00')], [15.3, nz('2025-02-02T15:15:00')], [16.9, nz('2025-02-03T08:15:00')], [18.2, T1], [19.4, T1],
  [19.45, nz('2025-02-01T15:13:30')], [24.3, nz('2025-02-01T15:13:30')], [24.35, T1], [DUR, T1]);
function Tat(t) {
  for (let i = 0; i + 1 < KF.length; i++) {
    const [ta, Ta] = KF[i], [tb, Tb] = KF[i + 1];
    if (t >= ta && t <= tb) return tb === ta ? Tb : lerp(Ta, Tb, (t - ta) / (tb - ta));
  }
  return T1;
}
// scene time at which a timestamp is reached inside [lo, hi]
function tOf(ms, lo, hi) {
  for (let i = 0; i + 1 < KF.length; i++) {
    const [ta, Ta] = KF[i], [tb, Tb] = KF[i + 1];
    if (ta < lo || tb > hi || Tb <= Ta) continue;
    if (ms >= Ta && ms <= Tb) return lerp(ta, tb, (ms - Ta) / (Tb - Ta));
  }
  return null;
}

// ---------- text ----------
const SCENES = [
  { a: 0, b: 3.0, kick: 'Agent Office', head: '48-hour<br>Agent Office<br>sample replay.', sub: 'Synthetic sample data · not live activity.' },
  { a: 3.0, b: 6.5, kick: 'Sample office · replay', head: 'Content.<br>Jobs.<br>Lead Research.', sub: `${fmtDay(data.window.start)} ${fmtTime(data.window.start)} → ${fmtDay(data.window.end)} ${fmtTime(data.window.end)}` },
  { a: 6.5, b: 14.0, kick: 'Content Studio', num: 'reels', lab: 'reels posted', sub: 'Instagram · demo channel' },
  { a: 14.0, b: 19.5, kick: 'Job Desk', num: 'apps', lab: 'applications sent', sub: '0 interview invites yet' },
  { a: 19.5, b: 24.5, kick: 'Lead Research', num: 'leads', lab: 'leads researched', sub: `${data.cleanic.emailed} emailed · names hidden` },
  { a: 24.5, b: DUR + 1, kick: '', head: 'Comment:<br>content, jobs<br>or leads?', sub: '', late: 26.0 },
];

// ---------- lighting: smooth, time-driven (no CSS transitions, so every frame is exact) ----------
const FOCI = [['content', 3.5, 4.3], ['jobs', 4.3, 5.1], ['cleanic', 5.1, 5.9], ['content', 6.4, 14], ['jobs', 13.9, 19.5], ['cleanic', 19.4, 24.5]];
const RAMP = 0.35;
const areaNodes = {};
for (const k of Object.keys(AREAS)) areaNodes[k] = [...O.overlay.querySelectorAll(`[data-area="${k}"]`)];
function applyLight(t) {
  const lit = { content: 0, jobs: 0, cleanic: 0 };
  for (const [a, t0, t1] of FOCI) lit[a] = Math.max(lit[a], Math.min(seg(t, t0, t0 + RAMP), 1 - seg(t, t1 - RAMP, t1)));
  const any = Math.max(...Object.values(lit));
  for (const k in lit) {
    const dim = clamp(any - lit[k]);
    const room = O.rooms[k];
    room.classList.remove('lit', 'dim');
    room.style.opacity = lerp(1, 0.28, dim);
    room.querySelector('.pool').style.opacity = lit[k];
    room.querySelectorAll('.flow, .led').forEach((f) => (f.style.strokeDashoffset = lit[k] > 0.01 ? (-t * 9).toFixed(1) : 0));
    for (const n of areaNodes[k]) n.style.filter = dim > 0.01 ? `opacity(${lerp(1, 0.07, dim).toFixed(3)}) saturate(${lerp(1, 0.3, dim).toFixed(3)})` : 'none';
  }
}

// ---------- render ----------
let lastScene = -1;
function renderAt(t) {
  const T = Tat(t);
  O.setCamera(camAt(t));

  // which room is lit
  applyLight(t);

  roomLabels.forEach((n) => (n.style.opacity = t >= 3.0 && t < 6.4 ? 1 : 0));

  // content
  let pub = 0;
  reels.forEach((r, i) => {
    const tE = tOf(r.ms, 6.7, 12.3);
    const inTour = t >= 6.5 && t < 14;
    const shown = inTour ? tE != null && t >= tE + 0.45 : r.ms <= T;
    wall[i].n.style.opacity = shown ? 1 : 0;
    if (r.ms <= T) pub++;
  });
  // the flying thumbnail for the most recent publish in the tour
  flyer.style.opacity = 0;
  if (t >= 6.5 && t < 13) {
    reels.forEach((r, i) => {
      const tE = tOf(r.ms, 6.7, 12.3);
      if (tE == null) return;
      const k = seg(t, tE - 0.05, tE + 0.45);
      if (k > 0 && k < 1) {
        const a = O.at('render'), s = wall[i].s, b = [s.left + s.width / 2, s.top + s.height + 6];
        const e = ease(k);
        flyer.style.left = lerp(a[0], b[0], e) + 'px';
        flyer.style.top = lerp(a[1], b[1], e) + 'px';
        flyer.style.opacity = 1;
        flyer.style.transform = `translate(-50%,-100%) scale(${lerp(1, 0.55, e)})`;
        flyer.querySelector('img').src = r.thumb;
      }
    });
  }
  const sc = latestBefore((e) => e.stage === 'script' && e.status === 'done', T);
  page.innerHTML = sc ? `<b>SCRIPT · ${fmtTime(sc.t)}</b>${esc(sc.output)}` : '';
  const hookClear = t < 2.9 ? 0 : 1; // keep the hook's text area clean
  page.style.opacity = sc ? hookClear : 0;
  const rd = latestBefore((e) => e.area === 'content' && e.stage === 'render' && e.kind !== 'discovered', T);
  render.innerHTML = rd ? `<img src="${rd.thumb || ''}" alt="">` : '';
  render.style.opacity = rd && rd.thumb ? hookClear : 0;

  // Video 3 found file card
  const v3k = Math.min(seg(t, 12.0, 12.4), 1 - seg(t, 13.6, 13.9));
  $('v3').style.opacity = v3k;
  $('v3').style.transform = `translateY(${(1 - ease(seg(t, 12.0, 12.4))) * 40}px)`;

  // jobs
  let apps = ev.filter((e) => e.ms <= T && e.area === 'jobs' && e.count).reduce((s, e) => s + e.count, 0);
  const extra = (t >= 17.6 && t < 19.5) || t >= 24.5 || (t < 6.5 && T >= T1 - MIN) ? 1 : 0; // the 7th is in tracker.csv only
  apps += extra;
  O.setStack(apps);
  trackerNote.style.opacity = t >= 17.6 && t < 19.5 ? 1 : 0;
  const pingTs = ev.filter((e) => e.area === 'jobs' && e.stage === 'replies').map((e) => tOf(e.ms, 14.0, 19.5)).filter((x) => x != null);
  let age = Infinity;
  for (const p of pingTs) if (t >= p) age = Math.min(age, t - p);
  rings.forEach((r, i) => {
    const k = seg(age, i * 0.15, 1.2 + i * 0.15);
    r.style.opacity = age < 2 && k > 0 && k < 1 ? (1 - k) * 0.9 : 0;
    r.style.transform = `scale(${0.4 + 1.2 * k})`;
  });

  // cleanic
  const inC = t >= 19.5 && t < 24.5;
  let leads = 0;
  leadEls.forEach((l, i) => {
    const k = inC ? ease(seg(t, 20.0 + i * 0.22, 20.4 + i * 0.22)) : (T >= nz('2025-02-01T15:13:00') ? 1 : 0);
    l.n.style.opacity = k;
    l.n.style.transform = `translate(-50%, calc(-100% + ${(1 - k) * 30}px))`;
    if (k > 0.5) leads++;
  });
  let mailed = 0;
  env.forEach((n, i) => {
    const k = inC ? seg(t, 22.0 + i * 0.25, 22.8 + i * 0.25) : 0;
    const a = O.at('table'), b = O.at('outbox');
    n.style.left = lerp(a[0], b[0], ease(k)) + 'px';
    n.style.top = lerp(a[1] - 60, b[1], ease(k)) + 'px';
    n.style.opacity = k > 0 && k < 1 ? 1 : 0;
    if (k >= 1 || (!inC && T >= nz('2025-02-01T15:12:00'))) mailed++;
  });
  O.setEnvelopes(mailed);

  // text
  const si = SCENES.findIndex((s) => t >= s.a && t < s.b);
  const s = SCENES[si];
  const k = Math.min(si === 0 ? 1 : seg(t, s.a, s.a + 0.25), 1 - seg(t, s.b - 0.2, s.b));
  const nums = { reels: pub, apps, leads };
  if (si !== lastScene || s.num) {
    $('kick').textContent = s.kick;
    $('head').innerHTML = s.num ? `<span class="num">${nums[s.num]}</span><span class="lab">${s.lab}</span>` : s.head;
    $('sub').innerHTML = s.sub;
    lastScene = si;
  }
  const late = s.late ? seg(t, s.late, s.late + 0.35) : 1;
  $('txt').style.opacity = si === SCENES.length - 1 ? late : k;
  $('txt').style.transform = `translateY(${si === 0 ? 0 : (1 - ease(si === SCENES.length - 1 ? late : seg(t, s.a, s.a + 0.35))) * 24}px)`;

  // summary
  const sk = ease(seg(t, 24.7, 25.2));
  $('sum').style.opacity = sk;
  $('scrim').style.opacity = sk;
  $('s1').textContent = data.reels.length;
  $('s2').textContent = data.jobs.submitted;
  $('s3').textContent = data.cleanic.researched;

  // chip + bar
  const iso = new Date(T).toISOString();
  let chip;
  if (t >= 24.5) chip = `Records read ${fmtDay(data.status.read_at)} · ${fmtTime(data.status.read_at)}`;
  else if (t >= 3.0 && t < 6.3) chip = '48-hour sample window';
  else if (t >= 19.5) chip = `${fmtDay(iso)} · lead run saved ${fmtTime(iso)}`;
  else chip = `${fmtDay(iso)} · ${fmtTime(iso)}`;
  $('chipt').textContent = chip;
  $('chip').querySelector('.tag').textContent = t >= 24.5 ? 'Summary' : 'Replay';
  $('barfill').style.width = ((T - T0) / (T1 - T0)) * 100 + '%';
}
function latestBefore(pred, T) { let r = null; for (const e of ev) { if (e.ms > T) break; if (pred(e)) r = e; } return r; }

// ---------- playback ----------
let t = +(params.get('t') || 0), playing = false, startWall = 0, startT = 0;
function seek(x) { t = clamp(x, 0, DUR); renderAt(t); $('scrub').value = t; $('tc').textContent = t.toFixed(1) + ' s'; }
function play() { if (t >= DUR) t = 0; playing = true; startWall = performance.now(); startT = t; $('pp').textContent = 'Pause'; }
function pause() { playing = false; $('pp').textContent = 'Play'; }
function loop(now) {
  if (playing) { const nt = startT + (now - startWall) / 1000; if (nt >= DUR) { seek(DUR); pause(); } else seek(nt); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
$('pp').onclick = () => (playing ? pause() : play());
$('scrub').oninput = (e) => { pause(); seek(+e.target.value); };
$('safeT').onchange = (e) => $('safe').classList.toggle('on', e.target.checked);
if (params.has('safe')) { $('safeT').checked = true; $('safe').classList.add('on'); }
addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
if (document.body.classList.contains('capture')) addEventListener('click', () => (playing ? pause() : play()));
addEventListener('resize', () => { computeCams(); renderAt(t); });
seek(t);
window.__reel = { seek, play, pause, duration: DUR };
