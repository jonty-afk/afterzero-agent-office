import { buildOffice, P, h, fmtDay, fmtTime, esc, AREAS } from './office.js';

const data = await (await fetch('data.json', { cache: 'no-store' })).json();
const T0 = Date.parse(data.window.start), T1 = Date.parse(data.window.end);
const MIN = 60e3, HOUR = 60 * MIN;
const ev = data.events.map((e) => ({ ...e, ms: Date.parse(e.t) }));
const AGENT = Object.fromEntries(data.agents.map((a) => [a.id, a]));
const AREA_NAME = { content: 'Content Studio', jobs: 'Job Desk', cleanic: 'Lead Research' };
const STATE = { working: 'Working', handoff: 'Handing off', waiting: 'Waiting', complete: 'Complete', review: 'Needs review' };
const $ = (s) => document.querySelector(s);

// ---------------- header + status ----------------
$('#window').innerHTML = `${fmtDay(data.window.start)} ${fmtTime(data.window.start)} → ${fmtDay(data.window.end)} ${fmtTime(data.window.end)}<em>48-hour sample replay</em>`;
$('#statusAt').textContent = `at ${fmtDay(data.status.read_at)} ${fmtTime(data.status.read_at)}`;
$('#channels').innerHTML = data.channels.map((c) => `
  <div class="ch ${c.state}" title="${esc(c.basis)}">
    <div class="r1"><span>${c.name}</span><span class="st">${c.state === 'verified' ? '✓ verified' : c.state === 'unverified' ? 'not verified' : 'none'}</span></div>
    <div class="r2">${esc(c.detail)}</div>
  </div>`).join('');
$('#statusTitle').textContent = `Current status · ${fmtDay(data.status.read_at)} ${fmtTime(data.status.read_at)}`;
$('#status').innerHTML = data.status.agents.map((a) => `
  <div class="st-ag ${a.state === 'scheduled' ? '' : 'off'}"><span class="n">${esc(a.name)}</span>
  <span class="s">${a.next ? 'next ' + fmtTime(a.next) : esc(a.state)}</span><span class="d">${esc(a.detail)}</span></div>`).join('') +
  `<div class="st-rev">${data.status.review.map((r) => `<div>${esc(r.text)}</div>`).join('')}</div>`;

// ---------------- office ----------------
const O = buildOffice($('#stage'));
const labels = {};
for (const a of Object.values(AREAS)) {
  const n = h('div', 'room-label', `<div class="rl-name">${a.name}</div><div class="rl-stat"></div>`);
  O.pin(n, P(a.x0 + 0.3, 0, 3.3), a.key, 'bottom');
  n.style.transform = 'translate(0,-100%)';
  labels[a.key] = n.querySelector('.rl-stat');
}
function counter(area, pt, label) {
  const n = h('div', 'counter', `<div class="n">0</div><div class="l">${label}</div>`);
  O.pin(n, pt, area, 'center');
  return { set(v) { n.querySelector('.n').textContent = v; n.classList.toggle('zero', !v); } };
}
const cReels = counter('content', P(3.6, 8.9, 0), 'Reels published');
const cDraft = counter('jobs', P(15.2, 9.6, 0), 'Drafted');
const cSub = counter('jobs', P(17.9, 9.6, 0), 'Submitted');
const cRep = counter('jobs', P(20.7, 9.6, 0), 'Interview alerts');
const cLeads = counter('cleanic', P(27.0, 9.9, 0), 'Leads researched');
const cMail = counter('cleanic', P(25.1, 9.9, 0), 'Emailed');
const cReply = counter('cleanic', P(29.0, 9.9, 0), 'Replies');

const wallSlot = (i) => O.wallSlot(0.7 + i * 1.72, 1.36, 0.85, 2.0);
const wall = data.reels.map((r, i) => {
  const s = wallSlot(i);
  const n = h('div', 'wallthumb');
  Object.assign(n.style, { left: s.left + 'px', top: s.top + 'px', width: s.width + 'px', height: s.height + 'px', backgroundImage: r.thumb ? `url(${r.thumb})` : 'none', opacity: 0 });
  n.dataset.area = 'content';
  O.overlay.appendChild(n);
  return n;
});
const leadEls = data.cleanic.cards.map((c, i) => {
  const n = h('div', 'leadcard ' + (c.outcome === 'emailed' ? 'emailed' : ''),
    `<div class="k">${esc(c.kind)}</div><div class="m">${esc(c.area)}${c.scale ? ' · ' + esc(c.scale) : ''}</div><div class="o">${c.outcome === 'emailed' ? '✓ emailed' : esc(c.outcome)}</div>`);
  const base = O.at('table');
  O.pin(n, [base[0] + ((i % 3) - 1) * 112, base[1] - 34 - (i < 3 ? 64 : 0)], 'cleanic', 'bottom');
  n.style.opacity = 0;
  return n;
});

// ---------------- stations + agents ----------------
const STATIONS = {
  script: { p: [2.7, 6.1], name: 'Research & script desk', area: 'content' },
  edit: { p: [7.0, 6.1], name: 'Edit & render bay', area: 'content' },
  rack: { p: [11.2, 6.2], name: 'Production rack', area: 'content' },
  publish: { p: [9.4, 8.4], name: 'Publish point', area: 'content' },
  jobdesk: { p: [16.0, 4.1], name: 'Application desk', area: 'jobs' },
  drafted: { p: [15.2, 5.6], name: 'Drafts tray', area: 'jobs' },
  submitted: { p: [17.9, 5.6], name: 'Submitted tray', area: 'jobs' },
  replies: { p: [20.8, 5.6], name: 'Reply watch', area: 'jobs' },
  profile1: { p: [19.4, 3.0], name: 'Profile corner', area: 'jobs' },
  profile2: { p: [21.6, 3.0], name: 'Profile corner', area: 'jobs' },
  table: { p: [27.6, 7.0], name: 'Research table', area: 'cleanic' },
  outbox: { p: [25.0, 7.0], name: 'Outbox', area: 'cleanic' },
  cinbox: { p: [29.9, 7.0], name: 'Reply inbox', area: 'cleanic' },
};
const spt = (st, dx = 0) => { const s = STATIONS[st].p; return P(s[0] + dx, s[1], 0); };
const agentEls = {};
for (const a of data.agents) {
  const n = h('button', 'agent st-waiting', `
    <div class="ag-label"><b>${esc(a.name)}</b><span class="ag-state">Waiting</span></div>
    <div class="ag-fig"><i class="ag-head"></i><i class="ag-body"></i><i class="ag-badge"></i></div>
    <div class="ag-base"></div>`);
  n.dataset.agent = a.id;
  n.title = `${a.name} · ${a.role}`;
  O.pin(n, spt(a.home), a.area, 'bottom');
  n.addEventListener('click', (e) => { e.stopPropagation(); inspectAgent(a.id); });
  agentEls[a.id] = n;
}
function placeAgent(id, station, state) {
  const n = agentEls[id];
  const pt = spt(station);
  n.style.left = pt[0] + 'px';
  n.style.top = pt[1] + 'px';
  const dim = n.classList.contains('dim');
  n.className = `agent pin pin-bottom st-${state}` + (dim ? ' dim' : '');
  n.querySelector('.ag-state').textContent = STATE[state] || state;
  n.dataset.station = station;
}
// the one moving work card
const card = h('button', 'workcard');
card.dataset.area = 'content';
O.overlay.appendChild(card);
card.addEventListener('click', (e) => { e.stopPropagation(); showEvidence(); });
const KIND = { script: 'Script', video: 'Video file', reel: 'Published reel', clip: 'AI clip', draft: 'Draft', application: 'Applications', email: 'Emails', leads: 'Lead cards', post: 'LinkedIn post', repo: 'GitHub' };
function cardHTML(it) {
  const img = it.thumb ? `<img src="${it.thumb}" class="${it.wide ? 'wide' : ''}" alt="">` : '';
  const txt = it.text ? `<div class="wc-t">${esc(it.text.length > 90 ? it.text.slice(0, 88) + '…' : it.text)}</div>` : '';
  return `<div class="wc-k">${KIND[it.kind] || it.kind}</div><div class="wc-f">${esc(it.label)}</div>${img}${txt}`;
}
function cardAt(pt, area, visible) {
  card.dataset.area = area;
  card.style.left = pt[0] + 20 + 'px';
  card.style.top = pt[1] - 12 + 'px';
  card.style.opacity = visible ? 1 : 0;
}

// ---------------- cumulative office state at time T ----------------
function latest(pred, upto) { let r = null; for (const e of ev) { if (e.ms > upto) break; if (pred(e)) r = e; } return r; }
function applyOffice(T) {
  const pub = data.reels.filter((r) => Date.parse(r.t) <= T).length;
  wall.forEach((n, i) => (n.style.opacity = i < pub ? 1 : 0));
  cReels.set(pub);
  const drafted = ev.filter((e) => e.ms <= T && e.stage === 'draft').length;
  const sub = ev.filter((e) => e.ms <= T && e.area === 'jobs' && e.count).reduce((a, e) => a + e.count, 0);
  cDraft.set(drafted); cSub.set(sub); cRep.set(0);
  O.setStack(sub);
  const research = latest((e) => e.stage === 'research', T);
  const mail = latest((e) => e.stage === 'email', T);
  leadEls.forEach((n) => (n.style.opacity = research ? 1 : 0));
  cLeads.set(research ? research.count : 0);
  cMail.set(mail ? data.cleanic.emailed : 0);
  O.setEnvelopes(mail ? data.cleanic.emailed : 0);
  cReply.set(0);
  labels.content.textContent = `${pub} reels published`;
  labels.jobs.textContent = `${sub} applications (run summaries)`;
  labels.cleanic.textContent = T >= T1 - MIN ? 'agents now off the schedule' : `${research ? data.cleanic.researched : 0} leads · ${mail ? data.cleanic.emailed : 0} emailed`;
}

// ---------------- camera ----------------
let focusArea = 'none';
const camFor = (area) => O.fit(area, area ? 0.72 : 0.92, { x: area ? 20 : 0, y: area ? -50 : -30 });
function setFocus(area, force) {
  if (area === focusArea && !force) return;
  focusArea = area;
  O.focus(area);
  O.world.classList.add('ease');
  O.setCamera(camFor(mode === 'guided' ? null : area));
}
addEventListener('resize', () => { O.world.classList.remove('ease'); O.setCamera(camFor(mode === 'guided' || focusArea === 'none' ? null : focusArea)); });

// ---------------- showing one step (shared by both modes) ----------------
let cur = null;
let timers = [];
const later = (ms, f) => timers.push(setTimeout(f, ms));
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function showStep(step, ctx) {
  clearTimers();
  cur = { step, ctx };
  const area = ctx.area;
  applyOffice(ctx.T);
  setFocus(ctx.focus === undefined ? area : ctx.focus);

  // Start from the evidence-backed home positions, then restore the latest logged
  // position for anyone with a recent event. This makes concurrent work visible
  // without suggesting that a historical task is currently running.
  for (const a of data.agents) placeAgent(a.id, a.home, 'waiting');
  for (const [id, st] of Object.entries(ctx.done || {})) placeAgent(id, st, 'complete');
  const recentWindow = 6 * HOUR;
  for (const a of data.agents) {
    const last = latest((e) => e.agent === a.id, ctx.T);
    if (!last || ctx.T - last.ms > recentWindow || last === step) continue;
    const n = agentEls[a.id];
    placeAgent(a.id, last.station || a.home, last.state || 'complete');
    n.classList.add('recent');
    const age = Math.max(0, Math.round((ctx.T - last.ms) / MIN));
    n.querySelector('.ag-state').textContent = age < 1 ? 'Just logged' : `${age}m since log`;
  }
  for (const a of Object.values(agentEls)) a.classList.remove('active');
  const act = step.agent;
  if (act) { placeAgent(act, step.station, step.state); agentEls[act].classList.add('active'); }

  // work card: carried by the active agent; on a recorded handoff it then moves to the receiving agent
  const it = step.item;
  if (it) {
    card.innerHTML = cardHTML(it);
    card.className = `workcard pin pin-bottom k-${it.kind} ${step.state === 'review' ? 'review' : ''}`;
    cardAt(act ? spt(step.station) : spt(step.station, -1.4), area, true);
    const ho = step.handoff;
    if (ho && ho.to && ho.to !== ho.frm) {
      const toSt = AGENT[ho.to].home;
      // the file is handed over and waits for the receiver; the receiver only starts working in its own later step
      later(1700, () => { card.querySelector('.wc-k').textContent = 'Handed over'; card.querySelector('.wc-f').textContent = ho.what; cardAt(spt(toSt), area, true); placeAgent(ho.to, toSt, 'waiting'); agentEls[ho.to].classList.add('active'); agentEls[ho.to].querySelector('.ag-state').textContent = 'File waiting'; });
    } else if (step.station === 'publish' && it.kind === 'reel') {
      const i = data.reels.findIndex((r) => r.thumb === it.thumb);
      if (i >= 0) {
        wall[i].style.opacity = 0;
        later(1700, () => { const s = wallSlot(i); card.style.left = s.left + 'px'; card.style.top = s.top + s.height + 'px'; });
        later(3000, () => { card.style.opacity = 0; wall[i].style.opacity = 1; });
      }
    }
  } else {
    card.style.opacity = 0;
  }
  if (step.station === 'replies' || step.station === 'cinbox') later(900, () => O.ping());

  $('#clock .cd').textContent = step.ms ? fmtDay(new Date(step.ms).toISOString()) : 'Time';
  const exact = step.ms && !step.timeLabel;
  $('#clock .ct').textContent = exact ? fmtTime(new Date(step.ms).toISOString()) : (step.timeLabel || 'not recorded');
  $('#clock .ct').classList.toggle('small', !exact);
  renderStepCard(step, ctx);
}

function timeText(s) {
  if (s.timeLabel) return (s.ms ? fmtDay(new Date(s.ms).toISOString()) + ' · ' : '') + s.timeLabel;
  if (!s.ms) return 'Time not recorded';
  return `${fmtDay(new Date(s.ms).toISOString())} · ${fmtTime(new Date(s.ms).toISOString())}${s.fileDate ? ' (file date)' : ''}`;
}

function renderStepCard(s, ctx) {
  const a = s.agent ? AGENT[s.agent] : null;
  $('#steptag').className = 'tag ' + (s.state === 'review' ? 'review' : s.kind === 'discovered' ? 'disc' : '');
  $('#steptag').textContent = s.state === 'review' ? 'Needs review' : s.kind === 'discovered' ? 'Discovered output' : 'Replay';
  $('#stepof').textContent = ctx.label || '';
  const it = s.item;
  const preview = it && it.thumb ? `<img class="sc-prev ${it.wide ? 'wide' : ''}" src="${it.thumb}" alt="">`
    : it && it.text ? `<div class="sc-quote">“${esc(it.text)}”</div>` : '';
  const ho = s.handoff;
  const hoHTML = ho ? `<div class="sc-ho"><div class="sc-ho-h">Handoff · ${esc(ho.frm === 'owner' ? 'You' : AGENT[ho.frm].name)} → ${esc(AGENT[ho.to].name)}${ho.frm === ho.to ? ' (its own next step)' : ''}</div>
      <div class="sc-ho-w">${esc(ho.what)}</div><div class="sc-ho-b">${esc(ho.basis)}</div></div>` : '';
  $('#stepcard').innerHTML = `
    <div class="sc-time">${esc(timeText(s))}</div>
    <div class="sc-who">${a ? `<button class="chip-agent" data-agent="${a.id}">${esc(a.name)}</button>` : '<span class="chip-agent you">You</span>'}
      <span class="chip-state st-${s.state}">${STATE[s.state] || s.state}</span>
      <span class="sc-where">${esc(STATIONS[s.station]?.name || '')}</span></div>
    <div class="sc-title">${esc(s.title)}</div>
    <div class="sc-row">${s.detail ? `<div class="sc-detail">${esc(s.detail)}</div>` : ''}${preview}</div>
    ${hoHTML}
    ${s.note ? `<div class="sc-note"><b>Not recorded</b> ${esc(s.note)}</div>` : ''}
    <details class="sc-ev" ${ctx.mode === 'guided' ? 'open' : ''}><summary>Evidence</summary>
      <dl>${(s.evidence || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${/^https?:/.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</dd>`).join('')}</dl></details>`;
  $('#stepcard .chip-agent[data-agent]')?.addEventListener('click', () => inspectAgent(s.agent));
}
function showEvidence() { const d = $('#stepcard details'); if (d) { d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }

function inspectAgent(id) {
  setPlaying(false);
  const a = AGENT[id];
  const mine = ev.filter((e) => e.agent === id);
  const stTxt = agentEls[id].querySelector('.ag-state').textContent;
  const stKey = (Object.entries(STATE).find(([, v]) => v === stTxt) || ['waiting'])[0];
  $('#steptag').className = 'tag status'; $('#steptag').textContent = 'Agent';
  $('#stepof').textContent = '';
  $('#stepcard').innerHTML = `
    <div class="sc-title">${esc(a.name)}</div>
    <div class="sc-who"><span class="chip-state st-${stKey}">${esc(stTxt)}</span><span class="sc-where">${esc(AREA_NAME[a.area])}</span></div>
    <div class="sc-detail" style="margin-top:10px">${esc(a.role)}</div>
    <dl class="ag-dl"><dt>Source</dt><dd>${esc(a.source)}</dd><dt>Events in window</dt><dd>${mine.length}</dd></dl>
    <ol class="ag-evs">${mine.map((e) => `<li data-i="${ev.indexOf(e)}"><span>${e.timeLabel?.startsWith('by') ? e.timeLabel : fmtTime(e.t)}</span>${fmtDay(e.t)} · ${esc(e.title)}</li>`).join('') || '<li>No events in this window.</li>'}</ol>
    <button class="back">← Back to the current step</button>`;
  $('#stepcard .back').onclick = () => cur && renderStepCard(cur.step, cur.ctx);
  $('#stepcard .ag-evs').onclick = (e) => { const li = e.target.closest('li[data-i]'); if (li) { setMode('full', +li.dataset.i); } };
}

// ---------------- timeline ----------------
const track = $('#track');
const xOf = (ms) => ((ms - T0) / (T1 - T0)) * 100;
{
  const days = $('#days');
  const hourOf = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hour12: false });
  for (let t = T0; t <= T1; t += HOUR) {
    const hr = +hourOf.format(t);
    if (hr === 0 || t === T0) { const d = h('div', 'tl-day', fmtDay(new Date(t).toISOString())); d.style.left = xOf(t) + '%'; days.appendChild(d); }
    else if (hr % 6 === 0) { const d = h('div', 'tl-hour', fmtTime(new Date(t).toISOString()).replace(':00', '')); d.style.left = xOf(t) + '%'; days.appendChild(d); }
    if (hr === 21) { const n = h('div', 'tl-night'); n.style.left = xOf(t) + '%'; n.style.width = Math.min(xOf(t + 10 * HOUR), 100) - xOf(t) + '%'; days.appendChild(n); }
  }
  days.appendChild(h('div', 'tl-end'));
  const lanes = $('#lanes');
  ['content', 'jobs', 'cleanic'].forEach((a, i) => {
    const l = h('div', 'lane', `<span class="ln">${a === 'cleanic' ? 'Lead Research' : a === 'jobs' ? 'Jobs' : 'Content'}</span>`);
    l.style.top = i * 30 + 'px'; lanes.appendChild(l);
  });
  ev.forEach((e, i) => {
    const t = h('div', `tick ${e.minor ? 'minor' : ''} ${e.status === 'review' ? 'review' : ''} ${e.kind === 'discovered' && e.status !== 'review' ? 'disc' : ''}`);
    t.style.left = xOf(e.ms) + '%';
    t.style.top = ['content', 'jobs', 'cleanic'].indexOf(e.area) * 30 + 'px';
    t.title = `${fmtTime(e.t)} · ${e.title}`;
    e.tick = t; lanes.appendChild(t);
  });
}
function setHead(ms) { $('#head').style.left = xOf(Math.max(T0, Math.min(T1, ms))) + '%'; }
function markTicks(fn) { for (const e of ev) { const k = fn(e); e.tick.classList.toggle('past', k === 'past'); e.tick.classList.toggle('in', k === 'in'); } }

// ---------------- pacing ----------------
let mode = 'full', playing = false, autoTimer = null, dwellStart = 0, dwellMs = 0;
const PACE = {
  guided: [['manual', 'Manual', 0], ['slow', 'Slow · 12 s', 12000], ['normal', 'Normal · 7 s', 7000]],
  full: [['slow', 'Slow · 12 s', 12000], ['normal', 'Normal · 8 s', 8000], ['quick', 'Quick · 5 s', 5000]],
};
const pace = { guided: 'slow', full: 'slow' };
function renderPace() {
  $('#paceLabel').textContent = mode === 'guided' ? 'Auto-advance per step' : 'Time on each event';
  $('#pace').innerHTML = PACE[mode].map(([k, l]) => `<button data-p="${k}" class="${pace[mode] === k ? 'on' : ''}">${l}</button>`).join('');
}
$('#pace').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  pace[mode] = b.dataset.p; renderPace();
  if (!paceMs()) setPlaying(false); else if (playing) schedule();
};
const paceMs = () => PACE[mode].find(([k]) => k === pace[mode])[2];
function schedule() {
  clearTimeout(autoTimer);
  const ms = paceMs();
  if (!playing || !ms) { dwellMs = 0; return; }
  // routine inbox checks get a shorter slot in Full history, never under 2.5 s
  dwellMs = mode === 'full' && cur?.step?.minor ? Math.max(2500, ms * 0.5) : ms;
  dwellStart = performance.now();
  autoTimer = setTimeout(() => (mode === 'guided' ? goStep(si + 1) : goEvent(ei + 1)), dwellMs);
}
function setPlaying(p) {
  if (p && mode === 'guided' && !paceMs()) { pace.guided = 'slow'; renderPace(); }
  if (p && mode === 'guided' && si >= tasks[ti].steps.length - 1) goStep(0);
  if (p && mode === 'full' && ei >= ev.length - 1) goEvent(0);
  playing = p;
  document.body.classList.toggle('playing', p);
  schedule();
}
(function tickDwell() {
  const w = playing && dwellMs ? Math.min(1, (performance.now() - dwellStart) / dwellMs) : 0;
  $('#dwell').style.width = w * 100 + '%';
  requestAnimationFrame(tickDwell);
})();

// ---------------- Guided workflow ----------------
const tasks = data.tasks;
let ti = Math.max(0, tasks.findIndex((t) => t.id === 'reel-2025-02-02-1715'));
let si = 0;
{
  const groups = [...new Set(tasks.map((t) => t.group))];
  $('#task').innerHTML = groups.map((g) => `<optgroup label="${esc(g)}">${tasks.map((t, i) => (t.group === g ? `<option value="${i}">${esc(t.title)}</option>` : '')).join('')}</optgroup>`).join('');
  $('#task').onchange = (e) => { setPlaying(false); ti = +e.target.value; goStep(0); };
}
function stepT(task, k) { for (let j = k; j >= 0; j--) if (task.steps[j].t) return Date.parse(task.steps[j].t); return T1; }
function goStep(k) {
  const task = tasks[ti];
  if (k >= task.steps.length || k < 0) { setPlaying(false); return; }
  si = k;
  const raw = task.steps[si];
  const s = { ...raw, ms: raw.t ? Date.parse(raw.t) : null };
  const T = stepT(task, si);
  const done = {};
  for (let j = 0; j < si; j++) { const p = task.steps[j]; if (p.agent && p.agent !== s.agent) done[p.agent] = p.station; }
  showStep(s, { mode: 'guided', area: task.area, T, done, label: `Step ${si + 1} of ${task.steps.length}` });
  $('#task').value = ti;
  $('#steplist').innerHTML = task.steps.map((p, j) => `<li data-j="${j}" class="${j < si ? 'done' : j === si ? 'cur' : ''} ${p.state === 'review' ? 'rev' : ''}">
      <span class="n">${j < si ? '✓' : j + 1}</span><span class="t">${esc(p.title)}</span><span class="w">${esc(p.timeLabel || (p.t ? fmtTime(p.t) : ''))}</span></li>`).join('');
  $('#prev').disabled = si === 0; $('#next').disabled = si === task.steps.length - 1;
  setHead(T);
  markTicks((e) => (e.ms <= T ? 'past' : null));
  if (playing) { if (si === task.steps.length - 1) { playing = false; document.body.classList.remove('playing'); dwellMs = 0; } else schedule(); }
}
$('#steplist').onclick = (e) => { const li = e.target.closest('li'); if (li) { setPlaying(false); goStep(+li.dataset.j); } };

// ---------------- Full history ----------------
let ei = -1, view = 'all';
function evStep(e) {
  return { ...e, detail: e.output, evidence: [['Source', e.source || ''], ...(e.link ? [['Permalink', e.link]] : [])], fileDate: e.kind === 'discovered' || /file date/.test(e.source || '') };
}
function goEvent(i) {
  if (i >= ev.length || i < 0) { setPlaying(false); return; }
  ei = i;
  const e = ev[ei];
  const focus = view === 'tour' ? e.area : view === 'all' ? null : view;
  showStep(evStep(e), { mode: 'full', area: e.area, T: e.ms, focus, label: `Event ${ei + 1} of ${ev.length}` });
  setHead(e.ms);
  markTicks((x) => (x === e ? 'in' : x.ms <= e.ms ? 'past' : null));
  renderLog();
  $('#statussec').classList.toggle('hl', ei === ev.length - 1);
  $('#prev').disabled = ei === 0; $('#next').disabled = ei === ev.length - 1;
  if (playing) { if (ei === ev.length - 1) { playing = false; document.body.classList.remove('playing'); dwellMs = 0; } else schedule(); }
}
function renderLog() {
  $('#logcount').textContent = `${ei + 1} / ${ev.length}`;
  $('#log').innerHTML = ev.slice(0, ei + 1).reverse().slice(0, 80).map((e, k) => `
    <li data-i="${ev.indexOf(e)}" class="${e.minor ? 'minor' : ''} ${e.status === 'review' ? 'review' : ''} ${e.kind === 'discovered' ? 'disc' : ''} ${k === 0 ? 'cur' : ''}">
      <span class="lt">${e.timeLabel?.startsWith('by') ? e.timeLabel : fmtTime(e.t)}</span><i class="ld"></i>
      <span>${esc(e.title)} <em>${esc(AGENT[e.agent]?.name || '')}</em></span></li>`).join('');
}
$('#log').onclick = (e) => { const li = e.target.closest('li'); if (li) { setPlaying(false); goEvent(+li.dataset.i); } };
document.querySelectorAll('.viewbtns button').forEach((b) => (b.onclick = () => {
  view = b.dataset.view;
  document.querySelectorAll('.viewbtns button').forEach((x) => x.classList.toggle('on', x === b));
  if (ei >= 0) goEvent(ei);
}));
let dragging = false;
function scrub(evt) {
  const r = track.getBoundingClientRect();
  const ms = T0 + ((evt.clientX - r.left) / r.width) * (T1 - T0);
  if (mode === 'guided') setMode('full');
  let k = 0; for (let j = 0; j < ev.length; j++) if (ev[j].ms <= ms) k = j;
  if (k !== ei) goEvent(k);
  setHead(ms);
}
track.addEventListener('pointerdown', (e) => { dragging = true; track.setPointerCapture(e.pointerId); setPlaying(false); scrub(e); });
track.addEventListener('pointermove', (e) => dragging && scrub(e));
track.addEventListener('pointerup', () => { dragging = false; if (ei >= 0) setHead(ev[ei].ms); });

// ---------------- controls ----------------
function setMode(m, eventIndex) {
  setPlaying(false);
  mode = m;
  document.body.classList.toggle('mode-guided', m === 'guided');
  document.body.classList.toggle('mode-full', m === 'full');
  document.querySelectorAll('.modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  renderPace();
  if (m === 'guided') goStep(si); else goEvent(eventIndex ?? (ei < 0 ? 0 : ei));
}
document.querySelectorAll('.modes button').forEach((b) => (b.onclick = () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));
$('#prev').onclick = () => { setPlaying(false); mode === 'guided' ? goStep(si - 1) : goEvent(ei - 1); };
$('#next').onclick = () => { setPlaying(false); mode === 'guided' ? goStep(si + 1) : goEvent(ei + 1); };
$('#play').onclick = () => setPlaying(!playing);
addEventListener('keydown', (e) => {
  if (e.target.closest('select, input')) return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.code === 'ArrowRight') $('#next').click();
  if (e.code === 'ArrowLeft') $('#prev').click();
});

// ---------------- start ----------------
O.focus(null); O.setCamera(camFor(null));
renderPace();
goEvent(ev.length - 1);
window.__office = { goStep, goEvent, setMode, setPlaying, get state() { return { mode, ti, si, ei, playing, dwellMs, task: tasks[ti].id }; } };
