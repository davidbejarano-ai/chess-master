import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../js/vendor/chess.js';
import { isHanging, isFork, pinOrSkewer, motifOfMove, tryMove } from '../js/core/tactics.js';
import { classify, winPct, analyzeGame, openingFlags, errorTags, mistakePositions } from '../js/core/analysis.js';
import { buildProfile } from '../js/core/profile.js';
import { generatePlan, selectPuzzles, scheduleReview, updatePuzzleRating } from '../js/core/plan.js';
import { chooseBotMove, updateRating, nextBotRating } from '../js/core/bot.js';
import { validateRepertoire, openingName } from '../js/core/openings.js';
import { ENDGAMES } from '../js/core/endgames.js';
import { parseGame, parseClock } from '../js/chesscom.js';
import { WEAKNESSES, THEME_LABEL } from '../js/core/patterns.js';

test('pieza colgada', () => {
  const c = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR b KQkq - 1 2');
  assert.equal(isHanging(c, 'e5'), false); // defendido? no: e5 atacado por nada
  const c2 = new Chess('4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1');
  assert.equal(isHanging(c2, 'd5'), true);
});

test('horquilla de caballo', () => {
  const c = new Chess('r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1');
  const m = tryMove(c, 'g1f3'); // no es horquilla
  assert.equal(isFork(c, m), false);
  const c2 = new Chess('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1');
  assert.deepEqual(motifOfMove(c2.fen(), 'd5c7').includes('fork'), true);
});

test('clavada', () => {
  const c = new Chess('4k3/8/2n5/8/B7/8/8/4K3 w - - 0 1');
  assert.equal(pinOrSkewer(c, 'a4'), 'pin');
  const s = new Chess('8/8/8/8/8/3k3q/8/R3K3 w - - 0 1');
  const m = motifOfMove(s.fen(), 'a1a3');
  assert.ok(m.includes('skewer'), JSON.stringify(m));
});

test('clasificación por pérdida de % de victoria', () => {
  assert.equal(classify(0, true), 'best');
  assert.equal(classify(1, false), 'excellent');
  assert.equal(classify(8, false), 'inaccuracy');
  assert.equal(classify(15, false), 'mistake');
  assert.equal(classify(40, false), 'blunder');
  assert.ok(winPct({ cp: 300 }, 'w') > 70);
  assert.equal(winPct({ mate: -2 }, 'b'), 100);
});

test('analyzeGame etiqueta pieza colgada', () => {
  // 1.e4 d5 2.Qg4?? Bxg4
  const ucis = ['e2e4', 'd7d5', 'd1g4', 'c8g4'];
  const evals = [
    { cp: 30, best: 'e2e4' }, { cp: 30, best: 'd7d5' }, { cp: 40, best: 'e4d5' },
    { cp: -900, best: 'c8g4', pv: ['c8g4'] }, { cp: -900, best: 'g1f3' },
  ];
  const w = analyzeGame({ ucis, userColor: 'w', evals, result: '0-1' });
  assert.equal(w.moves[2].cls, 'blunder');
  assert.ok(w.moves[2].tags.includes('hanging'), w.moves[2].tags.join(','));
  assert.ok(w.summary.tags.hanging >= 1);
  assert.equal(mistakePositions(w.moves, 'w').length, 1);
  // Desde el punto de vista de las negras: aprovechó el error
  const b = analyzeGame({ ucis, userColor: 'b', evals, result: '0-1' });
  assert.equal(b.moves[3].cls, 'best');
  assert.ok(b.moves[3].good.includes('punished'));
  assert.ok(b.moves[3].good.includes('tookFreePiece'));
});

test('errorTags: permitir mate del pasillo', () => {
  const fen = '6k1/5ppp/8/8/8/8/5PPP/3r2K1 w - - 0 1';
  // El blanco juega h3?? no: posición ya es mate en 1 si mueve mal. Simulamos: blanco juega a3 y negro da Rd1 mate ya está; usamos otra
  const mv = { color: 'w', fenBefore: '6k1/5ppp/8/8/8/8/5PPP/R2r2K1 w - - 0 1', uci: 'a1a2', phase: 'endgame', wBefore: 50, wAfter: 0, drop: 50, clock: null };
  const tags = errorTags(mv, { mate: -1, best: 'd1d8', pv: ['d1d8'] }, { cp: 0 });
  assert.ok(fen && tags.includes('allowedMate'));
});

test('banderas de apertura', () => {
  const g = new Chess();
  const sans = ['e4', 'e5', 'Qh5', 'Nc6', 'f4', 'Nf6', 'Qf3', 'd6', 'Qg3', 'Be7', 'a3', 'O-O', 'b3', 'a6', 'c3', 'b6', 'd3', 'h6', 'h3', 'd5'];
  const ucis = sans.map((s) => { const m = g.move(s); return m.from + m.to; });
  const { flags } = openingFlags(ucis, 'w');
  assert.ok(flags.includes('earlyQueen'));
  assert.ok(flags.includes('fPawn'));
  assert.ok(flags.includes('samePieceTwice'));
  assert.ok(flags.includes('slowDevelopment'));
});

test('perfil y plan', () => {
  const mk = (tags, good) => ({ summary: { tags, good, counts: { best: 5, excellent: 5, good: 5, inaccuracy: 2, mistake: 1, blunder: 2 }, phaseAccuracy: { opening: 80, middlegame: 60, endgame: null }, accuracy: 70, userScore: 0 }, userColor: 'w', date: Date.now(), opening: 'Italiana' });
  const games = [mk({ hanging: 2, allowedMate: 1 }, { punished: 1 }), mk({ hanging: 1 }, {}), mk({ missedFork: 1 }, { foundMate: 1 })];
  const p = buildProfile(games);
  assert.equal(p.games, 3);
  assert.equal(p.weaknesses[0].id, 'hanging');
  assert.equal(p.weakestPhase, 'middlegame');
  const plan = generatePlan(p, { dueReviews: 3, dateStr: '2026-11-22' });
  assert.equal(plan.blocks[0].theme, 'hangingPiece');
  assert.ok(plan.blocks.some((b) => b.type === 'review'));
  assert.equal(plan.blocks.at(-1).type, 'game');
  const total = plan.blocks.reduce((a, b) => a + b.minutes, 0);
  assert.ok(total >= 20 && total <= 35, String(total));
  const empty = generatePlan(null, { dateStr: '2026-11-22' });
  assert.equal(empty.blocks[0].theme, 'hangingPiece');
});

test('todos los patrones tienen temas de puzzles existentes', () => {
  for (const [id, w] of Object.entries(WEAKNESSES)) for (const t of w.themes) assert.ok(THEME_LABEL[t], `${id}:${t}`);
});

test('puzzles: válidos y legales', () => {
  const puzzles = JSON.parse(readFileSync(new URL('../data/puzzles.json', import.meta.url)));
  assert.ok(puzzles.length > 1000);
  for (const p of puzzles.slice(0, 400)) {
    const c = new Chess(p.fen);
    for (const u of p.moves.split(' ')) assert.ok(tryMove(c, u), `${p.id} ${u}`);
  }
  const sel = selectPuzzles(puzzles, { theme: 'fork', rating: 600, count: 5 });
  assert.equal(sel.length, 5);
  assert.ok(sel.every((p) => p.themes.includes('fork')));
});

test('repetición espaciada y ratings', () => {
  const it = scheduleReview({ box: 0 }, true, 0);
  assert.equal(it.box, 1);
  assert.equal(it.due, 86400000);
  assert.equal(scheduleReview(it, false, 0).box, 0);
  assert.ok(updatePuzzleRating(600, 600, true) > 600);
  assert.ok(updateRating(300, 300, 1) > 300);
  assert.ok(updateRating(300, 300, 1, { hintsUsed: 1 }) < updateRating(300, 300, 1));
  assert.ok(nextBotRating(300, [0, 0, 0]) < nextBotRating(300, [1, 1, 1]));
});

test('bot de bajo nivel se equivoca a veces, alto nivel casi nunca', () => {
  const c = new Chess();
  const legal = c.moves({ verbose: true }).map((m) => ({ ...m, uci: m.from + m.to }));
  const lines = [{ uci: 'e2e4', cp: 40 }, { uci: 'd2d4', cp: 35 }, { uci: 'g2g4', cp: -150 }];
  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const count = (r) => { let off = 0; for (let i = 0; i < 2000; i++) { const u = chooseBotMove(lines, legal, r, rng); if (!['e2e4', 'd2d4'].includes(u)) off++; } return off / 2000; };
  const low = count(250), high = count(1800);
  assert.ok(low > 0.15, `low ${low}`);
  assert.ok(high < 0.05, `high ${high}`);
});

test('repertorio de aperturas legal y sin ambigüedades', () => {
  assert.deepEqual(validateRepertoire(), []);
  assert.equal(openingName(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']), 'Italiana');
  assert.equal(openingName(['e4', 'c5']), 'Siciliana');
});

test('finales: posiciones válidas', () => {
  for (const e of ENDGAMES) { const c = new Chess(e.fen); assert.ok(!c.isGameOver(), e.id); }
});

test('importación de Chess.com', () => {
  assert.equal(parseClock('[%clk 0:09:57.3]'), 597.3);
  const pgn = `[Event "Live Chess"]\n[White "Guasintonec"]\n[Black "rival"]\n[Result "0-1"]\n[TimeControl "600"]\n\n1. e4 {[%clk 0:09:58]} 1... e5 {[%clk 0:09:59]} 2. Qh5 {[%clk 0:09:50]} 2... Nc6 {[%clk 0:09:55]} 3. Bc4 {[%clk 0:09:40]} 3... g6 {[%clk 0:09:50]} 4. Qf3 {[%clk 0:09:30]} 4... Nf6 {[%clk 0:09:40]} 0-1`;
  const rec = parseGame({ pgn, rules: 'chess', white: { username: 'Guasintonec', rating: 257 }, black: { username: 'rival', rating: 300 }, time_control: '600', time_class: 'rapid', end_time: 1700000000, uuid: 'x1', url: 'u' }, 'guasintonec');
  assert.equal(rec.userColor, 'w');
  assert.equal(rec.ucis.length, 8);
  assert.equal(rec.clocks[0], 598);
  assert.equal(rec.baseTime, 600);
  assert.equal(rec.userElo, 257);
});

test('explicaciones del repaso de errores', async () => {
  const { explainGood, explainBad, nullMoveFen, lineToSan } = await import('../js/core/explain.js');
  // Dama colgada en g4: capturarla
  const fen = 'rnbqkbnr/ppp2ppp/8/3pp3/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 3';
  const good = explainGood({ fen, uci: 'c8g4', after: { cp: -900, best: 'g1f3', pv: ['g1f3'] }, played: 'Cf6', playedLabels: ['No capturas piezas gratis'] });
  assert.ok(good[0].includes('Captura la dama de g4'), good.join(' | '));
  assert.ok(good.some((l) => l.includes('posición ganadora')));
  const bad = explainBad({ fen, uci: 'g8f6', after: { cp: -60, best: 'g4h4', pv: ['g4h4'] }, before: { cp: -900 }, bestUci: 'c8g4' });
  assert.ok(bad.lines.some((l) => l.includes('pieza rival sin defensa')), bad.lines.join(' | '));
  // Dama atacada por el caballo: perderla
  const f2 = 'rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3';
  const b2 = explainBad({ fen: f2, uci: 'b1c3', after: { cp: -800, best: 'f6h5', pv: ['f6h5', 'g1f3'] }, before: { cp: 20 }, bestUci: 'h5e5' });
  assert.ok(b2.lines[0].includes('captura tu dama de h5'), b2.lines.join(' | '));
  assert.ok(b2.lines.some((l) => l.includes('piezas está atacada')));
  assert.equal(b2.replyUci, 'f6h5');
  // Mate en 1
  const f3 = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
  assert.ok(explainGood({ fen: f3, uci: 'd1d8', after: { mate: 0 } })[0].includes('jaque mate'));
  assert.equal(nullMoveFen('4k3/8/8/8/8/8/8/R3K3 b - - 0 1'), '4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  assert.equal(lineToSan('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e2e4', 'e7e5']), '1.e4 e5');
});
