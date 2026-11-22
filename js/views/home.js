import { getState } from '../storage.js';
import { getProfile, getTodayPlan, dueReviews } from '../services.js';
import { esc, el } from '../ui/dom.js';

const BLOCK_LINK = {
  puzzles: (b) => `#/train/puzzles?theme=${b.theme}&count=${b.count}&block=${b.id}`,
  review: (b) => `#/train/review?count=${b.count}&block=${b.id}`,
  openings: (b) => `#/train/openings?block=${b.id}`,
  endgames: (b) => `#/train/endgames?block=${b.id}`,
  game: (b) => `#/play?block=${b.id}`,
};
const BLOCK_ICON = { puzzles: '🧩', review: '🔁', openings: '📖', endgames: '🏁', game: '♟' };

export function render(root) {
  const s = getState();
  const profile = getProfile();
  let plan = getTodayPlan();
  const analyzedCount = s.games.filter((g) => g.analyzed).length;
  if (plan.basedOn !== analyzedCount) plan = getTodayPlan({ regenerate: true });
  const doneCount = plan.blocks.filter((b) => plan.done[b.id]).length;
  const totalMin = plan.blocks.reduce((a, b) => a + b.minutes, 0);
  const firstTime = !s.games.length;

  root.appendChild(el(`<section class="stack">
    ${firstTime ? `<div class="card hero">
      <h1>¡Bienvenido! Empecemos a mejorar tu ajedrez</h1>
      <p>La app aprende de tus partidas: detecta tus errores frecuentes y crea entrenamientos para corregirlos.</p>
      <ol class="steps">
        <li><b>Importa tus partidas de Chess.com</b> para un diagnóstico inmediato.</li>
        <li><b>Juega partidas de 10 minutos</b> contra un bot que se adapta a tu nivel.</li>
        <li><b>Completa el plan diario</b> (unos ${totalMin} minutos).</li>
      </ol>
      <div class="row">
        <a class="btn primary" href="#/games?import=1">Importar de Chess.com</a>
        <a class="btn" href="#/play">Jugar una partida</a>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-head">
        <h2>Plan de hoy <small>${doneCount}/${plan.blocks.length} · ~${totalMin} min</small></h2>
        <div class="progress-ring" style="--p:${Math.round((doneCount / plan.blocks.length) * 100)}"></div>
      </div>
      <p class="muted">${profile.games ? `Basado en tus últimas ${profile.games} partidas analizadas.` : 'Plan inicial para tu nivel. Se personalizará cuando analicemos tus partidas.'}</p>
      <ul class="plan">
        ${plan.blocks.map((b) => `<li class="${plan.done[b.id] ? 'done' : ''}">
          <a href="${BLOCK_LINK[b.type](b)}">
            <span class="pi">${plan.done[b.id] ? '✅' : BLOCK_ICON[b.type]}</span>
            <span class="pt"><b>${esc(b.title)}</b><small>${esc(b.why)}</small></span>
            <span class="pm">${b.minutes}′</span>
          </a></li>`).join('')}
      </ul>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Tus puntos a mejorar</h2>
        ${profile.weaknesses.length ? `<ol class="wlist">${profile.weaknesses.slice(0, 3).map((w) => `<li><b>${esc(w.label)}</b><small>${esc(w.advice)}</small></li>`).join('')}</ol>
          <a href="#/progress" class="link">Ver análisis completo →</a>`
        : '<p class="muted">Aún no hay datos. Juega o importa partidas para descubrirlos.</p>'}
      </div>
      <div class="card">
        <h2>Lo que haces bien</h2>
        ${profile.strengths.length ? `<ul class="slist">${profile.strengths.slice(0, 3).map((w) => `<li><b>${esc(w.label)}</b><small>${esc(w.desc)}</small></li>`).join('')}</ul>`
        : '<p class="muted">Tus fortalezas aparecerán aquí.</p>'}
      </div>
    </div>

    <div class="card stats-row">
      <div><b>${s.rating.user}</b><small>Rating en la app</small></div>
      <div><b>${s.puzzle.rating}</b><small>Rating de puzzles</small></div>
      <div><b>${profile.accuracy ?? '—'}${profile.accuracy ? '%' : ''}</b><small>Precisión media</small></div>
      <div><b>${dueReviews().length}</b><small>Errores por repasar</small></div>
      <div><b>${s.streak.days}</b><small>Días seguidos</small></div>
    </div>

    <div class="card tip">
      <h3>Rutina antes de cada jugada</h3>
      <p><b>1.</b> ¿Qué amenaza la última jugada del rival? <b>2.</b> ¿Tengo jaques, capturas o ataques? <b>3.</b> La casilla adonde muevo, ¿está defendida?</p>
    </div>
  </section>`));
}
