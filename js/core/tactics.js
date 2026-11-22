// Detección de motivos tácticos sobre posiciones (funciones puras, sin motor).
import { Chess } from '../vendor/chess.js';

export const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = 'abcdefgh';

export function opp(color) { return color === 'w' ? 'b' : 'w'; }

export function sq(file, rank) {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return FILES[file] + (rank + 1);
}
export function fileOf(s) { return FILES.indexOf(s[0]); }
export function rankOf(s) { return parseInt(s[1], 10) - 1; }

export function uciToMove(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}
export function moveToUci(m) { return m.from + m.to + (m.promotion || ''); }

/** Intenta jugar una jugada UCI; devuelve el objeto Move o null. */
export function tryMove(chess, uci) {
  try { return chess.move(uciToMove(uci)); } catch { return null; }
}

/** Suma de material (sin rey) para un color. */
export function material(chess, color) {
  let total = 0;
  for (const row of chess.board()) for (const p of row) if (p && p.color === color && p.type !== 'k') total += VALUE[p.type];
  return total;
}

/** Material de piezas (sin peones ni rey) – usado para detectar finales. */
export function pieceMaterial(chess, color) {
  let total = 0;
  for (const row of chess.board()) for (const p of row) if (p && p.color === color && p.type !== 'k' && p.type !== 'p') total += VALUE[p.type];
  return total;
}

export function phaseOf(chess, ply) {
  const w = pieceMaterial(chess, 'w');
  const b = pieceMaterial(chess, 'b');
  if (w + b <= 26 || (w <= 13 && b <= 13)) return 'endgame';
  if (ply < 20) return 'opening';
  return 'middlegame';
}

/** Una pieza está "colgada" si la atacan y no está defendida, o la ataca algo de menor valor. */
export function isHanging(chess, square) {
  const piece = chess.get(square);
  if (!piece || piece.type === 'k') return false;
  const attackers = chess.attackers(square, opp(piece.color));
  if (!attackers.length) return false;
  const defenders = chess.attackers(square, piece.color);
  if (!defenders.length) return true;
  const minAtt = Math.min(...attackers.map((s) => VALUE[chess.get(s).type]));
  return minAtt < VALUE[piece.type];
}

/**
 * Valor de material que se gana de forma "obvia" con una captura (aprox. a 1 jugada):
 * pieza capturada menos el capturador si la casilla queda defendida.
 */
export function captureGain(chessBefore, move) {
  if (!move.captured) return 0;
  const captured = VALUE[move.captured];
  const after = new Chess(chessBefore.fen());
  const m = tryMove(after, moveToUci(move));
  if (!m) return 0;
  const recapture = after.attackers(move.to, opp(move.color)).length > 0;
  return recapture ? captured - VALUE[move.piece] : captured;
}

/**
 * Tras jugar `move` (ya aplicado en `chessAfter`), ¿la pieza movida ataca dos o más objetivos valiosos?
 * Objetivos: rey, piezas de mayor valor, o piezas no defendidas de valor >= 3.
 */
export function isFork(chessAfter, move) {
  const attacker = chessAfter.get(move.to);
  if (!attacker) return false;
  // la pieza que hace la horquilla no debe poder capturarse gratis
  if (isHanging(chessAfter, move.to) && attacker.type !== 'p') return false;
  const targets = attackedSquaresBy(chessAfter, move.to).filter((s) => {
    const p = chessAfter.get(s);
    if (!p || p.color === attacker.color) return false;
    if (p.type === 'k') return true;
    if (VALUE[p.type] > VALUE[attacker.type]) return true;
    return VALUE[p.type] >= 3 && chessAfter.attackers(s, p.color).length === 0;
  });
  return targets.length >= 2;
}

/** Casillas atacadas por la pieza situada en `from` (pseudo-legal, basado en geometría). */
export function attackedSquaresBy(chess, from) {
  const p = chess.get(from);
  if (!p) return [];
  const f = fileOf(from), r = rankOf(from);
  const out = [];
  const ray = (df, dr) => {
    let x = f + df, y = r + dr;
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const s = sq(x, y);
      out.push(s);
      if (chess.get(s)) break;
      x += df; y += dr;
    }
  };
  const step = (df, dr) => { const s = sq(f + df, r + dr); if (s) out.push(s); };
  switch (p.type) {
    case 'p': { const d = p.color === 'w' ? 1 : -1; step(-1, d); step(1, d); break; }
    case 'n': [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => step(a, b)); break;
    case 'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => ray(a, b)); break;
    case 'r': [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => ray(a, b)); break;
    case 'q': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => ray(a, b)); break;
    case 'k': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => step(a, b)); break;
  }
  return out;
}

/**
 * ¿La pieza de largo alcance en `from` crea una clavada o ataque en rayos X?
 * Devuelve 'pin' | 'skewer' | null.
 */
export function pinOrSkewer(chess, from) {
  const p = chess.get(from);
  if (!p || !['b', 'r', 'q'].includes(p.type)) return null;
  const dirs = [];
  if (p.type !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  if (p.type !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  const f = fileOf(from), r = rankOf(from);
  for (const [df, dr] of dirs) {
    let x = f + df, y = r + dr;
    let first = null;
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const s = sq(x, y);
      const q = chess.get(s);
      if (q) {
        if (!first) {
          if (q.color === p.color) break;
          first = q;
        } else {
          if (q.color === p.color) break;
          const v1 = VALUE[first.type], v2 = VALUE[q.type];
          // Clavada: la primera pieza no puede moverse sin exponer una más valiosa (o el rey).
          if (first.type !== 'k' && v2 > v1 && v1 >= 3) return 'pin';
          // Rayos X / enfilada: la pieza valiosa delante debe apartarse y se pierde la de atrás.
          if ((first.type === 'k' || v1 > VALUE[p.type]) && v1 > v2 &&
              (v2 >= 3 || chess.attackers(s, q.color).length === 0)) return 'skewer';
          break;
        }
      }
      x += df; y += dr;
    }
  }
  return null;
}

/** Juega una línea UCI desde un FEN y devuelve los objetos Move aplicados. */
export function playLine(fen, ucis, maxPlies = 99) {
  const c = new Chess(fen);
  const moves = [];
  for (const u of ucis.slice(0, maxPlies)) {
    const m = tryMove(c, u);
    if (!m) break;
    moves.push(m);
  }
  return { chess: c, moves };
}

/** Clasifica qué motivo táctico representa una jugada concreta en una posición. */
export function motifOfMove(fen, uci) {
  const before = new Chess(fen);
  const after = new Chess(fen);
  const m = tryMove(after, uci);
  if (!m) return [];
  const motifs = [];
  if (after.isCheckmate()) motifs.push('mate');
  if (m.captured) {
    const target = before.get(m.to);
    if (target && (VALUE[target.type] > VALUE[m.piece] || before.attackers(m.to, target.color).length === 0) && VALUE[target.type] >= 3) motifs.push('freePiece');
    else if (captureGain(before, m) >= 2) motifs.push('freePiece');
  }
  if (isFork(after, m)) motifs.push('fork');
  const ps = pinOrSkewer(after, m.to);
  if (ps) motifs.push(ps);
  return motifs;
}
