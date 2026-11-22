import { getState } from '../storage.js';
import { getProfile } from '../services.js';
import { THEME_LABEL, PHASE_LABEL } from '../core/patterns.js';
import { el, esc, pct, fmtDate } from '../ui/dom.js';

export function render(root) {
  const s = getState();
  const p = getProfile();
  const maxScore = Math.max(0.01, ...p.weaknesses.map((w) => w.perGame));
  const games = s.games.filter((g) => g.summary).sort((a, b) => a.date - b.date).slice(-30);

  root.appendChild(el(`<section class="stack">
    <div class="card">
      <h1>Tu perfil de jugador</h1>
      <p class="muted">${p.games ? `Basado en tus últimas ${p.games} partidas analizadas (${p.userMoves} jugadas tuyas).` : 'Aún no hay partidas analizadas. Importa tus partidas de Chess.com o juega contra el bot.'}</p>
      <div class="stats-row">
        <div><b>${pct(p.accuracy)}</b><small>Precisión media</small></div>
        <div><b>${p.perGame.blunders.toFixed(1)}</b><small>Errores graves / partida</small></div>
        <div><b>${p.perGame.mistakes.toFixed(1)}</b><small>Errores / partida</small></div>
        <div><b>${s.rating.user}</b><small>Rating en la app</small></div>
        <div><b>${s.puzzle.rating}</b><small>Rating de puzzles</small></div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Puntos a mejorar</h2>
        ${p.weaknesses.length ? `<ul class="barlist">${p.weaknesses.slice(0, 8).map((w) => `<li>
          <div class="bl-head"><b>${esc(w.label)}</b><span>${w.perGame.toFixed(1)} / partida</span></div>
          <div class="hbar" title="${w.total} veces en ${p.games} partidas"><i style="width:${Math.max(4, (w.perGame / maxScore) * 100)}%"></i></div>
          <small>${esc(w.desc)}</small>
          <small class="advice">💡 ${esc(w.advice)}</small>
          ${w.themes[0] ? `<a class="btn small" href="#/train/puzzles?theme=${w.themes[0]}&count=8">Entrenar: ${esc(THEME_LABEL[w.themes[0]] || w.themes[0])}</a>` : w.modules.includes('openings') ? '<a class="btn small" href="#/train/openings">Entrenar aperturas</a>' : ''}
        </li>`).join('')}</ul>` : '<p class="muted">Sin datos todavía.</p>'}
      </div>
      <div class="stack">
        <div class="card">
          <h2>Fortalezas</h2>
          ${p.strengths.length ? `<ul class="slist">${p.strengths.slice(0, 6).map((w) => `<li><b>${esc(w.label)}</b> <span class="muted">(${w.total})</span><small>${esc(w.desc)}</small></li>`).join('')}</ul>` : '<p class="muted">Sin datos todavía.</p>'}
        </div>
        <div class="card">
          <h2>Precisión por fase</h2>
          <ul class="barlist">${Object.entries(p.phaseAccuracy).map(([k, v]) => `<li>
            <div class="bl-head"><b>${PHASE_LABEL[k]}${p.weakestPhase === k ? ' <span class="pill">más débil</span>' : ''}</b><span>${pct(v)}</span></div>
            <div class="hbar"><i style="width:${v || 0}%"></i></div></li>`).join('')}</ul>
        </div>
        <div class="card">
          <h2>Resultados por color</h2>
          <div class="stats-row compact">
            ${['w', 'b'].map((c) => { const x = p.byColor[c]; return `<div><b>${x.games ? Math.round((x.score / x.games) * 100) + '%' : '—'}</b><small>${c === 'w' ? 'Blancas' : 'Negras'} (${x.games} partidas)</small></div>`; }).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Errores graves por partida <small>últimas ${games.length}</small></h2>
        ${games.length >= 2 ? lineChart(games.map((g) => ({ x: g.date, y: g.summary.counts.blunder, label: `${fmtDate(g.date)} · vs ${g.opponent || ''}: ${g.summary.counts.blunder} errores graves` })), { yMin: 0, step: 1 }) : '<p class="muted">Necesitas al menos 2 partidas analizadas.</p>'}
        <p class="muted small">El objetivo es que esta línea baje con el tiempo.</p>
      </div>
      <div class="card">
        <h2>Rating en la app</h2>
        ${s.rating.history.length >= 2 ? lineChart(s.rating.history.slice(-50).map((h) => ({ x: h.date, y: h.rating, label: `${fmtDate(h.date)}: ${h.rating}` }))) : '<p class="muted">Juega partidas contra el bot para ver tu evolución.</p>'}
        ${chesscomLine(s)}
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>Aperturas</h2>
        ${p.openings.length ? `<table class="games"><thead><tr><th>Apertura</th><th>Partidas</th><th>Puntos</th></tr></thead><tbody>
          ${p.openings.slice(0, 10).map((o) => `<tr><td>${esc(o.name)}</td><td>${o.games}</td><td>${o.pct}%</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Sin datos.</p>'}
      </div>
      <div class="card">
        <h2>Puzzles por tema</h2>
        ${Object.keys(s.puzzle.themes).length ? `<table class="games"><thead><tr><th>Tema</th><th>Intentos</th><th>Acierto</th></tr></thead><tbody>
          ${Object.entries(s.puzzle.themes).sort((a, b) => b[1].a - a[1].a).map(([t, v]) => `<tr><td>${esc(THEME_LABEL[t] || t)}</td><td>${v.a}</td><td>${Math.round((v.s / v.a) * 100)}%</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Resuelve puzzles para ver tus estadísticas.</p>'}
      </div>
    </div>
  </section>`));
}

function chesscomLine(s) {
  const cc = s.games.filter((g) => g.source === 'chesscom' && g.userElo && g.timeClass === 'rapid').sort((a, b) => a.date - b.date);
  if (cc.length < 2) return '';
  return `<h3>Rating Chess.com (rápidas)</h3>${lineChart(cc.map((g) => ({ x: g.date, y: g.userElo, label: `${fmtDate(g.date)}: ${g.userElo}` })))}`;
}

/** Gráfico de línea SVG de una sola serie con puntos y tooltip nativo. */
function lineChart(points, { yMin = null, step = null } = {}) {
  const W = 320, H = 140, L = 34, R = 8, T = 10, B = 20;
  const ys = points.map((p) => p.y);
  let lo = yMin !== null ? yMin : Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi === lo) { hi += step || 10; if (yMin === null) lo -= step || 10; }
  const pad = (hi - lo) * 0.1;
  if (yMin === null) lo -= pad;
  hi += pad;
  const n = points.length;
  const X = (i) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => (step ? Math.round(v) : Math.round(v)));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de evolución">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="tick" x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${t}</text>`).join('')}
    <path class="series" d="${path}"/>
    ${points.map((p, i) => `<g class="pt"><circle class="hit" cx="${X(i)}" cy="${Y(p.y)}" r="8"/><circle class="dot" cx="${X(i)}" cy="${Y(p.y)}" r="3"/><title>${esc(p.label)}</title></g>`).join('')}
  </svg>`;
}
