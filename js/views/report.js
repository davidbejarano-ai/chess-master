import { getState } from '../storage.js';
import { buildReport } from '../core/report.js';
import { THEME_LABEL, PHASE_LABEL } from '../core/patterns.js';
import { el, esc, pct, fmtDate } from '../ui/dom.js';

export const SELECTION_KEY = 'chessmaster.selection';

export function getSelection() {
  try { return JSON.parse(sessionStorage.getItem(SELECTION_KEY) || '[]'); } catch { return []; }
}
export function setSelection(ids) {
  try { sessionStorage.setItem(SELECTION_KEY, JSON.stringify(ids)); } catch { /* sin almacenamiento */ }
}

const link = (x) => `#/review/${encodeURIComponent(x.gameId)}?ply=${x.ply}`;

function momentList(items, render, max = 6) {
  if (!items.length) return '<p class="muted small">Ninguno en estas partidas.</p>';
  return `<ul class="moments">${items.slice(0, max).map((x) => `<li><a href="${link(x)}">${render(x)}</a></li>`).join('')}</ul>
    ${items.length > max ? `<p class="muted small">… y ${items.length - max} más.</p>` : ''}`;
}

export function render(root) {
  const ids = new Set(getSelection());
  const games = getState().games.filter((g) => ids.has(g.id));
  if (!games.length) {
    root.appendChild(el('<div class="card">No hay partidas seleccionadas. <a href="#/games">Elige partidas en la lista</a>.</div>'));
    return;
  }
  const r = buildReport(games);
  const span = games.length ? `${fmtDate(Math.min(...games.map((g) => g.date || Date.now())))} – ${fmtDate(Math.max(...games.map((g) => g.date || 0)))}` : '';
  const pg = (x) => (x / Math.max(1, r.games)).toFixed(1);
  const maxErr = Math.max(1, ...r.errorTypes.map((e) => e.count));

  root.appendChild(el(`<section class="stack">
    <div class="card">
      <div class="card-head"><h1>📊 Resumen de ${r.games} partida${r.games > 1 ? 's' : ''}</h1><a class="btn small" href="#/games">← Partidas</a></div>
      <p class="muted">${esc(span)}${r.withMoves < r.games ? ` · ${r.games - r.withMoves} partidas antiguas solo tienen datos generales` : ''}</p>
      <div class="stats-row">
        <div><b>${r.record.w}-${r.record.d}-${r.record.l}</b><small>Ganadas-Tablas-Perdidas</small></div>
        <div><b>${pct(r.accuracy)}</b><small>Precisión media</small></div>
        <div><b class="cls-blunder">${pg(r.counts.blunder)}</b><small>Errores graves / partida</small></div>
        <div><b class="cls-mistake">${pg(r.counts.mistake)}</b><small>Errores / partida</small></div>
        <div><b class="cls-best">${pg(r.counts.best + r.counts.excellent)}</b><small>Jugadas excelentes / partida</small></div>
      </div>
      <div class="phase-row">${['w', 'b'].map((c) => { const x = r.byColor[c]; return x.games ? `<span>${c === 'w' ? '♔ Blancas' : '♚ Negras'}: <b>${Math.round((x.score / x.games) * 100)}%</b> de puntos (${x.games})</span>` : ''; }).join('')}</div>
    </div>

    <div class="card tip">
      <h2>🧭 Conclusiones</h2>
      ${r.recommendations.length ? `<ul class="recs">${r.recommendations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>Pocas conclusiones con tan pocos datos: selecciona más partidas.</p>'}
    </div>

    <div class="grid2">
      <div class="card">
        <h2>❌ Tus errores</h2>
        ${r.errorTypes.length ? `<ul class="barlist">${r.errorTypes.slice(0, 7).map((e) => `<li>
          <div class="bl-head"><b>${esc(e.label)}</b><span>${e.count} · en ${e.games} de ${r.games}</span></div>
          <div class="hbar"><i style="width:${Math.max(4, (e.count / maxErr) * 100)}%"></i></div>
          <small>${esc(e.advice)}</small>
          ${e.themes[0] ? `<a class="btn small" href="#/train/puzzles?theme=${e.themes[0]}&count=8">Entrenar: ${esc(THEME_LABEL[e.themes[0]] || e.themes[0])}</a>` : ''}
        </li>`).join('')}</ul>` : '<p class="muted">¡Sin errores destacados!</p>'}
      </div>
      <div class="card">
        <h2>🙈 Omisiones <small>${r.missed.length}</small></h2>
        <p class="muted small">Oportunidades que tenías y no viste. Toca una para verla en la partida.</p>
        ${momentList(r.missed, (x) => `<span class="cls-mistake">${esc(x.move)}</span> <small>${esc(x.label)}: era <b>${esc(x.bestSan || '?')}</b> · vs ${esc(x.opponent)}</small>`)}
      </div>
    </div>

    <div class="card">
      <h2>🔀 Puntos de inflexión</h2>
      <div class="grid3">
        <div><h3 class="cls-blunder">📉 Donde empeoraste</h3>
          ${momentList(r.turning.worsened, (x) => `<span>${esc(x.move)}</span> <small>${Math.round(x.wBefore)}% → ${Math.round(x.wAfter)}%${x.tags.length ? ` · ${esc(x.tags[0])}` : ''} · vs ${esc(x.opponent)}</small>`)}</div>
        <div><h3 class="cls-best">📈 Donde aprovechaste un error</h3>
          ${momentList(r.turning.punished, (x) => `<span>${esc(x.move)}</span> <small>tras ${esc(x.oppMove)} del rival · +${x.gain}% · vs ${esc(x.opponent)}</small>`)}</div>
        <div><h3 class="cls-inaccuracy">😬 Oportunidades desaprovechadas</h3>
          <p class="muted small">El rival se equivocó y respondiste con otro error.</p>
          ${momentList(r.turning.letGo, (x) => `<span>${esc(x.move)}</span> <small>tras ${esc(x.oppMove)} · mejor era <b>${esc(x.bestSan || '?')}</b></small>`)}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>⭐ Tus mejores jugadas</h2>
        ${momentList(r.bestMoves, (x) => `<span class="cls-best">${esc(x.move)}</span> <small>${esc(x.labels.join(' · '))} · vs ${esc(x.opponent)}</small>`, 8)}
        ${r.strengths.length ? `<ul class="tags good">${r.strengths.slice(0, 6).map((s) => `<li title="${esc(s.desc)}">${esc(s.label)} ×${s.count}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="card">
        <h2>🧩 Por fase de la partida</h2>
        <ul class="barlist">${Object.entries(r.phase).map(([k, p]) => `<li>
          <div class="bl-head"><b>${PHASE_LABEL[k]}</b><span>${pct(p.accuracy)} · ${p.errors} errores en ${p.moves} jugadas</span></div>
          <div class="hbar"><i style="width:${p.accuracy || 0}%"></i></div></li>`).join('')}</ul>
        ${r.time ? `<h3>⏱ Reloj</h3>
          <p class="small">Tiempo medio por jugada: apertura <b>${r.time.avgSpent.opening ?? '—'} s</b>, medio juego <b>${r.time.avgSpent.middlegame ?? '—'} s</b>, final <b>${r.time.avgSpent.endgame ?? '—'} s</b>.</p>
          <p class="small">Errores con poco tiempo: <b>${r.time.pressureErrors}</b> · Errores graves impulsivos (&lt;3 s): <b>${r.time.impulsive}</b></p>` : ''}
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h2>📖 Aperturas</h2>
        <table class="games"><thead><tr><th>Apertura</th><th>Partidas</th><th>Puntos</th><th>Precisión</th></tr></thead><tbody>
          ${r.openings.slice(0, 8).map((o) => `<tr><td>${esc(o.name)}</td><td>${o.games}</td><td>${o.pct}%</td><td>${pct(o.accuracy)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card">
        <h2>🎯 Siguiente paso</h2>
        <p>Practica las posiciones exactas donde fallaste en estas partidas.</p>
        <a class="btn primary" href="#/train/review?games=${encodeURIComponent([...ids].join(','))}&count=10">Repasar errores de estas partidas</a>
        ${r.errorTypes[0] && r.errorTypes[0].themes[0] ? `<p></p><a class="btn" href="#/train/puzzles?theme=${r.errorTypes[0].themes[0]}&count=8">Puzzles: ${esc(THEME_LABEL[r.errorTypes[0].themes[0]])}</a>` : ''}
      </div>
    </div>
  </section>`));
}
