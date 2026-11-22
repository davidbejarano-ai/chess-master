// Router principal y barra superior.
import { getState, subscribe } from './storage.js';
import { queue } from './analyzer.js';
import { $, $$, esc } from './ui/dom.js';
import * as home from './views/home.js';
import * as play from './views/play.js';
import * as games from './views/games.js';
import * as review from './views/review.js';
import * as progress from './views/progress.js';
import * as train from './views/train.js';
import * as settings from './views/settings.js';

const routes = { home, play, games, review, progress, train, settings };
let cleanup = null;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { name: parts[0] || 'home', sub: parts.slice(1), params };
}

async function navigate() {
  const { name, sub, params } = parseHash();
  const view = routes[name] || home;
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  const root = $('#view');
  root.innerHTML = '';
  root.className = 'view-' + name;
  $$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (name === 'review' ? 'games' : name)));
  try {
    cleanup = (await view.render(root, { sub, params })) || null;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="card error">Ocurrió un error: ${esc(e.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

function renderTop() {
  const s = getState();
  $('#top-stats').innerHTML = `
    <span title="Tu rating en la app">♟ ${s.rating.user}</span>
    <span title="Rating de puzzles">🧩 ${s.puzzle.rating}</span>
    <span title="Racha de días entrenando">🔥 ${s.streak.days}</span>
    <a href="#/settings" class="gear" aria-label="Ajustes">⚙</a>`;
}

queue.addEventListener('progress', (e) => {
  const { done, total, progress: p, running } = e.detail;
  const box = $('#bg-progress');
  if (!running || !total) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = `<span>Analizando partidas ${Math.min(done + 1, total)}/${total}</span><div class="bar"><i style="width:${Math.round(((done + p) / total) * 100)}%"></i></div>`;
});

window.addEventListener('hashchange', navigate);
subscribe(renderTop);
renderTop();
navigate();
