import { Chess } from '../vendor/chess.js';
import { Board } from '../ui/board.js';
import { getState } from '../storage.js';
import { WEAKNESSES, STRENGTHS, CLS_LABEL, PHASE_LABEL } from '../core/patterns.js';
import { el, esc, $, $$, fmtDate, pct } from '../ui/dom.js';

const CLS_ICON = { best: '★', excellent: '!', good: '✓', inaccuracy: '?!', mistake: '?', blunder: '??' };

export function render(root, { sub }) {
  const id = decodeURIComponent(sub[0] || '');
  const g = getState().games.find((x) => x.id === id);
  if (!g || !g.moves) {
    root.appendChild(el('<div class="card">Partida no encontrada o sin análisis. <a href="#/games">Volver</a></div>'));
    return;
  }
  const s = g.summary;
  const mine = g.moves.filter((m) => m.color === g.userColor);
  const keyMoments = mine.filter((m) => m.cls === 'blunder' || m.cls === 'mistake');
  const scoreTxt = s.userScore === 1 ? 'Victoria' : s.userScore === 0 ? 'Derrota' : s.userScore === 0.5 ? 'Tablas' : '';
  const tagList = Object.entries(s.tags).filter(([t]) => WEAKNESSES[t]).sort((a, b) => b[1] - a[1]);
  const goodList = Object.entries(s.good).filter(([t]) => STRENGTHS[t]).sort((a, b) => b[1] - a[1]);

  const node = el(`<section class="review-layout">
    <div class="board-col">
      <div class="player top"><span class="name">${esc(g.userColor === 'w' ? g.black : g.white)}</span></div>
      <div id="board"></div>
      <div class="player bottom"><span class="name">${esc(g.userColor === 'w' ? g.white : g.black)} (tú)</span></div>
      <div class="nav">
        <button class="btn" data-nav="first" aria-label="Inicio">⏮</button>
        <button class="btn" data-nav="prev" aria-label="Anterior">◀</button>
        <button class="btn" data-nav="next" aria-label="Siguiente">▶</button>
        <button class="btn" data-nav="last" aria-label="Final">⏭</button>
        <button class="btn" id="flip" aria-label="Girar">⟲</button>
      </div>
      <svg id="graph" class="graph" viewBox="0 0 100 30" preserveAspectRatio="none" aria-label="Gráfica de evaluación"></svg>
    </div>
    <aside class="side stack">
      <div class="card">
        <h2>${esc(scoreTxt)} <small>${esc(g.termination || '')} · ${fmtDate(g.date)}</small></h2>
        <p class="muted">${esc(g.opening || '')} · ${g.source === 'chesscom' ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">Chess.com</a>` : 'Partida en la app'}${g.hintsUsed ? ` · 💡 ${g.hintsUsed} pistas` : ''}</p>
        <div class="stats-row compact">
          <div><b>${pct(s.accuracy)}</b><small>Precisión</small></div>
          <div><b class="cls-blunder">${s.counts.blunder}</b><small>Graves</small></div>
          <div><b class="cls-mistake">${s.counts.mistake}</b><small>Errores</small></div>
          <div><b class="cls-inaccuracy">${s.counts.inaccuracy}</b><small>Imprec.</small></div>
          <div><b class="cls-best">${s.counts.best + s.counts.excellent}</b><small>Excelentes</small></div>
        </div>
        <div class="phase-row">${Object.entries(s.phaseAccuracy).map(([p, v]) => `<span>${PHASE_LABEL[p]}: <b>${pct(v)}</b></span>`).join('')}</div>
      </div>
      <div class="card" id="info"></div>
      <div class="card">
        <h3>Momentos clave</h3>
        ${keyMoments.length ? `<ul class="moments">${keyMoments.map((m) => `<li><button class="link" data-ply="${m.ply}">
          <span class="cls-${m.cls}">${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'} ${esc(m.san)} ${CLS_ICON[m.cls]}</span>
          <small>${m.tags.filter((t) => WEAKNESSES[t]).map((t) => esc(WEAKNESSES[t].label)).join(' · ')}</small></button></li>`).join('')}</ul>
          <a class="btn primary" href="#/train/review?game=${encodeURIComponent(g.id)}">Entrenar estos errores</a>`
        : '<p class="muted">¡Sin errores graves en esta partida! 👏</p>'}
      </div>
      <div class="card">
        <h3>Patrones de esta partida</h3>
        ${tagList.length ? `<ul class="tags bad">${tagList.map(([t, c]) => `<li title="${esc(WEAKNESSES[t].desc)}">${esc(WEAKNESSES[t].label)} ${c > 1 ? `×${c}` : ''}</li>`).join('')}</ul>` : ''}
        ${goodList.length ? `<ul class="tags good">${goodList.map(([t, c]) => `<li title="${esc(STRENGTHS[t].desc)}">${esc(STRENGTHS[t].label)} ${c > 1 ? `×${c}` : ''}</li>`).join('')}</ul>` : ''}
        ${!tagList.length && !goodList.length ? '<p class="muted">Sin patrones destacados.</p>' : ''}
      </div>
      <div class="card"><h3>Jugadas</h3><ol class="movelist review" id="moves"></ol></div>
    </aside>
  </section>`);
  root.appendChild(node);

  const board = new Board($('#board', node), { orientation: g.userColor, canMove: () => false });
  const fens = [g.moves[0].fenBefore];
  const tmp = new Chess(g.moves[0].fenBefore);
  for (const m of g.moves) { tmp.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] }); fens.push(tmp.fen()); }

  let idx = g.moves.length; // posición tras idx jugadas
  let showBest = false;

  // Lista de jugadas
  const ml = $('#moves', node);
  let html = '';
  for (let i = 0; i < g.moves.length; i += 2) {
    const a = g.moves[i], b = g.moves[i + 1];
    const cell = (m) => m ? `<button data-ply="${m.ply}" class="mv cls-${m.color === g.userColor ? m.cls : 'opp'}">${esc(m.san)}${m.color === g.userColor && ['inaccuracy', 'mistake', 'blunder'].includes(m.cls) ? `<sup>${CLS_ICON[m.cls]}</sup>` : ''}</button>` : '<span></span>';
    html += `<li>${cell(a)}${cell(b)}</li>`;
  }
  ml.innerHTML = html;

  // Gráfica
  const svg = $('#graph', node);
  const pts = g.moves.map((m, i) => {
    const w = m.color === g.userColor ? m.wAfter : 100 - m.wAfter;
    return [((i + 1) / g.moves.length) * 100, 30 - (w / 100) * 30];
  });
  pts.unshift([0, 30 - ((g.moves[0].color === g.userColor ? g.moves[0].wBefore : 100 - g.moves[0].wBefore) / 100) * 30]);
  svg.innerHTML = `<rect x="0" y="0" width="100" height="30" class="g-bg"/>
    <line x1="0" y1="15" x2="100" y2="15" class="g-mid"/>
    <polygon class="g-area" points="0,30 ${pts.map((p) => p.join(',')).join(' ')} 100,30"/>
    <polyline class="g-line" points="${pts.map((p) => p.join(',')).join(' ')}"/>
    ${keyMoments.map((m) => `<circle class="g-dot ${m.cls}" cx="${pts[m.ply + 1][0]}" cy="${pts[m.ply + 1][1]}" r="0.9"/>`).join('')}
    <line id="g-cur" x1="0" y1="0" x2="0" y2="30" class="g-cur"/>`;
  svg.addEventListener('click', (e) => {
    const r = svg.getBoundingClientRect();
    idx = Math.round(((e.clientX - r.left) / r.width) * g.moves.length);
    showBest = false; draw();
  });

  function draw() {
    idx = Math.max(0, Math.min(g.moves.length, idx));
    const m = idx > 0 ? g.moves[idx - 1] : null;
    if (showBest && m && m.best) {
      board.setPosition(m.fenBefore);
      const arrows = [{ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), kind: 'bad' }];
      if (m.best !== m.uci) arrows.push({ from: m.best.slice(0, 2), to: m.best.slice(2, 4), kind: 'good' });
      board.setArrows(arrows);
    } else {
      board.setPosition(fens[idx], m ? { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) } : null);
      board.setArrows([]);
    }
    $$('.mv', ml).forEach((b) => b.classList.toggle('cur', m && +b.dataset.ply === m.ply));
    const cur = ml.querySelector('.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
    $('#g-cur', node).setAttribute('x1', (idx / g.moves.length) * 100);
    $('#g-cur', node).setAttribute('x2', (idx / g.moves.length) * 100);
    $('#info', node).innerHTML = infoFor(m, g.userColor, showBest);
    const tb = $('#toggle-best', node);
    if (tb) tb.onclick = () => { showBest = !showBest; draw(); };
  }

  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ply]');
    if (b) { idx = +b.dataset.ply + 1; showBest = (e.target.closest('.moments') !== null); draw(); return; }
    const n = e.target.closest('[data-nav]');
    if (n) {
      showBest = false;
      idx = { first: 0, prev: idx - 1, next: idx + 1, last: g.moves.length }[n.dataset.nav];
      draw();
    }
  });
  $('#flip', node).onclick = () => board.flip();
  const key = (e) => {
    if (e.target.matches('input,select,textarea')) return;
    if (e.key === 'ArrowLeft') { idx--; showBest = false; draw(); }
    if (e.key === 'ArrowRight') { idx++; showBest = false; draw(); }
  };
  window.addEventListener('keydown', key);
  draw();
  return () => { window.removeEventListener('keydown', key); board.destroy(); };
}

function evalText(ev, color) {
  if (!ev) return '';
  if (ev.mate !== undefined) return `Mate en ${Math.abs(ev.mate)} para ${(ev.mate > 0) === (color === 'w') ? 'ti' : 'el rival'}`;
  const v = (color === 'w' ? ev.cp : -ev.cp) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} para ti`;
}

function infoFor(m, userColor, showBest) {
  if (!m) return '<p class="muted">Posición inicial. Usa ◀ ▶ o las flechas del teclado para navegar.</p>';
  const num = `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}`;
  if (m.color !== userColor) return `<p><b>${num} ${esc(m.san)}</b> <span class="muted">(rival)</span></p>`;
  const bad = ['inaccuracy', 'mistake', 'blunder'].includes(m.cls);
  const tags = m.tags.filter((t) => WEAKNESSES[t]);
  return `<p><b class="cls-${m.cls}">${num} ${esc(m.san)} — ${CLS_LABEL[m.cls]}</b></p>
    <p class="muted small">Probabilidad de ganar: ${Math.round(m.wBefore)}% → ${Math.round(m.wAfter)}% · Evaluación antes: ${esc(evalText(m.evalBefore, userColor))}${m.spent !== null && m.spent !== undefined ? ` · Pensaste ${Math.round(m.spent)} s` : ''}</p>
    ${bad && m.bestSan ? `<p>La mejor jugada era <b class="cls-best">${esc(m.bestSan)}</b>.</p>` : ''}
    ${tags.map((t) => `<div class="tagbox"><b>${esc(WEAKNESSES[t].label)}</b><br>${esc(WEAKNESSES[t].desc)}<br><i>${esc(WEAKNESSES[t].advice)}</i></div>`).join('')}
    ${m.good.length ? `<p class="good-note">✔ ${m.good.map((t) => esc(STRENGTHS[t] ? STRENGTHS[t].label : t)).join(' · ')}</p>` : ''}
    ${bad && m.best ? `<button class="btn small" id="toggle-best">${showBest ? 'Ver posición tras la jugada' : 'Comparar con la mejor jugada'}</button>` : ''}`;
}
