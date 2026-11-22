// Clasificación de jugadas y etiquetado de patrones a partir de evaluaciones del motor.
// Funciones puras: reciben las evaluaciones ya calculadas.
import { Chess } from '../vendor/chess.js';
import {
  VALUE, opp, tryMove, isHanging, isFork, pinOrSkewer, playLine, motifOfMove, phaseOf, moveToUci, material,
} from './tactics.js';

export const THRESHOLDS = { inaccuracy: 6, mistake: 12, blunder: 20 };

/** Probabilidad de victoria (0-100) para las blancas dado un cp desde el punto de vista blanco. */
export function winPctFromCp(cp) {
  const c = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/**
 * Evaluación normalizada: { cp, mate } desde el punto de vista de las blancas.
 * Devuelve la probabilidad de victoria del color dado.
 */
export function winPct(ev, color) {
  let w;
  if (ev.mate !== undefined && ev.mate !== null) {
    if (ev.mate === 0) w = ev.mateWinner === 'w' ? 100 : ev.mateWinner === 'b' ? 0 : 50;
    else w = ev.mate > 0 ? 100 : 0;
  } else w = winPctFromCp(ev.cp);
  return color === 'w' ? w : 100 - w;
}

export function moveAccuracy(drop) {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export function classify(drop, isBest) {
  if (isBest) return 'best';
  if (drop >= THRESHOLDS.blunder) return 'blunder';
  if (drop >= THRESHOLDS.mistake) return 'mistake';
  if (drop >= THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (drop < 2) return 'excellent';
  return 'good';
}

/** Evaluación de una posición final (sin jugadas legales). */
export function terminalEval(chess) {
  if (chess.isCheckmate()) return { mate: 0, mateWinner: opp(chess.turn()) };
  return { cp: 0 };
}

/**
 * Analiza una partida.
 * @param {object} p
 * @param {string[]} p.ucis  jugadas en UCI
 * @param {string} [p.startFen]
 * @param {('w'|'b')} p.userColor
 * @param {Array<{cp?:number, mate?:number, best?:string, pv?:string[]}>} p.evals evaluación (POV blancas) de cada posición 0..N
 * @param {Array<number|null>} [p.clocks] segundos restantes tras cada jugada
 * @param {number} [p.baseTime] tiempo inicial en segundos
 * @param {string} [p.result] '1-0' | '0-1' | '1/2-1/2'
 */
export function analyzeGame({ ucis, startFen, userColor, evals, clocks = [], baseTime = 600, result }) {
  const chess = new Chess(startFen || undefined);
  const moves = [];
  for (let i = 0; i < ucis.length; i++) {
    const fenBefore = chess.fen();
    const color = chess.turn();
    const ply = i;
    const phase = phaseOf(chess, ply);
    const evBefore = evals[i];
    const m = tryMove(chess, ucis[i]);
    if (!m) break;
    const evAfter = chess.isGameOver() && !chess.moves().length ? terminalEval(chess) : evals[i + 1];
    if (!evBefore || !evAfter) break;
    const wBefore = winPct(evBefore, color);
    const wAfter = winPct(evAfter, color);
    const drop = Math.max(0, wBefore - wAfter);
    const isBest = evBefore.best === ucis[i] || (chess.isCheckmate());
    const cls = classify(drop, isBest);
    const clock = clocks[i] ?? null;
    const prevOwnClock = i >= 2 ? clocks[i - 2] ?? null : (clocks.length ? baseTime : null);
    const spent = clock !== null && prevOwnClock !== null ? Math.max(0, prevOwnClock - clock) : null;
    moves.push({
      ply, color, san: m.san, uci: ucis[i], fenBefore, phase,
      evalBefore: compactEval(evBefore), best: evBefore.best || null,
      bestSan: evBefore.best ? sanOf(fenBefore, evBefore.best) : null,
      pv: (evAfter.pv || []).slice(0, 6),
      wBefore: round1(wBefore), wAfter: round1(wAfter), drop: round1(drop), cls,
      accuracy: round1(moveAccuracy(drop)), clock, spent, tags: [], good: [],
    });
  }

  // Etiquetado
  for (let k = 0; k < moves.length; k++) {
    const mv = moves[k];
    if (mv.color !== userColor) continue;
    const prev = k > 0 ? moves[k - 1] : null;
    const nextEval = evals[mv.ply + 1];
    if (mv.drop >= THRESHOLDS.mistake) mv.tags = errorTags(mv, nextEval, evals[mv.ply], baseTime);
    else if (mv.drop < THRESHOLDS.inaccuracy) mv.good = successTags(mv, prev);
  }

  const summary = summarize(moves, userColor, result, startFen);
  return { moves, summary };
}

function round1(x) { return Math.round(x * 10) / 10; }
function compactEval(ev) { return ev.mate !== undefined && ev.mate !== null ? { mate: ev.mate } : { cp: ev.cp }; }

export function sanOf(fen, uci) {
  const c = new Chess(fen);
  const m = tryMove(c, uci);
  return m ? m.san : null;
}

function mateFor(ev, color) {
  if (!ev || ev.mate === undefined || ev.mate === null || ev.mate === 0) return null;
  const forWhite = ev.mate > 0;
  return (forWhite && color === 'w') || (!forWhite && color === 'b') ? Math.abs(ev.mate) : null;
}

/** Etiquetas de error para una jugada del usuario con pérdida significativa. */
export function errorTags(mv, evAfter, evBefore, baseTime = 600) {
  const tags = new Set();
  const user = mv.color;
  const them = opp(user);

  // Mates
  const mateAgainst = mateFor(evAfter, them);
  const mateAgainstBefore = mateFor(evBefore, them);
  if (mateAgainst && !mateAgainstBefore) {
    tags.add('allowedMate');
    if (evAfter.pv && isBackRankMate(mv, evAfter.pv)) tags.add('backRank');
  }
  const mateForUser = mateFor(evBefore, user);
  if (mateForUser && mateForUser <= 4 && !mateFor(evAfter, user)) tags.add('missedMate');

  // ¿Qué hace el rival como castigo?
  const afterUser = new Chess(mv.fenBefore);
  tryMove(afterUser, mv.uci);
  const punish = evAfter && evAfter.best;
  if (punish && !mateAgainst) {
    const before = new Chess(afterUser.fen());
    const after = new Chess(afterUser.fen());
    const pm = tryMove(after, punish);
    if (pm) {
      if (pm.captured && VALUE[pm.captured] >= 3) {
        const capturedSq = pm.flags.includes('e') ? null : pm.to;
        if (capturedSq && isHanging(before, capturedSq)) {
          // ¿Estaba ya atacada antes de la jugada del usuario?
          const original = new Chess(mv.fenBefore);
          const wasThere = original.get(capturedSq);
          if (capturedSq === mv.uci.slice(2, 4)) tags.add('hanging');
          else if (wasThere && wasThere.color === user && isHanging(original, capturedSq)) tags.add('ignoredThreat');
          else tags.add('hanging');
        }
      }
      if (isFork(after, pm)) tags.add('fellForFork');
      const ps = pinOrSkewer(after, pm.to);
      if (ps) tags.add('fellForPin');
    }
    // Combinaciones: la línea del motor gana material aunque la primera jugada no sea una captura simple
    if (evAfter.pv && evAfter.pv.length >= 2 && !tags.size) {
      const swing = materialSwing(afterUser.fen(), evAfter.pv, user, 6);
      if (swing >= 2) tags.add('fellForTactic');
    }
  }

  // Táctica que el usuario no vio
  if (mv.best && mv.best !== mv.uci) {
    const motifs = motifOfMove(mv.fenBefore, mv.best);
    if (motifs.includes('freePiece')) tags.add('missedCapture');
    if (motifs.includes('fork')) tags.add('missedFork');
    if (motifs.includes('pin') || motifs.includes('skewer')) tags.add('missedPin');
    if (motifs.includes('mate')) tags.add('missedMate');
  }

  // Ventaja desperdiciada
  if (mv.wBefore >= 75 && mv.wAfter < 60) tags.add('threwAdvantage');

  // Reloj
  if (mv.clock !== null && mv.clock !== undefined) {
    if (mv.clock < Math.max(30, baseTime * 0.08)) tags.add('timePressure');
    else if (mv.spent !== null && mv.spent < 3 && mv.drop >= THRESHOLDS.blunder) tags.add('impulsive');
  }

  if (![...tags].some((t) => !['timePressure', 'impulsive', 'threwAdvantage'].includes(t))) tags.add('positional');
  if (mv.phase === 'endgame') tags.add('endgameError');
  return [...tags];
}

/** Material que pierde `color` siguiendo la línea `pv` (máx. `plies` medias jugadas). */
export function materialSwing(fen, pv, color, plies = 6) {
  const start = new Chess(fen);
  const before = material(start, color) - material(start, opp(color));
  const { chess } = playLine(fen, pv, plies);
  const after = material(chess, color) - material(chess, opp(color));
  return before - after;
}

function isBackRankMate(mv, pv) {
  const afterUser = new Chess(mv.fenBefore);
  tryMove(afterUser, mv.uci);
  const { chess, moves } = playLine(afterUser.fen(), pv, 5);
  if (!chess.isCheckmate() || !moves.length) return false;
  const last = moves[moves.length - 1];
  const loser = chess.turn();
  const kingRank = loser === 'w' ? '1' : '8';
  const king = chess.findPiece({ type: 'k', color: loser })[0];
  return ['r', 'q'].includes(last.piece) && king && king[1] === kingRank && last.to[1] === kingRank;
}

/** Etiquetas de acierto. */
export function successTags(mv, prev) {
  const good = new Set();
  if (prev && prev.drop >= THRESHOLDS.mistake && (mv.cls === 'best' || mv.cls === 'excellent')) good.add('punished');
  const motifs = motifOfMove(mv.fenBefore, mv.uci);
  if (motifs.includes('mate')) good.add('foundMate');
  if (motifs.includes('freePiece')) good.add('tookFreePiece');
  if (motifs.includes('fork') && mv.cls !== 'good') good.add('foundFork');
  if ((motifs.includes('pin') || motifs.includes('skewer')) && mv.cls !== 'good') good.add('foundPin');
  if (mv.wBefore < 30 && mv.cls === 'best') good.add('toughDefense');
  return [...good];
}

/** Banderas de principios de apertura (para el usuario). */
export function openingFlags(ucis, userColor, startFen) {
  if (startFen && startFen !== new Chess().fen()) return { flags: [], good: [] };
  const chess = new Chess();
  const flags = new Set();
  const good = new Set();
  const moved = {};
  let own = 0;
  let castledAt = null;
  const startMinor = userColor === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  for (let i = 0; i < ucis.length; i++) {
    const wasCheck = chess.inCheck();
    const m = tryMove(chess, ucis[i]);
    if (!m) break;
    if (m.color !== userColor) continue;
    own++;
    if (m.flags.includes('k') || m.flags.includes('q')) castledAt = own;
    if (own <= 4 && m.piece === 'q') flags.add('earlyQueen');
    if (own <= 5 && m.piece === 'p' && m.from[0] === 'f') flags.add('fPawn');
    if (own <= 7 && ['n', 'b', 'q', 'r'].includes(m.piece) && !m.captured && !wasCheck) {
      const key = m.from;
      // pieza que ya se había movido (su casilla actual es destino previo)
      if (moved[key]) flags.add('samePieceTwice');
      moved[m.to] = true;
    }
    if (own === 10) {
      const undeveloped = startMinor.filter((s) => {
        const p = chess.get(s);
        return p && p.color === userColor && (p.type === 'n' || p.type === 'b');
      }).length;
      if (undeveloped >= 2) flags.add('slowDevelopment');
    }
  }
  if (own >= 14 && castledAt === null) {
    const king = chess.findPiece({ type: 'k', color: userColor })[0];
    const queensOn = chess.findPiece({ type: 'q', color: opp(userColor) }).length > 0;
    if (king && king[0] === 'e' && queensOn) flags.add('noCastle');
  }
  if (castledAt !== null && castledAt <= 10) good.add('castledEarly');
  if (own >= 10 && !flags.size) good.add('goodOpening');
  return { flags: [...flags], good: [...good] };
}

/** Resumen de la partida para el usuario. */
export function summarize(moves, userColor, result, startFen) {
  const mine = moves.filter((m) => m.color === userColor);
  const counts = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  const tags = {};
  const good = {};
  const phase = { opening: [], middlegame: [], endgame: [] };
  for (const m of mine) {
    counts[m.cls]++;
    m.tags.forEach((t) => { tags[t] = (tags[t] || 0) + 1; });
    m.good.forEach((t) => { good[t] = (good[t] || 0) + 1; });
    phase[m.phase].push(m.accuracy);
  }
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const accuracy = avg(mine.map((m) => m.accuracy));
  const phaseAccuracy = { opening: avg(phase.opening), middlegame: avg(phase.middlegame), endgame: avg(phase.endgame) };
  const of = openingFlags(moves.map((m) => m.uci), userColor, startFen);
  of.flags.forEach((t) => { tags[t] = (tags[t] || 0) + 1; });
  of.good.forEach((t) => { good[t] = (good[t] || 0) + 1; });

  const userScore = result === '1/2-1/2' ? 0.5 : result === (userColor === 'w' ? '1-0' : '0-1') ? 1 : result ? 0 : null;
  const maxWin = Math.max(0, ...mine.map((m) => m.wBefore));
  const minWin = Math.min(100, ...mine.map((m) => m.wBefore));
  if (maxWin >= 85 && userScore !== null && userScore < 1) tags.noConversion = 1;
  if (maxWin >= 85 && userScore === 1) good.converted = 1;
  if (minWin <= 15 && userScore !== null && userScore > 0) good.comeback = 1;
  return { accuracy, counts, tags, good, phaseAccuracy, userScore };
}

/** Recoge las posiciones de error del usuario para convertirlas en ejercicios de repaso. */
export function mistakePositions(moves, userColor) {
  return moves
    .filter((m) => m.color === userColor && m.drop >= THRESHOLDS.mistake && m.best)
    .map((m) => ({
      fen: m.fenBefore, best: m.best, bestSan: m.bestSan, played: m.san, drop: m.drop,
      tags: m.tags, phase: m.phase, evalBefore: m.evalBefore,
    }));
}

export { moveToUci };
