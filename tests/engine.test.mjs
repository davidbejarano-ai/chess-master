import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../js/vendor/chess.js';
import { startEngine } from './helpers.mjs';
import { ENDGAMES } from '../js/core/endgames.js';
import { analyzeGame, terminalEval } from '../js/core/analysis.js';

let eng;
before(async () => { eng = startEngine(); await eng.init(); });
after(() => eng.quit());

const whitePov = (r, turn) => (r.mate !== undefined ? { mate: turn === 'w' ? r.mate : -r.mate } : { cp: turn === 'w' ? r.cp : -r.cp });

test('finales: el objetivo es alcanzable', { timeout: 120000 }, async () => {
  for (const e of ENDGAMES) {
    const c = new Chess(e.fen);
    const r = await eng.analyze(e.fen, 18);
    const ev = whitePov(r, c.turn());
    const side = e.side || 'w';
    const sign = side === 'w' ? 1 : -1;
    if (e.goal === 'draw') {
      assert.ok(ev.mate === undefined && Math.abs(ev.cp) < 150, `${e.id}: ${JSON.stringify(ev)}`);
    } else {
      const winning = ev.mate !== undefined ? ev.mate * sign > 0 : ev.cp * sign > 400;
      assert.ok(winning, `${e.id}: ${JSON.stringify(ev)}`);
      if (e.goal === 'mate' && ev.mate !== undefined) assert.ok(Math.abs(ev.mate) <= e.maxMoves, `${e.id} mate en ${ev.mate} > ${e.maxMoves}`);
    }
  }
});

test('análisis completo de una partida con el motor', { timeout: 120000 }, async () => {
  // Partida típica de principiante: el blanco cuelga piezas y recibe mate del pastor invertido
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'];
  const c = new Chess();
  const ucis = [];
  const fens = [c.fen()];
  for (const s of sans) { const m = c.move(s); ucis.push(m.from + m.to + (m.promotion || '')); fens.push(c.fen()); }
  const evals = [];
  for (const f of fens) {
    const cc = new Chess(f);
    if (!cc.moves().length) { evals.push(terminalEval(cc)); continue; }
    const r = await eng.analyze(f, 10);
    evals.push({ ...whitePov(r, cc.turn()), best: r.best, pv: r.pv.slice(0, 8) });
  }
  const { moves, summary } = analyzeGame({ ucis, userColor: 'w', evals, result: '0-1' });
  const white = moves.filter((m) => m.color === 'w');
  assert.ok(summary.counts.blunder >= 1, JSON.stringify(summary.counts));
  assert.ok(Object.keys(summary.tags).length > 0);
  // Las negras (rival) dieron mate
  assert.equal(moves.at(-1).san, 'Nf3#');
  console.log(white.map((m) => `${m.san}:${m.cls}[${m.tags.join(',')}]`).join(' '));
  console.log('tags', summary.tags, 'acc', summary.accuracy);
});
