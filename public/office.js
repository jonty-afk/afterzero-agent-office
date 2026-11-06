// Shared isometric "architectural cutaway" office. Used by the desktop dashboard and Reel Mode.
// Pure SVG + absolutely positioned HTML; no libraries.

export const S = 30;                       // world px per plan unit
const C = Math.cos(Math.PI / 6);
export const OX = 330, OY = 150;           // world origin offset
export const WORLD = { w: 1160, h: 820 };

export const AREAS = {
  content: { key: 'content', name: 'Content Studio', x0: 0, x1: 13, y0: 0, y1: 10 },
  jobs: { key: 'jobs', name: 'Job Desk', x0: 13.3, x1: 22.9, y0: 0, y1: 10 },
  cleanic: { key: 'cleanic', name: 'Lead Research', x0: 22.9, x1: 31, y0: 0, y1: 10 },
};

export function P(x, y, z = 0) {
  return [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
}

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const pts = (arr) => arr.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
function poly(g, corners, cls) { return el('polygon', { points: pts(corners), class: cls }, g); }
function line(g, a, b, cls) { return el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls }, g); }

function box(g, x0, x1, y0, y1, z0, z1, cls = 'furn') {
  const grp = el('g', { class: cls }, g);
  poly(grp, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], 'f-front');
  poly(grp, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], 'f-side');
  poly(grp, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], 'f-top');
  return grp;
}
// vertical plane facing the viewer along x (y = const)
function screenX(g, x0, x1, y, z0, z1, cls = 'screen') {
  return poly(g, [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], cls);
}

export function buildOffice(viewport) {
  viewport.classList.add('ofc-viewport');
  const world = document.createElement('div');
  world.className = 'ofc-world';
  world.style.width = WORLD.w + 'px';
  world.style.height = WORLD.h + 'px';
  viewport.appendChild(world);

  const svg = el('svg', { width: WORLD.w, height: WORLD.h, viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, class: 'ofc-svg' });
  world.appendChild(svg);
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="pool" cx="50%" cy="50%" r="60%">
      <stop offset="0" stop-color="#46e0d6" stop-opacity=".30"/>
      <stop offset=".55" stop-color="#2aa6b8" stop-opacity=".10"/>
      <stop offset="1" stop-color="#0b1a2c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wallg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7de8ff" stop-opacity=".02"/>
      <stop offset="1" stop-color="#7de8ff" stop-opacity=".09"/>
    </linearGradient>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#5fd4e0" stroke-opacity=".22" stroke-width="1"/>
    </pattern>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`;

  // ---- slab (section cut) ----
  const base = el('g', { class: 'ofc-base' }, svg);
  const X1 = 31, Y1 = 10, T = 0.55;
  poly(base, [P(0, Y1, -T), P(X1, Y1, -T), P(X1, Y1, 0), P(0, Y1, 0)], 'slab-cut');
  poly(base, [P(X1, 0, -T), P(X1, Y1, -T), P(X1, Y1, 0), P(X1, 0, 0)], 'slab-cut side');
  // grid across whole floor
  const grid = el('g', { class: 'grid' }, base);
  for (let x = 1; x < X1; x++) line(grid, P(x, 0), P(x, Y1), '');
  for (let y = 1; y < Y1; y++) line(grid, P(0, y), P(X1, y), '');

  const rooms = {};
  for (const a of Object.values(AREAS)) {
    const g = el('g', { class: 'room', 'data-area': a.key }, svg);
    rooms[a.key] = g;
    poly(g, [P(a.x0, a.y0), P(a.x1, a.y0), P(a.x1, a.y1), P(a.x0, a.y1)], 'floor');
    // light pool (visible when focused)
    const c = P((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2);
    el('ellipse', { cx: c[0], cy: c[1], rx: (a.x1 - a.x0) * S * 0.95, ry: (a.x1 - a.x0) * S * 0.5, fill: 'url(#pool)', class: 'pool' }, g);
    // back wall (y = 0)
    poly(g, [P(a.x0, 0, 0), P(a.x1, 0, 0), P(a.x1, 0, 3.1), P(a.x0, 0, 3.1)], 'wall');
    line(g, P(a.x0, 0, 3.1), P(a.x1, 0, 3.1), 'wall-top');
    // floor edge highlight (front)
    line(g, P(a.x0, a.y1), P(a.x1, a.y1), 'edge');
  }
  // left wall on content studio (x = 0)
  poly(rooms.content, [P(0, 0, 0), P(0, 10, 0), P(0, 10, 3.1), P(0, 0, 3.1)], 'wall');
  line(rooms.content, P(0, 0, 3.1), P(0, 10, 3.1), 'wall-top');
  // glass partitions
  for (const x of [13.3, 22.9]) {
    const g = el('g', { class: 'partition' }, svg);
    poly(g, [P(x, 0, 0), P(x, 10, 0), P(x, 10, 1.1), P(x, 0, 1.1)], 'glass');
    line(g, P(x, 0, 1.1), P(x, 10, 1.1), 'glass-top');
  }

  // ---- Content Studio furniture ----
  const cg = rooms.content;
  // flow path on the floor: script desk -> edit bay -> render -> wall
  el('polyline', { points: pts([P(2.7, 5.4), P(7, 5.4), P(11.1, 5.4), P(11.1, 1.0)]), class: 'flow' }, cg);
  box(cg, 1.2, 4.2, 3.4, 4.8, 0, 0.8);                 // script desk
  box(cg, 1.6, 2.6, 3.7, 4.4, 0.8, 0.95, 'paper');     // paper stack
  box(cg, 5.4, 8.6, 3.4, 4.8, 0, 0.8);                 // edit bay desk
  screenX(cg, 5.6, 6.95, 3.6, 0.95, 2.0);
  screenX(cg, 7.05, 8.4, 3.6, 0.95, 2.0);
  box(cg, 10.0, 12.2, 3.0, 4.6, 0, 2.1, 'rack');      // render station
  for (let i = 0; i < 5; i++) line(cg, P(10.2, 4.6, 0.35 + i * 0.35), P(12.0, 4.6, 0.35 + i * 0.35), 'led');
  // publish wall frame
  poly(cg, [P(0.4, 0, 0.75), P(12.6, 0, 0.75), P(12.6, 0, 2.95), P(0.4, 0, 2.95)], 'wallframe');

  // ---- Job Desk ----
  const jg = rooms.jobs;
  el('polyline', { points: pts([P(15.2, 7.2), P(17.9, 7.2), P(20.7, 7.2)]), class: 'flow' }, jg);
  box(jg, 14.4, 17.6, 1.6, 3.0, 0, 0.8);
  screenX(jg, 14.9, 16.9, 1.8, 0.95, 1.95);
  const pads = { drafted: [14.2, 16.2], submitted: [16.9, 18.9], replies: [19.6, 21.8] };
  for (const k in pads) box(jg, pads[k][0], pads[k][1], 6.2, 8.4, 0, 0.1, 'pad');
  const stackG = el('g', { class: 'stack' }, jg);
  const radar = el('g', { class: 'radar' }, jg);
  const rc = P(20.7, 7.3, 0.12);
  for (const r of [1, 2, 3]) el('ellipse', { cx: rc[0], cy: rc[1], rx: r * 9, ry: r * 4.5, class: 'ring' }, radar);

  // ---- Lead Research ----
  const lg = rooms.cleanic;
  box(lg, 24.0, 30.0, 3.0, 6.2, 0, 0.75);
  box(lg, 24.0, 26.2, 7.4, 9.2, 0, 0.1, 'pad');
  box(lg, 27.6, 29.8, 7.4, 9.2, 0, 0.1, 'pad');
  const envG = el('g', { class: 'stack' }, lg);

  // ---- overlay ----
  const overlay = document.createElement('div');
  overlay.className = 'ofc-overlay';
  world.appendChild(overlay);

  const api = {
    viewport, world, svg, overlay, rooms,
    cam: { x: WORLD.w / 2, y: WORLD.h / 2, s: 1 },
    anchors: {
      scriptDesk: [2.7, 4.1, 1.1], editBay: [7.0, 3.6, 2.2], render: [11.1, 3.8, 2.3],
      jobDesk: [16.0, 2.3, 2.1], drafted: [15.2, 7.3, 0.2], submitted: [17.9, 7.3, 0.2], replies: [20.7, 7.3, 0.2],
      table: [27.0, 4.6, 0.8], outbox: [25.1, 8.3, 0.2], inbox: [28.7, 8.3, 0.2],
    },
    at(name) { const a = this.anchors[name]; return P(a[0], a[1], a[2]); },
    setStack(n) { // submitted applications: one slab each
      stackG.innerHTML = '';
      for (let i = 0; i < n; i++) box(stackG, 17.3, 18.5, 6.6, 8.0, 0.1 + i * 0.16, 0.22 + i * 0.16, 'slabitem');
    },
    setEnvelopes(n) {
      envG.innerHTML = '';
      for (let i = 0; i < n; i++) box(envG, 24.4 + i * 0.9, 25.1 + i * 0.9, 7.8, 8.8, 0.1, 0.2, 'envelope');
    },
    ping() { radar.classList.remove('on'); void radar.getBBox(); radar.classList.add('on'); },
    focus(area) {
      for (const k in rooms) {
        rooms[k].classList.toggle('lit', area === k);
        // Keep the whole office legible; focus is a glow cue, never a blackout.
        rooms[k].classList.remove('dim');
      }
      overlay.querySelectorAll('[data-area]').forEach((n) => n.classList.remove('dim'));
      viewport.dataset.focus = area || 'all';
    },
    fit(area, pad = 0.88, bias = { x: 0, y: 0 }) {
      const a = area ? AREAS[area] : { x0: 0, x1: 31, y0: 0, y1: 10 };
      const cs = [P(a.x0, a.y0, 3.2), P(a.x1, a.y0, 3.2), P(a.x0, a.y1, -0.6), P(a.x1, a.y1, -0.6), P(a.x0, a.y1, 3.2), P(a.x1, a.y0, -0.6)];
      const xs = cs.map((p) => p[0]), ys = cs.map((p) => p[1]);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      const vw = viewport.clientWidth, vh = viewport.clientHeight;
      const s = Math.min(vw / bw, vh / bh) * pad;
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2 + bias.x, y: (Math.max(...ys) + Math.min(...ys)) / 2 + bias.y, s };
    },
    setCamera(c) {
      this.cam = c;
      const vw = this.viewport.clientWidth, vh = this.viewport.clientHeight;
      world.style.transform = `translate(${vw / 2 - c.x * c.s}px, ${vh / 2 - c.y * c.s}px) scale(${c.s})`;
      world.style.setProperty('--inv', (1 / c.s).toFixed(3));
    },
    // HTML element pinned to a world point. anchor: 'bottom' (billboard above point) | 'center'
    pin(node, pt, area, anchor = 'bottom') {
      node.classList.add('pin', 'pin-' + anchor);
      if (area) node.dataset.area = area;
      node.style.left = pt[0] + 'px';
      node.style.top = pt[1] + 'px';
      overlay.appendChild(node);
      return node;
    },
    // card lying on the back wall (y = 0 plane)
    wallSlot(x0, w, z0, h) {
      const p = P(x0, 0, z0 + h);
      return { left: p[0], top: p[1], width: w * C * S, height: h * S };
    },
  };
  return api;
}

export function h(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

const fmtCache = {};
export function fmt(iso, opts) {
  const key = JSON.stringify(opts);
  fmtCache[key] ||= new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', ...opts });
  return fmtCache[key].format(new Date(iso));
}
export const fmtDay = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (iso) => fmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' ');
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
