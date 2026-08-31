// ARCANA — tarot flow: choose spread → draw from fan → reveal + reading.
import { MAJOR_ARCANA } from './cards.js';

const $ = (s, el = document) => el.querySelector(s);
const REVERSE_CHANCE = 0.4;

const SPREADS = {
  one:   { n: 1, labels: ['今日指引'], hint: '一张牌' },
  three: { n: 3, labels: ['过去', '现在', '未来'], hint: '三张牌' }
};

const FLIP_SFX = [1, 2, 3, 4].map(
  i => `/sounds/sfx/cards/Card Flips/Card Throw Swish ${i}.mp3`
);
const CLICK_SFX = '/sounds/sfx/Click.mp3';
const BGM_SRC = '/sounds/music/Night_Patterns_loop.mp3';

const state = { spread: null, deck: [], picked: [], phase: 'choose', question: '' };

/* ---------- audio ---------- */
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

// autoplay policy: music may only start after a user gesture
document.addEventListener('pointerdown', startBgm, { once: true });
syncMuteButton();

/* ---------- shared card markup ---------- */
const HALO = `<svg class="halo" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width=".6">
  <line x1="0" y1="0" x2="50" y2="50"/><line x1="100" y1="0" x2="50" y2="50"/>
  <line x1="0" y1="100" x2="50" y2="50"/><line x1="100" y1="100" x2="50" y2="50"/>
  <line x1="0" y1="25" x2="50" y2="50"/><line x1="0" y1="75" x2="50" y2="50"/>
  <line x1="100" y1="25" x2="50" y2="50"/><line x1="100" y1="75" x2="50" y2="50"/>
  <line x1="25" y1="0" x2="50" y2="50"/><line x1="75" y1="0" x2="50" y2="50"/>
  <line x1="25" y1="100" x2="50" y2="50"/><line x1="75" y1="100" x2="50" y2="50"/>
</svg>`;

const BACK_STAR = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5"
  stroke-linecap="round"><path d="M50 18v64M18 50h64M27 27l46 46M73 27 27 73"/><circle cx="50" cy="50" r="7"/></svg>`;

function cardBackHtml(marqueeText) {
  return `
    <div class="pattern"></div>
    <div class="rays">${HALO.replace('class="halo"', 'class="rays-svg"')}</div>
    <div class="emblem">${BACK_STAR}</div>
    <div class="marquee"><span>${marqueeText.repeat(8)}</span></div>`;
}

function cardFrontHtml(card, reversed) {
  const art = `<svg class="art" viewBox="0 0 100 100" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${card.art}</svg>`;
  return `
    <div class="content${reversed ? ' rev' : ''}">
      <span class="corner">${card.numeral}</span>
      <span class="corner flip">${card.numeral}</span>
      ${HALO}
      ${art}
      <div>
        <div class="name-zh">${card.zh}</div>
        <div class="name-en">${card.en}</div>
      </div>
    </div>`;
}

function slotCard(card, reversed) {
  return `
    <div class="tcard">
      <div class="inner">
        <div class="face back">${cardBackHtml('· pick me · 选我 ')}</div>
        <div class="face front">${card ? cardFrontHtml(card, reversed) : ''}</div>
      </div>
    </div>`;
}

/* ---------- scenes ---------- */
function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  $(`#scene-${id}`).classList.add('active');
}

/* ---------- phase 1: choose ---------- */
document.querySelectorAll('[data-spread]').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx(CLICK_SFX, 0.6);
    state.spread = SPREADS[btn.dataset.spread];
    state.question = $('#question').value.trim();
    startDraw();
  });
});

/* ---------- phase 2: draw ---------- */
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

  // empty slots
  $('#slots').innerHTML = state.spread.labels.map(label => `
    <div class="slot-wrap">
      <div class="tcard empty"><div class="inner">
        <div class="face back"></div>
      </div></div>
      <div class="slot-label">${label}</div>
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
      <span class="hit" aria-hidden="true"></span>
      <div class="mini">
        <div class="pattern"></div>
        <div class="rays">${HALO.replace('class="halo"', '')}</div>
        <div class="star">${BACK_STAR}</div>
      </div>
    </button>`;
  }).join('');

  fan.querySelectorAll('.card').forEach((el, i) => {
    el.addEventListener('click', () => pick(el, i));
  });
}

function fillSlot(index, drawn) {
  const wrap = $('#slots').querySelectorAll('.slot-wrap')[index];
  const tcard = wrap.querySelector('.tcard');
  tcard.classList.remove('empty');
  tcard.outerHTML = slotCard(drawn.card, drawn.reversed);
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

/* ---------- phase 3: reveal ---------- */
function reveal() {
  $('#fan').classList.add('fade-out');
  setTimeout(() => showScene('reveal'), 350);

  // build reveal slots + reading, then flip cards one by one
  const slots = $('#reveal-slots');
  slots.innerHTML = state.picked.map((drawn, i) => `
    <div class="slot-wrap">
      ${slotCard(drawn.card, drawn.reversed)}
      <div class="slot-label">${state.spread.labels[i]}</div>
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
  $('#reading').innerHTML = `
    <header><span>READING · 解读</span><span>${new Date().toLocaleDateString('zh-CN')}</span></header>
    ${state.picked.map((drawn, i) => {
      const { card, reversed } = drawn;
      const kw = reversed ? card.keywords.rev : card.keywords.up;
      const text = reversed ? card.rev : card.up;
      return `
      <div class="entry">
        <div class="slot">${state.spread.labels[i]}</div>
        <div class="head">
          <span class="zh">${card.zh}</span>
          <span class="en">${card.numeral} · ${card.en}</span>
          <span class="orient ${reversed ? 'rev' : 'up'}">${reversed ? '逆位 REVERSED' : '正位 UPRIGHT'}</span>
        </div>
        <div class="kw">${kw.map(k => `<span>${k}</span>`).join('')}</div>
        <p>${text}</p>
      </div>`;
    }).join('')}`;
}

/* ---------- navigation ---------- */
$('#back-choose').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  state.phase = 'choose';
  showScene('choose');
});

$('#again').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  startDraw(); // same spread, fresh deck
});

$('#change-spread').addEventListener('click', () => {
  playSfx(CLICK_SFX, 0.6);
  state.phase = 'choose';
  showScene('choose');
});
