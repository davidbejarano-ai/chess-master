import { Chess } from '../vendor/chess.js';
import { Board } from '../ui/board.js';
import { playEngine } from '../engine.js';
import { chooseBotMove, botParams, updateRating, nextBotRating } from '../core/bot.js';
import { VALUE } from '../core/tactics.js';
import { getState, update } from '../storage.js';
import { analyzeRecord, storeAnalyzed } from '../analyzer.js';
import { getProfile, markBlockDone, activity } from '../services.js';
import { el, esc, $, fmtClock, toast } from '../ui/dom.js';
import { play } from '../ui/sound.js';

const TIME_OPTIONS = [
  { id: '600', label: '10 min', base: 600, inc: 0 },
  { id: '900+10', label: '15 | 10', base: 900, inc: 10 },
  { id: '300', label: '5 min', base: 300, inc: 0 },
  { id: 'none', label: 'Sin reloj', base: null, inc: 0 },
];

// La partida en curso sobrevive a la navegación entre pestañas.
let game = null;

export function render(root, { params }) {
  if (game && !game.over) return renderGame(root, params);
  return renderSetup(root, params);
}

function renderSetup(root, params) {
  const s = getState();
  const botRating = nextBotRating(s.rating.user, s.rating.recentScores);
  const focus = getProfile().weaknesses[0];
  const node = el(`<section class="stack narrow">
    <div class="card">
      <h1>Nueva partida</h1>
      <p class="muted">El bot juega a un nivel de <b>${botRating}</b> y se ajusta según tus resultados. Tu rating en la app: <b>${s.rating.user}</b>.</p>
      <h3>Color</h3>
      <div class="seg" data-name="color">
        <button data-v="w" class="on">♔ Blancas</button><button data-v="r">🎲 Aleatorio</button><button data-v="b">♚ Negras</button>
      </div>
      <h3>Ritmo</h3>
      <div class="seg" data-name="time">
        ${TIME_OPTIONS.map((t, i) => `<button data-v="${t.id}" class="${i === 0 ? 'on' : ''}">${t.label}</button>`).join('')}
      </div>
      ${focus ? `<div class="focus"><b>Objetivo para esta partida:</b> ${esc(focus.advice)}</div>` : ''}
      <button class="btn primary big" id="start">Empezar partida</button>
      <p class="muted small">Puedes pedir una pista en cualquier momento (💡). Quedará registrado y las victorias con pistas suman la mitad de puntos.</p>
    </div>
  </section>`);
  root.appendChild(node);
  const choice = { color: 'w', time: '600' };
  node.querySelectorAll('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    choice[seg.dataset.name] = b.dataset.v;
  }));
  $('#start', node).onclick = () => {
    const color = choice.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : choice.color;
    const t = TIME_OPTIONS.find((x) => x.id === choice.time);
    game = newGame(color, t, botRating, params.block);
    play('start');
    root.innerHTML = '';
    renderGame(root, params);
  };
}

function newGame(userColor, time, botRating, block) {
  return {
    id: 'app:' + Date.now(),
    chess: new Chess(),
    userColor, botRating, block,
    base: time.base, inc: time.inc,
    clock: { w: time.base, b: time.base },
    clocks: [], ucis: [], hints: 0,
    turnStart: null, over: false, thinking: false, started: Date.now(),
  };
}

function renderGame(root) {
  const g = game;
  const node = el(`<section class="play-layout">
    <div class="board-col">
      <div class="player top"><span class="name">🤖 Bot (${g.botRating})</span><span class="mat" id="mat-top"></span><span class="clock" id="clk-top"></span></div>
      <div id="board"></div>
      <div class="player bottom"><span class="name">🙂 Tú</span><span class="mat" id="mat-bot"></span><span class="clock" id="clk-bot"></span></div>
    </div>
    <aside class="side card">
      <div class="status" id="status"></div>
      <ol class="movelist" id="moves"></ol>
      <div class="controls">
        <button class="btn" id="hint" title="Pedir pista">💡 Pista</button>
        <button class="btn" id="flip" title="Girar tablero">⟲ Girar</button>
        <button class="btn danger" id="resign">🏳 Rendirse</button>
      </div>
      <div id="hint-info" class="muted small"></div>
    </aside>
  </section>`);
  root.appendChild(node);

  const board = new Board($('#board', node), {
    orientation: g.userColor,
    canMove: (c) => !g.over && !g.thinking && c === g.userColor,
    onMove: (m) => userMove(m),
  });
  board.setPosition(g.chess.fen(), lastMoveOf(g.chess));
  let timer = null;
  let alive = true;

  let shownFen = g.chess.fen();
  const refresh = () => {
    if (!alive) return;
    if (shownFen !== g.chess.fen()) {
      // la jugada se aplicó desde otra instancia de la vista (navegación durante el turno del bot)
      shownFen = g.chess.fen();
      board.setPosition(shownFen, lastMoveOf(g.chess));
      renderMoves();
      statusForTurn();
    }
    const top = g.userColor === 'w' ? 'b' : 'w';
    const now = Date.now();
    const live = (c) => {
      if (g.base === null) return null;
      let t = g.clock[c];
      if (!g.over && g.turnStart && g.chess.turn() === c) t -= (now - g.turnStart) / 1000;
      return t;
    };
    const ct = $('#clk-top', node), cb = $('#clk-bot', node);
    ct.textContent = g.base === null ? '' : fmtClock(live(top));
    cb.textContent = g.base === null ? '' : fmtClock(live(g.userColor));
    ct.classList.toggle('run', !g.over && g.chess.turn() === top);
    cb.classList.toggle('run', !g.over && g.chess.turn() === g.userColor);
    cb.classList.toggle('low', g.base !== null && live(g.userColor) < 30);
    // tiempo agotado
    if (!g.over && g.base !== null && g.turnStart) {
      const c = g.chess.turn();
      if (live(c) <= 0) { g.clock[c] = 0; timeout(c); }
    }
  };

  const renderMoves = () => {
    const h = g.chess.history();
    const ol = $('#moves', node);
    let html = '';
    for (let i = 0; i < h.length; i += 2) html += `<li><span>${esc(h[i])}</span><span>${esc(h[i + 1] || '')}</span></li>`;
    ol.innerHTML = html;
    ol.scrollTop = ol.scrollHeight;
    const diff = materialDiff(g.chess);
    const mine = g.userColor === 'w' ? diff : -diff;
    $('#mat-bot', node).textContent = mine > 0 ? `+${mine}` : '';
    $('#mat-top', node).textContent = mine < 0 ? `+${-mine}` : '';
  };

  const setStatus = (txt) => { $('#status', node).innerHTML = txt; };

  const statusForTurn = () => {
    if (g.over) return;
    setStatus(g.chess.turn() === g.userColor ? (g.chess.inCheck() ? '⚠️ ¡Estás en jaque!' : 'Tu turno') : '🤖 El bot está pensando…');
  };

  function stamp(color) {
    if (g.base === null) { g.clocks.push(null); return; }
    const spent = g.turnStart ? (Date.now() - g.turnStart) / 1000 : 0;
    g.clock[color] = Math.max(0, g.clock[color] - spent + (g.ucis.length > 1 ? g.inc : 0));
    g.clocks.push(Math.round(g.clock[color] * 10) / 10);
  }

  function apply(move) {
    const color = g.chess.turn();
    let m;
    try { m = g.chess.move(move); } catch { return null; }
    g.ucis.push(m.from + m.to + (m.promotion || ''));
    stamp(color);
    g.turnStart = Date.now();
    if (alive) {
      shownFen = g.chess.fen();
      board.setArrows([]);
      board.setPosition(shownFen, { from: m.from, to: m.to });
      renderMoves();
    }
    return m;
  }

  function userMove(m) {
    if (g.over || g.thinking) return;
    if (!apply(m)) return;
    $('#hint-info', node).textContent = '';
    if (checkEnd()) return;
    botTurn();
  }

  async function botTurn() {
    if (g.over) return;
    g.thinking = true;
    statusForTurn();
    const start = Date.now();
    const p = botParams(g.botRating);
    const fen = g.chess.fen();
    let uci;
    try {
      const res = await playEngine().analyze(fen, { depth: p.depth, multipv: p.multipv, movetime: 1500 });
      if (game !== g || g.over) return;
      const legal = g.chess.moves({ verbose: true }).map((x) => ({ ...x, uci: x.from + x.to + (x.promotion || '') }));
      uci = chooseBotMove(res.lines.map((l) => ({ uci: l.uci, cp: l.cp, mate: l.mate })), legal, g.botRating);
    } catch (e) {
      console.error(e);
      const legal = g.chess.moves({ verbose: true });
      const r = legal[Math.floor(Math.random() * legal.length)];
      uci = r.from + r.to + (r.promotion || '');
    }
    // pausa "humana"
    const moveNo = g.ucis.length / 2;
    const want = moveNo < 4 ? 400 + Math.random() * 600 : 700 + Math.random() * 2200;
    const wait = Math.max(0, want - (Date.now() - start));
    await new Promise((r) => setTimeout(r, wait));
    if (game !== g || g.over) return;
    apply({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    g.thinking = false;
    if (!checkEnd()) statusForTurn();
  }

  function checkEnd() {
    const c = g.chess;
    if (!c.isGameOver()) return false;
    let result, reason;
    if (c.isCheckmate()) { result = c.turn() === 'w' ? '0-1' : '1-0'; reason = 'Jaque mate'; }
    else if (c.isStalemate()) { result = '1/2-1/2'; reason = 'Rey ahogado'; }
    else if (c.isThreefoldRepetition()) { result = '1/2-1/2'; reason = 'Triple repetición'; }
    else if (c.isInsufficientMaterial()) { result = '1/2-1/2'; reason = 'Material insuficiente'; }
    else { result = '1/2-1/2'; reason = 'Regla de 50 jugadas'; }
    finish(result, reason);
    return true;
  }

  function timeout(color) {
    const other = color === 'w' ? 'b' : 'w';
    const hasMating = g.chess.board().flat().some((p) => p && p.color === other && p.type !== 'k');
    finish(hasMating ? (color === 'w' ? '0-1' : '1-0') : '1/2-1/2', 'Tiempo agotado');
  }

  async function finish(result, reason) {
    if (g.over) return;
    g.over = true;
    g.thinking = false;
    clearInterval(timer);
    const score = result === '1/2-1/2' ? 0.5 : result === (g.userColor === 'w' ? '1-0' : '0-1') ? 1 : 0;
    const s0 = getState();
    const newRating = updateRating(s0.rating.user, g.botRating, score, { gamesPlayed: s0.rating.games, hintsUsed: g.hints });
    const delta = newRating - s0.rating.user;
    update((s) => {
      s.rating.user = newRating;
      s.rating.games++;
      s.rating.history.push({ date: Date.now(), rating: newRating });
      s.rating.recentScores = [...s.rating.recentScores, score].slice(-10);
    });
    markBlockDone(g.block);
    activity('game');
    const label = score === 1 ? '🎉 ¡Ganaste!' : score === 0 ? 'Perdiste' : 'Tablas';
    setTimeout(() => play(score === 1 ? 'win' : 'end'), 350);
    setStatus(`<b>${label}</b> · ${esc(reason)} · Rating ${newRating} (${delta >= 0 ? '+' : ''}${delta})<div class="bar"><i id="an-bar" style="width:0%"></i></div><small id="an-txt">Analizando tu partida…</small>`);
    board.setPosition(g.chess.fen(), lastMoveOf(g.chess));
    const rec = {
      id: g.id, source: 'app', date: Date.now(), userColor: g.userColor,
      white: g.userColor === 'w' ? 'Tú' : `Bot ${g.botRating}`, black: g.userColor === 'b' ? 'Tú' : `Bot ${g.botRating}`,
      opponent: `Bot ${g.botRating}`, oppElo: g.botRating, userElo: s0.rating.user,
      result, termination: reason, baseTime: g.base || 600, timeControl: g.base === null ? 'sin reloj' : `${g.base}+${g.inc}`,
      ucis: g.ucis.slice(), clocks: g.base === null ? [] : g.clocks.slice(), hintsUsed: g.hints, ratingDelta: delta,
    };
    if (g.ucis.length < 2) { game = null; toast('Partida terminada'); return; }
    try {
      const analyzed = await analyzeRecord(rec, {
        depth: 12, urgent: true,
        onProgress: (p) => { const b = document.getElementById('an-bar'); if (b) b.style.width = Math.round(p * 100) + '%'; },
      });
      storeAnalyzed(analyzed);
      game = null;
      if (alive) location.hash = `#/review/${encodeURIComponent(rec.id)}`;
      else toast('Tu partida ya está analizada. Revísala en Partidas.', 'ok', 5000);
    } catch (e) {
      console.error(e);
      update((s) => { s.games.push(rec); });
      game = null;
      const t = document.getElementById('an-txt'); if (t) t.textContent = 'No se pudo analizar (¿motor no disponible?).';
    }
  }

  $('#flip', node).onclick = () => board.flip();
  $('#resign', node).onclick = () => {
    if (g.over) { game = null; location.hash = '#/play?new=' + Date.now(); return; }
    if (confirm('¿Seguro que quieres rendirte?')) finish(g.userColor === 'w' ? '0-1' : '1-0', 'Abandono');
  };
  $('#hint', node).onclick = async () => {
    if (g.over || g.thinking || g.chess.turn() !== g.userColor) return;
    $('#hint-info', node).textContent = 'Buscando la mejor jugada…';
    const res = await playEngine().analyze(g.chess.fen(), { depth: 14, multipv: 1, urgent: true });
    if (!res.best || g.chess.turn() !== g.userColor) return;
    g.hints++;
    board.setArrows([{ from: res.best.slice(0, 2), to: res.best.slice(2, 4), kind: 'hint' }]);
    $('#hint-info', node).textContent = `Pistas usadas en esta partida: ${g.hints}`;
  };

  const beforeUnload = (e) => { if (!g.over && g.ucis.length) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  renderMoves();
  timer = setInterval(refresh, 100);
  refresh();
  if (!g.turnStart) {
    g.turnStart = Date.now();
    playEngine().newGame();
  }
  if (g.chess.turn() !== g.userColor && !g.thinking) botTurn();
  else statusForTurn();

  return () => {
    alive = false;
    clearInterval(timer);
    board.destroy();
    window.removeEventListener('beforeunload', beforeUnload);
  };
}

function lastMoveOf(chess) {
  const h = chess.history({ verbose: true });
  const m = h[h.length - 1];
  return m ? { from: m.from, to: m.to } : null;
}

function materialDiff(chess) {
  let d = 0;
  for (const row of chess.board()) for (const p of row) if (p && p.type !== 'k') d += (p.color === 'w' ? 1 : -1) * VALUE[p.type];
  return d;
}
