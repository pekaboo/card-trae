// ARCANA v2 —「午夜占卜室」tarot flow + celestial layer.
// Flow unchanged: choose spread → draw from fan → reveal + reading.
import { MAJOR_ARCANA } from './cards.js';

const $ = (s, el = document) => el.querySelector(s);
const REVERSE_CHANCE = 0.4;

const SPREADS = {
  one:   { n: 1, labels: [['今日指引', 'THE DAY']], hint: '一张牌' },
  three: { n: 3, labels: [['过去', 'THE PAST'], ['现在', 'THE PRESENT'], ['未来', 'THE FUTURE']], hint: '三张牌' }
};

const FLIP_SFX = [1, 2, 3, 4].map(
  i => `/sounds/sfx/cards/Card Flips/Card Throw Swish ${i}.mp3`
);
const CLICK_SFX = '/sounds/sfx/Click.mp3';
const BGM_SRC = '/sounds/music/Night_Patterns_loop.mp3';

const state = { spread: null, deck: [], picked: [], phase: 'choose', question: '' };

/* ═══════════ celestial: stars · zodiac wheel · moon ═══════════ */

function seedStars(el, n) {
  let html = '';
  for (let i = 0; i < n; i++) {
    const size = Math.random() < .12 ? 2.4 : 1.2;
    html += `<i class="star${size > 2 ? ' big' : ''}" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 100).toFixed(2)}%;width:${size}px;height:${size}px;animation-delay:-${(Math.random() * 9).toFixed(1)}s;animation-duration:${(5.5 + Math.random() * 4).toFixed(1)}s"></i>`;
  }
  el.innerHTML = html;
}

function buildWheel() {
  const NS = 'http://www.w3.org/2000/svg';
  const add = (parent, tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  };
  const spokes = $('#spokes'), ticks = $('#ticks'), cst = $('#constellation');
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    add(spokes, 'line', {
      x1: 200 + 120 * Math.cos(a), y1: 200 + 120 * Math.sin(a),
      x2: 200 + 168 * Math.cos(a), y2: 200 + 168 * Math.sin(a)
    });
    add(spokes, 'circle', {
      cx: 200 + 144 * Math.cos(a), cy: 200 + 144 * Math.sin(a),
      r: 1.6, fill: '#C9A227', stroke: 'none'
    });
  }
  for (let i = 0; i < 72; i++) {
    const a = i * Math.PI / 36;
    const r1 = i % 6 === 0 ? 168 : 182;
    add(ticks, 'line', {
      x1: 200 + r1 * Math.cos(a), y1: 200 + r1 * Math.sin(a),
      x2: 200 + 196 * Math.cos(a), y2: 200 + 196 * Math.sin(a)
    });
  }
  const pts = [[176, 120], [210, 96], [248, 118], [268, 160], [232, 176]];
  pts.forEach(([x, y]) => add(cst, 'circle', { cx: x, cy: y, r: 2, fill: '#C9A227', stroke: 'none' }));
  for (let i = 0; i < pts.length - 1; i++) {
    add(cst, 'line', {
      x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1],
      'stroke-width': '.5', opacity: '.6'
    });
  }
}

function renderMoon() {
  const SYNODIC = 29.53058867;
  const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const now = Date.now() / 86400000;
  const phase = (((now - NEW_MOON) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC; // 0=new .5=full
  const illum = .5 * (1 - Math.cos(2 * Math.PI * phase));
  const names = ['朔月 · 新月', '娥眉月', '上弦月', '盈凸月', '望月 · 满月', '亏凸月', '下弦月', '残月'];
  $('#moon-phase').textContent = `${names[Math.round(phase * 8) % 8]} · ${Math.round(illum * 100)}%`;

  const R = 17, CX = 20, CY = 20;
  const k = Math.cos(2 * Math.PI * phase);
  const waxing = phase < .5;
  const lit = waxing
    ? `M ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${CX} ${CY + R} A ${Math.abs(k) * R} ${R} 0 0 ${k > 0 ? 1 : 0} ${CX} ${CY - R} Z`
    : `M ${CX} ${CY - R} A ${R} ${R} 0 0 0 ${CX} ${CY + R} A ${Math.abs(k) * R} ${R} 0 0 ${k > 0 ? 0 : 1} ${CX} ${CY - R} Z`;
  $('#moon-svg').innerHTML =
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="rgba(199,206,216,.13)" stroke="#8A6D2F" stroke-width="1"/>
     <path d="${lit}" fill="#E8C874"/>
     <circle cx="${CX}" cy="${CY}" r="${R + 2.5}" fill="none" stroke="rgba(201,162,39,.25)" stroke-width=".6"/>`;
}

seedStars($('#stars'), 90);
seedStars($('#stars2'), 40);
buildWheel();
renderMoon();

/* ═══════════ card SVG builders ═══════════ */

const CORNER_TICKS = (x, y, stroke) =>
  `<path d="M ${x} ${y} m -9 9 v -9 h 9" fill="none" stroke="${stroke}" stroke-width="1.4"/>`;

const moonRow = () => {
  // row of 8 moon phases along an arc under the mandala
  let s = '';
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (0.12 + 0.76 * i / 7);
    const x = 118 - 62 * Math.cos(a), y = 138 + 62 * Math.sin(a);
    const fill = i === 0 ? 'none' : i === 4 ? '#E8C874' : 'rgba(232,200,116,.35)';
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 0 || i === 4 ? 3 : 2}" fill="${fill}" stroke="#C9A227" stroke-width=".8"/>`;
  }
  return s;
};

function backSVG() {
  return `
  <svg viewBox="0 0 236 322" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="236" height="322" rx="14" fill="#141B33"/>
    <rect x="1" y="1" width="234" height="320" rx="13" stroke="#8A6D2F" stroke-width="1.4"/>
    <rect x="9" y="9" width="218" height="304" rx="9" stroke="rgba(201,162,39,.55)" stroke-width=".8"/>
    <rect x="15" y="15" width="206" height="292" rx="7" stroke="rgba(201,162,39,.28)" stroke-width=".5"/>
    ${CORNER_TICKS(22, 22, '#C9A227')}${CORNER_TICKS(214, 22, '#C9A227')}
    ${CORNER_TICKS(22, 300, '#C9A227')}${CORNER_TICKS(214, 300, '#C9A227')}
    <g stroke="#C9A227" stroke-width="1" transform="translate(118,138)">
      <circle r="66" stroke-opacity=".9"/>
      <circle r="58" stroke-opacity=".45" stroke-dasharray="2 5"/>
      <circle r="40" stroke-opacity=".8"/>
      <circle r="33" stroke-opacity=".4"/>
      <circle r="10" stroke-opacity=".9"/>
      <path d="M0,-66 0,66 M-66,0 66,0 M-46.7,-46.7 46.7,46.7 M46.7,-46.7 -46.7,46.7" stroke-opacity=".55"/>
      <path d="M0,-40 L4.7,-4.7 40,0 4.7,4.7 0,40 -4.7,4.7 -40,0 -4.7,-4.7 Z" fill="rgba(232,200,116,.1)"/>
      <circle r="4" fill="#E8C874" stroke="none"/>
    </g>
    ${moonRow()}
    <text x="118" y="252" text-anchor="middle" fill="rgba(232,200,116,.75)" font-family="Cinzel, serif" font-size="11" letter-spacing="4">✦ ✧ ✦</text>
    <text x="118" y="292" text-anchor="middle" fill="rgba(199,206,216,.4)" font-family="Cormorant, serif" font-style="italic" font-size="9" letter-spacing="2.5">the cards know</text>
    <text x="118" y="305" text-anchor="middle" fill="rgba(199,206,216,.3)" font-family="'Songti SC', serif" font-size="8" letter-spacing="4">牌 知 晓 一 切</text>
  </svg>`;
}

function frontSVG(card, cls = '') {
  return `
  <svg ${cls ? `class="${cls}" ` : ''}viewBox="0 0 236 322" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="parch-${card.n}" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="#F6F2E4"/>
        <stop offset="55%" stop-color="#F2EFE6"/>
        <stop offset="88%" stop-color="#E9E2CC"/>
        <stop offset="100%" stop-color="#DFD5B8"/>
      </radialGradient>
      <linearGradient id="gld-${card.n}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E8C874"/>
        <stop offset="55%" stop-color="#C9A227"/>
        <stop offset="100%" stop-color="#8A6D2F"/>
      </linearGradient>
    </defs>
    <rect width="236" height="322" rx="14" fill="url(#parch-${card.n})" stroke="#8A6D2F" stroke-width="1.4"/>
    <rect x="9" y="9" width="218" height="304" rx="9" fill="none" stroke="rgba(138,109,47,.75)" stroke-width="1"/>
    <rect x="15" y="15" width="206" height="292" rx="7" fill="none" stroke="rgba(138,109,47,.3)" stroke-width=".5"/>
    ${CORNER_TICKS(26, 26, `url(#gld-${card.n})`)}${CORNER_TICKS(210, 26, `url(#gld-${card.n})`)}
    ${CORNER_TICKS(26, 296, `url(#gld-${card.n})`)}${CORNER_TICKS(210, 296, `url(#gld-${card.n})`)}
    <text x="34" y="52" fill="#1A1712" font-family="Cinzel, serif" font-size="20" letter-spacing="2">${card.numeral}</text>
    <text x="202" y="292" fill="#1A1712" font-family="Cinzel, serif" font-size="20" letter-spacing="2" transform="rotate(180 202 285)">${card.numeral}</text>
    <g stroke="rgba(138,109,47,.35)" stroke-width=".7">
      <line x1="118" y1="68" x2="118" y2="208"/><line x1="48" y1="138" x2="188" y2="138"/>
      <line x1="68.5" y1="88.5" x2="167.5" y2="187.5"/><line x1="167.5" y1="88.5" x2="68.5" y2="187.5"/>
      <line x1="48" y1="120.5" x2="118" y2="138"/><line x1="48" y1="155.5" x2="118" y2="138"/>
      <line x1="188" y1="120.5" x2="118" y2="138"/><line x1="188" y1="155.5" x2="118" y2="138"/>
    </g>
    <circle cx="118" cy="138" r="56" fill="none" stroke="url(#gld-${card.n})" stroke-width="1.2"/>
    <circle cx="118" cy="138" r="61" fill="none" stroke="rgba(138,109,47,.35)" stroke-width=".5" stroke-dasharray="1 4"/>
    <g transform="translate(118,138) scale(.86)" fill="none" stroke="#1A1712" stroke-width="3"
       stroke-linecap="round" stroke-linejoin="round">${card.art}</g>
    <text x="118" y="238" text-anchor="middle" fill="#1A1712" font-family="'Songti SC', serif" font-weight="600" font-size="26" letter-spacing="10">${card.zh}</text>
    <text x="118" y="260" text-anchor="middle" fill="#8A6D2F" font-family="Cinzel, serif" font-size="10.5" letter-spacing="5">${card.en.split(' ').map(w => w.toUpperCase()).join(' ')}</text>
    <text x="118" y="279" text-anchor="middle" fill="rgba(138,109,47,.6)" font-size="8" letter-spacing="3">✦ · ✧ · ✦</text>
  </svg>`;
}

function slotCardHTML(card, reversed) {
  return `
    <div class="tcard">
      <div class="inner">
        <div class="face back">${backSVG()}</div>
        <div class="face front">${frontSVG(card, reversed ? 'rev' : '')}</div>
      </div>
    </div>`;
}

/* ═══════════ audio ═══════════ */
const bgm = new Audio(BGM_SRC);
bgm.loop = true;
bgm.volume = 0.45;

let muted = localStorage.getItem('arcana:muted') === '1';
let bgmStarted = false;

function syncMuteButton() {
  const btn = $('#mute');
  btn.setAttribute('aria-pressed', String(muted));
  btn.textContent = muted ? '声音 关' : '声音 开';
}

function playSfx(src, volume = 0.9) {
  if (muted) return;
  try {
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  } catch { /* audio is decorative; never block the flow */ }
}

function startBgm() {
  if (bgmStarted || muted) return;
  bgmStarted = true;
  bgm.play().catch(() => {});
}

$('#mute').addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('arcana:muted', muted ? '1' : '0');
  if (muted) bgm.pause();
  else { startBgm(); playSfx(CLICK_SFX, 0.5); }
  syncMuteButton();
});

document.addEventListener('pointerdown', startBgm, { once: true });
syncMuteButton();

/* ═══════════ scenes ═══════════ */
function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  $(`#scene-${id}`).classList.add('active');
}

/* ── phase 1: choose ── */
document.querySelectorAll('[data-spread]').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx(CLICK_SFX, 0.6);
    state.spread = SPREADS[btn.dataset.spread];
    state.question = $('#question').value.trim();
    startDraw();
  });
});

/* ── phase 2: draw ── */
function shuffledDeck() {
  const deck = MAJOR_ARCANA.map(card => ({
    card,
    reversed: Math.random() < REVERSE_CHANCE
  }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startDraw() {
  state.phase = 'draw';
  state.deck = shuffledDeck();
  state.picked = [];

  $('#pick-count').textContent = state.spread.hint;

  $('#slots').innerHTML = state.spread.labels.map(() => `
    <div class="slot-wrap">
      <div class="tcard empty"><div class="inner"><div class="face back"></div></div></div>
      <div class="slot-label"></div>
    </div>`).join('');

  renderFan();
  showScene('draw');
}

function renderFan() {
  const fan = $('#fan');
  const count = state.deck.length;
  const spread = 50;   // total degrees of the arc
  const step = 32;     // px between neighbouring card centers
  fan.innerHTML = state.deck.map((_, i) => {
    const r = ((i / (count - 1)) - 0.5) * spread;
    const x = (i - (count - 1) / 2) * step;
    // edges on top (like a hand-held fan)
    const z = 20 - Math.min(i, count - 1 - i);
    return `<button class="card" style="--r:${r.toFixed(2)}deg; left:calc(50% + ${x.toFixed(1)}px); transform:rotate(${r.toFixed(2)}deg); z-index:${z}"
      aria-label="卡牌 ${i + 1}">
      ${backSVG()}
      <span class="hit" aria-hidden="true"></span>
    </button>`;
  }).join('');

  fan.querySelectorAll('.card').forEach((el, i) => {
    el.addEventListener('click', () => pick(el, i));
  });
}

function fillSlot(index, drawn) {
  const wrap = $('#slots').querySelectorAll('.slot-wrap')[index];
  wrap.querySelector('.tcard').outerHTML = slotCardHTML(drawn.card, drawn.reversed);
  wrap.querySelector('.slot-label').textContent = state.spread.labels[index][0];
}

function pick(el, i) {
  if (state.phase !== 'draw') return;
  if (state.picked.length >= state.spread.n) return;
  if (el.classList.contains('taken')) return;

  playSfx(FLIP_SFX[Math.floor(Math.random() * FLIP_SFX.length)]);
  el.classList.add('taken');

  const drawn = state.deck[i];
  state.picked.push(drawn);
  fillSlot(state.picked.length - 1, drawn);

  if (state.picked.length === state.spread.n) {
    state.phase = 'revealing';
    setTimeout(reveal, 700);
  }
}

/* ── phase 3: reveal ── */
const toRoman = num => {
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
               [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = '';
  for (const [v, s] of map) while (num >= v) { out += s; num -= v; }
  return out;
};

const ELEMENTS_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.2"><path d="M12 3 20 19H4z"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.2"><path d="M12 21 4 5h16z"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.2"><path d="M12 3 20 19H4z"/><path d="M8.5 15h7"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.2"><path d="M12 21 4 5h16z"/><path d="M8.5 9h7"/></svg>`;

function reveal() {
  $('#fan').classList.add('fade-out');
  setTimeout(() => showScene('reveal'), 350);

  const slots = $('#reveal-slots');
  slots.innerHTML = state.picked.map((drawn, i) => `
    <div class="slot-wrap">
      ${slotCardHTML(drawn.card, drawn.reversed)}
      <div class="slot-label">${state.spread.labels[i][0]}</div>
    </div>`).join('');

  renderReading();

  const cards = slots.querySelectorAll('.tcard');
  cards.forEach((card, i) => {
    setTimeout(() => {
      playSfx(FLIP_SFX[i % FLIP_SFX.length]);
      card.classList.add('flip');
    }, 500 + i * 550);
  });
  const total = 500 + cards.length * 550 + 400;
  setTimeout(() => {
    $('#reveal-hint').textContent = state.question
      ? `你所问 · ${state.question}`
      : '牌面已启 · 顺从你的直觉去读';
    $('#reveal-hint').classList.add('q-hint');
  }, total);
}

function renderReading() {
  const now = new Date();
  const romanDate = `${toRoman(now.getFullYear())} · ${toRoman(now.getMonth() + 1)} · ${toRoman(now.getDate())}`;
  const div = `<div class="rd-div">✦</div>`;

  $('#reading').innerHTML = `
    <div class="rd-head"><span class="t">READING · 解读</span><span class="d">${romanDate}</span></div>
    ${div}
    ${state.picked.map((drawn, i) => {
      const { card, reversed } = drawn;
      const kw = reversed ? card.keywords.rev : card.keywords.up;
      const text = reversed ? card.rev : card.up;
      const [zhLabel, enLabel] = state.spread.labels[i];
      return `
      <div class="entry">
        <div class="slot">${zhLabel} · ${enLabel}</div>
        <div class="head">
          <span class="zh">${card.zh}</span>
          <span class="en">${card.numeral} · ${card.en}</span>
          <span class="orient ${reversed ? 'rev' : 'up'}">${reversed ? '逆位 · REVERSED' : '正位 · UPRIGHT'}</span>
        </div>
        <div class="kw">${kw.map(k => `<span>${k}</span>`).join('')}</div>
        <p>${text}</p>
      </div>${div}`;
    }).join('')}
    <div class="elements">${ELEMENTS_SVG}</div>`;
}

/* ── navigation ── */
$('#back-choose').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  state.phase = 'choose';
  showScene('choose');
});

$('#again').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  startDraw();
});

$('#change-spread').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  state.phase = 'choose';
  showScene('choose');
});
