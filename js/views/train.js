import { Chess } from '../vendor/chess.js';
import { Board } from '../ui/board.js';
import { analysisEngine, toWhitePov } from '../engine.js';
import { getState, update } from '../storage.js';
import { loadPuzzles, dueReviews, markBlockDone, activity, getProfile } from '../services.js';
import { selectPuzzles, updatePuzzleRating, scheduleReview } from '../core/plan.js';
import { THEME_LABEL, WEAKNESSES } from '../core/patterns.js';
import { REPERTOIRE, PRINCIPLES, buildTree } from '../core/openings.js';
import { ENDGAMES } from '../core/endgames.js';
import { winPct } from '../core/analysis.js';
import { explainGood, explainBad, nullMoveFen } from '../core/explain.js';
import { el, esc, $, toast } from '../ui/dom.js';
import { play } from '../ui/sound.js';

export async function render(root, { sub, params }) {
  const mode = sub[0] || 'menu';
  if (mode === 'puzzles') return puzzles(root, params);
  if (mode === 'review') return review(root, params);
  if (mode === 'openings') return openings(root, params);
  if (mode === 'endgames') return endgames(root, params);
  return menu(root);
}

/* ---------------- Menú ---------------- */
async function menu(root) {
  const s = getState();
  const all = await loadPuzzles();
  const counts = {};
  all.forEach((p) => p.themes.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  const weakThemes = new Set(getProfile().weaknesses.slice(0, 4).flatMap((w) => w.themes));
  const due = dueReviews().length;
  const themes = Object.keys(THEME_LABEL).filter((t) => counts[t]).sort((a, b) => (weakThemes.has(b) - weakThemes.has(a)));
  root.appendChild(el(`<section class="stack">
    <div class="grid3">
      <a class="card action" href="#/train/review"><span class="big-ic">🔁</span><b>Repasar mis errores</b><small>${due} posiciones pendientes · ${s.reviews.length} en total</small></a>
      <a class="card action" href="#/train/openings"><span class="big-ic">📖</span><b>Aperturas</b><small>Repertorio sencillo con blancas y negras</small></a>
      <a class="card action" href="#/train/endgames"><span class="big-ic">🏁</span><b>Finales básicos</b><small>${Object.values(s.endgames).filter((e) => e.done).length}/${ENDGAMES.length} completados</small></a>
    </div>
    <div class="card">
      <h2>Puzzles por tema <small>Rating ${s.puzzle.rating}</small></h2>
      <p class="muted">Los temas marcados con ⭐ corresponden a tus puntos débiles.</p>
      <div class="theme-grid">
        ${themes.map((t) => { const st = s.puzzle.themes[t]; return `<a class="theme" href="#/train/puzzles?theme=${t}&count=8">
          <b>${weakThemes.has(t) ? '⭐ ' : ''}${esc(THEME_LABEL[t])}</b>
          <small>${st ? `${Math.round((st.s / st.a) * 100)}% de ${st.a}` : `${counts[t]} puzzles`}</small></a>`; }).join('')}
        <a class="theme mix" href="#/train/puzzles?count=10"><b>🎲 Mezcla</b><small>Temas variados</small></a>
      </div>
    </div>
    <div class="card tip">
      <h3>Rutina anti-errores (antes de cada jugada)</h3>
      <ol>
        <li><b>¿Qué quiere el rival?</b> Mira qué atacó con su última jugada.</li>
        <li><b>Jaques, capturas, amenazas:</b> revisa las tuyas y las del rival.</li>
        <li><b>¿La casilla de destino es segura?</b> Cuenta atacantes y defensores.</li>
        <li><b>¿Qué pieza queda sin defensa</b> si muevo esta?</li>
      </ol>
    </div>
  </section>`));
}

/* ---------------- Puzzles ---------------- */
async function puzzles(root, params) {
  const all = await loadPuzzles();
  const s = getState();
  const count = +params.count || 6;
  const list = selectPuzzles(all, { theme: params.theme, rating: s.puzzle.rating, count, solved: s.puzzle.solved });
  const title = params.theme ? THEME_LABEL[params.theme] || params.theme : 'Mezcla de temas';
  const node = el(`<section class="train-layout">
    <div class="board-col"><div id="board"></div></div>
    <aside class="side card">
      <h2>🧩 ${esc(title)} <small id="pz-count"></small></h2>
      <div id="pz-status" class="status"></div>
      <div id="pz-info" class="muted small"></div>
      <div class="controls">
        <button class="btn" id="pz-hint">💡 Pista</button>
        <button class="btn" id="pz-sol">Ver solución</button>
        <button class="btn primary" id="pz-next" disabled>Siguiente ▶</button>
      </div>
      <div class="dots" id="pz-dots"></div>
    </aside>
  </section>`);
  root.appendChild(node);
  let i = 0;
  const results = [];
  let cur = null;
  const board = new Board($('#board', node), {
    canMove: (c) => cur && !cur.finished && c === cur.userColor && !cur.waiting,
    onMove: (m) => onUserMove(m),
  });

  const dots = () => { $('#pz-dots', node).innerHTML = list.map((_, k) => `<span class="dot ${results[k] === true ? 'ok' : results[k] === false ? 'ko' : k === i ? 'cur' : ''}"></span>`).join(''); };

  function load() {
    if (i >= list.length) return finish();
    const p = list[i];
    const moves = p.moves.split(' ');
    const chess = new Chess(p.fen);
    cur = { p, moves, chess, step: 1, failed: false, finished: false, waiting: true, userColor: chess.turn() === 'w' ? 'b' : 'w', hinted: false };
    board.setOrientation(cur.userColor);
    board.setPosition(p.fen);
    board.setArrows([]);
    $('#pz-count', node).textContent = `${i + 1}/${list.length}`;
    $('#pz-status', node).innerHTML = `Juegan las <b>${cur.userColor === 'w' ? 'blancas' : 'negras'}</b>. Encuentra la mejor jugada.`;
    $('#pz-info', node).textContent = `Puzzle ${p.rating} · ${p.themes.map((t) => THEME_LABEL[t] || t).join(', ')}`;
    $('#pz-next', node).disabled = true;
    dots();
    setTimeout(() => { if (cur.p !== p) return; playAuto(moves[0]); cur.waiting = false; }, 700);
  }

  function playAuto(uci) {
    const m = cur.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    board.setPosition(cur.chess.fen(), { from: m.from, to: m.to });
  }

  function onUserMove(m) {
    const expected = cur.moves[cur.step];
    const uci = m.from + m.to + (m.promotion || '');
    const test = new Chess(cur.chess.fen());
    let mv;
    try { mv = test.move(m); } catch { return; }
    const isLast = cur.step === cur.moves.length - 1;
    const ok = uci === expected || (isLast && test.isCheckmate());
    if (!ok) {
      board.setPosition(cur.chess.fen(), null);
      if (!cur.failed) { cur.failed = true; record(false); }
      play('wrong');
      $('#pz-status', node).innerHTML = `❌ <b>${esc(mv.san)}</b> no es la solución. Inténtalo otra vez o mira la solución.`;
      return;
    }
    playAuto(uci);
    cur.step++;
    if (cur.step >= cur.moves.length) return solved();
    $('#pz-status', node).innerHTML = '✅ ¡Bien! Sigue…';
    cur.waiting = true;
    setTimeout(() => { playAuto(cur.moves[cur.step]); cur.step++; cur.waiting = false; if (cur.step >= cur.moves.length) solved(); }, 500);
  }

  function record(success) {
    const p = cur.p;
    results[i] = success;
    update((s) => {
      const before = s.puzzle.rating;
      s.puzzle.rating = updatePuzzleRating(before, p.rating, success && !cur.hinted);
      if (success) s.puzzle.solved[p.id] = true;
      for (const t of p.themes) {
        s.puzzle.themes[t] = s.puzzle.themes[t] || { a: 0, s: 0 };
        s.puzzle.themes[t].a++;
        if (success && !cur.hinted) s.puzzle.themes[t].s++;
      }
      s.puzzle.history.push({ id: p.id, ok: success, d: Date.now() });
      if (s.puzzle.history.length > 500) s.puzzle.history.splice(0, s.puzzle.history.length - 500);
    });
    activity('puzzle');
    dots();
  }

  function solved() {
    cur.finished = true;
    setTimeout(() => play(cur.failed ? 'move' : 'correct'), 250);
    if (!cur.failed) record(true);
    $('#pz-status', node).innerHTML = cur.failed ? '✔ Completado (con error).' : `🎉 ¡Resuelto! Rating de puzzles: <b>${getState().puzzle.rating}</b>`;
    $('#pz-next', node).disabled = false;
  }

  function finish() {
    const ok = results.filter(Boolean).length;
    markBlockDone(params.block);
    $('#pz-status', node).innerHTML = `<b>Sesión terminada:</b> ${ok}/${list.length} correctos.`;
    $('#pz-next', node).disabled = true;
    node.querySelector('.controls').innerHTML = `<a class="btn primary" href="#/home">Volver al plan</a><a class="btn" href="#/train/puzzles?theme=${params.theme || ''}&count=${count}&r=${Date.now()}">Otra ronda</a>`;
  }

  $('#pz-next', node).onclick = () => { i++; load(); };
  $('#pz-hint', node).onclick = () => {
    if (!cur || cur.finished) return;
    cur.hinted = true;
    const u = cur.moves[cur.step];
    board.setMarks({ [u.slice(0, 2)]: 'hint' });
    setTimeout(() => board.setMarks({}), 1500);
  };
  $('#pz-sol', node).onclick = () => {
    if (!cur || cur.finished) return;
    if (!cur.failed) { cur.failed = true; record(false); }
    const u = cur.moves[cur.step];
    board.setArrows([{ from: u.slice(0, 2), to: u.slice(2, 4), kind: 'good' }]);
    $('#pz-status', node).innerHTML = 'Mira la flecha verde y juega la jugada para continuar.';
  };
  if (!list.length) { $('#pz-status', node).textContent = 'No hay puzzles para este tema.'; return () => board.destroy(); }
  load();
  return () => board.destroy();
}

/* ---------------- Repaso de errores ---------------- */
function review(root, params) {
  const s = getState();
  let items = params.game ? s.reviews.filter((r) => r.gameId === params.game) : dueReviews();
  items = items.slice(0, +params.count || 10);
  const node = el(`<section class="train-layout">
    <div class="board-col"><div id="board"></div></div>
    <aside class="side card">
      <h2>🔁 Repaso de tus errores <small id="rv-count"></small></h2>
      <div id="rv-status" class="status"></div>
      <div id="rv-info" class="small"></div>
      <div id="rv-explain" class="explain hidden"></div>
      <div class="controls">
        <button class="btn hidden" id="rv-retry">↺ Intentar de nuevo</button>
        <button class="btn" id="rv-sol">Ver solución</button>
        <button class="btn primary" id="rv-next" disabled>Siguiente ▶</button>
      </div>
      <p class="muted small">Cada posición viene de una de tus partidas. Si aciertas, volverá en unos días; si fallas, la verás de nuevo pronto.</p>
    </aside>
  </section>`);
  root.appendChild(node);
  if (!items.length) {
    node.querySelector('.side').innerHTML = `<h2>🔁 Repaso de tus errores</h2><p>${s.reviews.length ? '¡No tienes posiciones pendientes hoy! Vuelve mañana.' : 'Aún no hay errores guardados. Juega o importa partidas para generarlos.'}</p><a class="btn primary" href="#/home">Volver</a>`;
    markBlockDone(params.block);
    return;
  }
  let i = 0, cur = null;
  let okCount = 0;
  const board = new Board($('#board', node), {
    canMove: (c) => cur && !cur.done && !cur.checking && !cur.showingRefutation && c === cur.color,
    onMove: (m) => onMove(m),
  });

  function load() {
    if (i >= items.length) return finish();
    const it = items[i];
    const chess = new Chess(it.fen);
    cur = { it, chess, color: chess.turn(), done: false, attempts: 0 };
    // Amenaza del rival (qué haría si le tocara): se usa para explicar las jugadas defensivas.
    const nf = nullMoveFen(it.fen);
    cur.threat = nf ? analysisEngine().analyze(nf, { depth: 10, urgent: true })
      .then((r) => ({ ...toWhitePov(r.lines[0], new Chess(nf).turn()), best: r.best, pv: r.lines[0] ? r.lines[0].pv : [] }))
      .catch(() => null) : Promise.resolve(null);
    board.setOrientation(cur.color);
    board.setPosition(it.fen);
    board.setArrows([]);
    showExplain(null);
    $('#rv-retry', node).classList.add('hidden');
    $('#rv-count', node).textContent = `${i + 1}/${items.length}`;
    $('#rv-status', node).innerHTML = `Juegan las <b>${cur.color === 'w' ? 'blancas' : 'negras'}</b>. ¿Cuál es la mejor jugada?`;
    const tags = (it.tags || []).filter((t) => WEAKNESSES[t]).map((t) => WEAKNESSES[t].label);
    $('#rv-info', node).innerHTML = `<p class="muted">En tu partida jugaste <b>${esc(it.played)}</b>${tags.length ? ` (${esc(tags.join(', '))})` : ''}.</p>`;
    $('#rv-next', node).disabled = true;
  }

  function showExplain(html, kind = 'good') {
    const box = $('#rv-explain', node);
    if (!html) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.className = `explain ${kind}`;
    box.innerHTML = html;
  }

  async function onMove(m) {
    const uci = m.from + m.to + (m.promotion || '');
    const test = new Chess(cur.it.fen);
    let mv;
    try { mv = test.move(m); } catch { return; }
    board.setPosition(test.fen(), { from: m.from, to: m.to });
    const me = cur;
    cur.checking = true;
    $('#rv-status', node).textContent = 'Analizando tu jugada…';
    showExplain(null);
    let evAfter = null;
    try {
      if (test.isCheckmate()) evAfter = { mate: 0 };
      else {
        const r = await analysisEngine().analyze(test.fen(), { depth: 12, urgent: true });
        evAfter = { ...toWhitePov(r.lines[0], test.turn()), best: r.best, pv: r.lines[0] ? r.lines[0].pv : [] };
      }
    } catch { evAfter = null; }
    if (cur !== me) return;
    cur.checking = false;
    const before = cur.it.evalBefore;
    let ok = uci === cur.it.best || test.isCheckmate();
    if (!ok && evAfter) ok = winPct(before, cur.color) - winPct(evAfter, cur.color) < 5;
    cur.attempts++;
    if (ok) {
      cur.done = true;
      const first = cur.attempts === 1;
      if (first) okCount++;
      setTimeout(() => play('correct'), 200);
      $('#rv-status', node).innerHTML = uci === cur.it.best ? `✅ ¡Exacto! <b>${esc(mv.san)}</b> es la mejor jugada.` : `✅ <b>${esc(mv.san)}</b> también es muy buena. (La del motor: ${esc(cur.it.bestSan)})`;
      saveResult(first);
      $('#rv-next', node).disabled = false;
      $('#rv-retry', node).classList.add('hidden');
      const threat = await cur.threat;
      if (cur !== me) return;
      const lines = evAfter ? explainGood({ fen: cur.it.fen, uci, after: evAfter.mate === 0 ? { mate: 0 } : evAfter, threat, played: cur.it.played, playedLabels: (cur.it.tags || []).filter((t) => WEAKNESSES[t] && !['timePressure', 'impulsive'].includes(t)).map((t) => WEAKNESSES[t].label) }) : [];
      if (lines.length) showExplain(`<b>¿Por qué funciona?</b><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`, 'good');
    } else {
      play('wrong');
      saveResult(false);
      const { lines, replyUci } = evAfter ? explainBad({ fen: cur.it.fen, uci, after: evAfter, before, bestUci: cur.it.best }) : { lines: [], replyUci: null };
      $('#rv-status', node).innerHTML = `❌ <b>${esc(mv.san)}</b> no es suficiente.`;
      if (replyUci) {
        cur.showingRefutation = true;
        board.setArrows([{ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), kind: 'bad' }]);
      } else board.setPosition(cur.it.fen);
      showExplain(`<b>¿Por qué no funciona?</b><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${replyUci ? '<p class="small muted">La flecha roja muestra la respuesta del rival.</p>' : ''}`, 'bad');
      $('#rv-retry', node).classList.remove('hidden');
    }
  }

  function retry() {
    if (!cur || cur.done) return;
    cur.showingRefutation = false;
    board.setArrows([]);
    board.setPosition(cur.it.fen);
    $('#rv-retry', node).classList.add('hidden');
    $('#rv-status', node).innerHTML = `Juegan las <b>${cur.color === 'w' ? 'blancas' : 'negras'}</b>. Prueba otra jugada.`;
  }

  // Solo cuenta el primer intento.
  function saveResult(correct) {
    if (cur.saved) return;
    cur.saved = true;
    const id = cur.it.id;
    update((s) => { s.reviews = s.reviews.map((r) => (r.id === id ? scheduleReview(r, correct) : r)); });
    activity('review');
  }

  function finish() {
    markBlockDone(params.block);
    node.querySelector('.side').innerHTML = `<h2>🔁 Repaso terminado</h2><p>Acertaste <b>${okCount}/${items.length}</b> a la primera.</p><a class="btn primary" href="#/home">Volver al plan</a>`;
  }

  $('#rv-sol', node).onclick = () => {
    if (!cur || cur.done) return;
    saveResult(false);
    const b = cur.it.best;
    cur.showingRefutation = false;
    $('#rv-retry', node).classList.add('hidden');
    showExplain(null);
    board.setPosition(cur.it.fen);
    board.setArrows([{ from: b.slice(0, 2), to: b.slice(2, 4), kind: 'good' }]);
    $('#rv-status', node).innerHTML = `La mejor jugada era <b>${esc(cur.it.bestSan)}</b>. Juégala para continuar.`;
    cur.attempts++;
  };
  $('#rv-next', node).onclick = () => { i++; load(); };
  $('#rv-retry', node).onclick = retry;
  load();
  return () => board.destroy();
}

/* ---------------- Aperturas ---------------- */
function openings(root, params) {
  const s = getState();
  let color = params.color || (Object.keys(s.openings.w).length <= Object.keys(s.openings.b).length ? 'w' : 'b');
  const node = el(`<section class="train-layout">
    <div class="board-col"><div id="board"></div></div>
    <aside class="side card">
      <h2>📖 Aperturas</h2>
      <div class="seg" id="op-color"><button data-v="w">♔ Blancas</button><button data-v="b">♚ Negras</button></div>
      <p class="muted small" id="op-rep"></p>
      <div id="op-status" class="status"></div>
      <div id="op-note" class="note"></div>
      <div class="controls"><button class="btn" id="op-restart">↺ Otra línea</button></div>
      <p class="muted small" id="op-progress"></p>
      <details class="principles"><summary>Principios de apertura</summary>
        <ul>${PRINCIPLES.map((p) => `<li><b>${esc(p.title)}:</b> ${esc(p.text)}</li>`).join('')}</ul>
      </details>
    </aside>
  </section>`);
  root.appendChild(node);
  let tree, chess, nodeCur, depth, linesDone = 0, errors = 0, busy = false;
  const board = new Board($('#board', node), {
    canMove: (c) => !busy && nodeCur && c === color && Object.keys(nodeCur.children).length > 0,
    onMove: (m) => onMove(m),
  });

  function progressText() {
    const st = getState().openings[color];
    const lines = REPERTOIRE[color].lines;
    const learned = lines.filter((l) => st[l.name] && st[l.name].ok >= 2).length;
    $('#op-progress', node).textContent = `Líneas dominadas (2 veces sin error): ${learned}/${lines.length}`;
  }

  function start() {
    tree = buildTree(color);
    chess = new Chess();
    nodeCur = tree; depth = 0; errors = 0;
    board.setOrientation(color);
    board.setPosition(chess.fen());
    board.setArrows([]);
    $$('#op-color button', node).forEach((b) => b.classList.toggle('on', b.dataset.v === color));
    $('#op-rep', node).textContent = REPERTOIRE[color].name;
    $('#op-note', node).textContent = '';
    progressText();
    step();
  }

  function myTurn() { return chess.turn() === color; }

  function step() {
    const kids = Object.values(nodeCur.children);
    if (!kids.length) return lineDone();
    if (myTurn()) {
      $('#op-status', node).innerHTML = 'Tu turno: juega la jugada de tu repertorio.';
      return;
    }
    // Elegir la respuesta del rival, priorizando líneas menos practicadas
    const st = getState().openings[color];
    const weights = kids.map((k) => 1 / (1 + Math.min(...k.lines.map((l) => (st[l] ? st[l].ok : 0)))));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let pick = kids[0];
    for (let k = 0; k < kids.length; k++) { r -= weights[k]; if (r <= 0) { pick = kids[k]; break; } }
    busy = true;
    setTimeout(() => {
      const m = chess.move(pick.san);
      nodeCur = pick; depth++;
      board.setPosition(chess.fen(), { from: m.from, to: m.to });
      busy = false;
      step();
    }, 450);
  }

  function onMove(m) {
    const expected = Object.values(nodeCur.children)[0];
    const test = new Chess(chess.fen());
    let mv;
    try { mv = test.move(m); } catch { return; }
    if (mv.san !== expected.san) {
      errors++;
      board.setPosition(chess.fen(), null);
      const exp = new Chess(chess.fen()).move(expected.san);
      board.setArrows([{ from: exp.from, to: exp.to, kind: 'good' }]);
      play('wrong');
      $('#op-status', node).innerHTML = `✋ <b>${esc(mv.san)}</b> no es la jugada del repertorio. Juega <b>${esc(expected.san)}</b>.`;
      $('#op-note', node).textContent = expected.note || '';
      return;
    }
    chess.move(m);
    nodeCur = expected; depth++;
    board.setArrows([]);
    board.setPosition(chess.fen(), { from: mv.from, to: mv.to });
    $('#op-note', node).textContent = expected.note ? `💬 ${expected.note}` : '';
    step();
  }

  function lineDone() {
    const name = nodeCur.lines[0];
    update((s) => {
      const st = s.openings[color][name] || { seen: 0, ok: 0 };
      st.seen++;
      if (!errors) st.ok++;
      s.openings[color][name] = st;
    });
    linesDone++;
    activity('opening');
    setTimeout(() => play('correct'), 300);
    $('#op-status', node).innerHTML = `🎉 <b>Línea completada:</b> ${esc(name)} ${errors ? `(${errors} error${errors > 1 ? 'es' : ''})` : '¡sin errores!'}`;
    progressText();
    if (linesDone >= 3) { markBlockDone(params.block); toast('¡3 líneas practicadas! Bloque completado.', 'ok'); }
  }

  $('#op-color', node).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { color = b.dataset.v; start(); } });
  $('#op-restart', node).onclick = start;
  start();
  return () => board.destroy();
}

function $$(sel, root) { return [...root.querySelectorAll(sel)]; }

/* ---------------- Finales ---------------- */
function endgames(root, params) {
  const node = el(`<section class="train-layout">
    <div class="board-col"><div id="board"></div></div>
    <aside class="side card">
      <h2>🏁 Finales básicos</h2>
      <ul class="eg-list" id="eg-list"></ul>
      <div id="eg-status" class="status"></div>
      <div id="eg-tip" class="note"></div>
      <div class="controls"><button class="btn" id="eg-retry">↺ Reintentar</button></div>
    </aside>
  </section>`);
  root.appendChild(node);
  let cur = null;
  const board = new Board($('#board', node), {
    canMove: (c) => cur && !cur.over && !cur.thinking && c === cur.side,
    onMove: (m) => onMove(m),
  });

  function drawList() {
    const st = getState().endgames;
    $('#eg-list', node).innerHTML = ENDGAMES.map((e) => `<li><button class="link ${cur && cur.e.id === e.id ? 'on' : ''}" data-id="${e.id}">
      ${st[e.id] && st[e.id].done ? '✅' : '⬜'} ${esc(e.title)} <small>${'★'.repeat(e.level)}</small></button></li>`).join('');
  }

  function start(e) {
    cur = { e, chess: new Chess(e.fen), side: e.side || 'w', moves: 0, over: false, thinking: false };
    board.setOrientation(cur.side);
    board.setPosition(e.fen);
    board.setArrows([]);
    const goal = e.goal === 'mate' ? `Da jaque mate en ${e.maxMoves} jugadas o menos.` : e.goal === 'promote' ? 'Corona el peón y conserva la ventaja.' : `Consigue tablas (aguanta ${e.maxMoves} jugadas sin que corone).`;
    $('#eg-status', node).innerHTML = `<b>Objetivo:</b> ${goal}`;
    $('#eg-tip', node).textContent = `💡 ${e.tip}`;
    drawList();
    analysisEngine().newGame();
    if (cur.chess.turn() !== cur.side) engineMove();
  }

  function end(success, msg) {
    cur.over = true;
    setTimeout(() => play(success ? 'win' : 'end'), 300);
    $('#eg-status', node).innerHTML = `${success ? '🎉' : '❌'} ${msg}`;
    if (success) {
      update((s) => { const prev = s.endgames[cur.e.id] || {}; s.endgames[cur.e.id] = { done: true, best: Math.min(prev.best || 999, cur.moves) }; });
      markBlockDone(params.block);
      activity('endgame');
    }
    drawList();
  }

  function check() {
    const c = cur.chess, e = cur.e;
    const userPawns = c.findPiece({ type: 'p', color: cur.side }).length;
    if (e.goal === 'mate') {
      if (c.isCheckmate()) return end(c.turn() !== cur.side, c.turn() !== cur.side ? `¡Mate en ${cur.moves} jugadas!` : 'Te dieron mate.') || true;
      if (c.isDraw() || c.isStalemate()) return end(false, c.isStalemate() ? '¡Rey ahogado! Es tablas. Deja siempre una casilla libre al rey rival.' : 'Tablas. Has perdido material o repetido posiciones.') || true;
      if (cur.moves >= e.maxMoves && c.turn() === cur.side) return end(false, `Se acabaron las ${e.maxMoves} jugadas. ¡Inténtalo de nuevo!`) || true;
    }
    if (e.goal === 'draw') {
      const oppQueen = c.findPiece({ type: 'q', color: cur.side === 'w' ? 'b' : 'w' }).length;
      if (oppQueen) return end(false, 'El rival coronó. Ponte delante del peón y busca la oposición.') || true;
      if (c.isDraw() || c.isStalemate() || c.isInsufficientMaterial()) return end(true, '¡Tablas conseguidas!') || true;
      if (cur.moves >= e.maxMoves) return end(true, `¡Aguantaste ${e.maxMoves} jugadas! Defensa correcta.`) || true;
    }
    if (e.goal === 'promote') {
      if (c.isDraw() || c.isStalemate()) return end(false, c.isStalemate() ? 'Rey ahogado: tablas.' : 'Tablas: el peón se perdió.') || true;
      if (!userPawns && !c.findPiece({ type: 'q', color: cur.side }).length) return end(false, 'Perdiste el peón. Usa el rey para escoltarlo.') || true;
      if (cur.moves >= e.maxMoves && c.turn() === cur.side) return end(false, 'Se acabaron las jugadas.') || true;
    }
    return false;
  }

  async function onMove(m) {
    let mv;
    try { mv = cur.chess.move(m); } catch { return; }
    cur.moves++;
    board.setPosition(cur.chess.fen(), { from: mv.from, to: mv.to });
    if (cur.e.goal === 'promote' && mv.promotion) {
      cur.thinking = true;
      const r = await analysisEngine().analyze(cur.chess.fen(), { depth: 12, urgent: true });
      cur.thinking = false;
      const ev = toWhitePov(r.lines[0], cur.chess.turn());
      if (winPct(ev, cur.side) > 85 || cur.chess.isCheckmate()) return end(true, `¡Coronaste en ${cur.moves} jugadas con ventaja ganadora!`);
      return end(false, 'Coronaste, pero el rival puede capturar o empatar. Corona con el rey protegiendo.');
    }
    if (check()) return;
    engineMove();
  }

  async function engineMove() {
    cur.thinking = true;
    const me = cur;
    const r = await analysisEngine().analyze(cur.chess.fen(), { depth: 16, movetime: 600, urgent: true });
    if (cur !== me || cur.over) return;
    await new Promise((res) => setTimeout(res, 250));
    if (r.best) {
      const mv = cur.chess.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] });
      board.setPosition(cur.chess.fen(), { from: mv.from, to: mv.to });
    }
    cur.thinking = false;
    check();
  }

  $('#eg-list', node).addEventListener('click', (ev) => { const b = ev.target.closest('[data-id]'); if (b) start(ENDGAMES.find((x) => x.id === b.dataset.id)); });
  $('#eg-retry', node).onclick = () => cur && start(cur.e);
  const st = getState().endgames;
  start(ENDGAMES.find((e) => !(st[e.id] && st[e.id].done)) || ENDGAMES[0]);
  return () => board.destroy();
}
