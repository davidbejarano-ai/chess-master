// Explicaciones en lenguaje natural de por qué una jugada es buena o mala (sin IA externa:
// reglas sobre la posición + la línea principal del motor).
import { Chess } from '../vendor/chess.js';
import {
  VALUE, opp, tryMove, isHanging, isFork, pinOrSkewer, attackedSquaresBy, material, uciToMove,
} from './tactics.js';
import { winPct } from './analysis.js';

const NAME = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
const ART = { p: 'el', n: 'el', b: 'el', r: 'la', q: 'la', k: 'el' };
const pieceName = (t, withArt = true) => (withArt ? `${ART[t]} ${NAME[t]}` : NAME[t]);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

/** Convierte una línea UCI a SAN numerada ("12.Cf3 Ad7 13.e4…"). */
export function lineToSan(fen, ucis, max = 6) {
  const c = new Chess(fen);
  const out = [];
  for (const u of ucis.slice(0, max)) {
    const n = c.moveNumber();
    const white = c.turn() === 'w';
    const m = tryMove(c, u);
    if (!m) break;
    out.push(white ? `${n}.${m.san}` : (out.length ? m.san : `${n}…${m.san}`));
  }
  return out.join(' ');
}

/** Material que gana `color` siguiendo la línea (positivo = gana). */
function materialAlong(fen, ucis, color, plies) {
  const c = new Chess(fen);
  const diff = () => material(c, color) - material(c, opp(color));
  const start = diff();
  for (const u of ucis.slice(0, plies)) if (!tryMove(c, u)) break;
  return { gain: diff() - start, chess: c };
}

/** Objetivos de una horquilla tras jugar `m` (ya aplicada en `after`). */
function forkTargets(after, m) {
  const attacker = after.get(m.to);
  return attackedSquaresBy(after, m.to)
    .map((s) => ({ s, p: after.get(s) }))
    .filter(({ p, s }) => p && p.color !== attacker.color && (p.type === 'k' || VALUE[p.type] > VALUE[attacker.type] || (VALUE[p.type] >= 3 && after.attackers(s, p.color).length === 0)));
}

function listNames(items) {
  const names = items.map(({ p, s }) => `${pieceName(p.type)} de ${s}`);
  return names.length > 1 ? names.slice(0, -1).join(', ') + ' y ' + names.at(-1) : names[0];
}

function mateFor(ev, color) {
  if (!ev || ev.mate === undefined || ev.mate === null || ev.mate === 0) return null;
  return (ev.mate > 0) === (color === 'w') ? Math.abs(ev.mate) : null;
}

/** Detalle de una clavada / rayos X creada por la pieza en `from`. */
function pinDetail(chess, from) {
  const kind = pinOrSkewer(chess, from);
  if (!kind) return null;
  const p = chess.get(from);
  const FILES = 'abcdefgh';
  const dirs = [];
  if (p.type !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  if (p.type !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  for (const [df, dr] of dirs) {
    let x = FILES.indexOf(from[0]) + df, y = +from[1] - 1 + dr;
    let first = null, firstSq = null;
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const sq = FILES[x] + (y + 1);
      const q = chess.get(sq);
      if (q) {
        if (q.color === p.color) break;
        if (!first) { first = q; firstSq = sq; } else {
          const ok = kind === 'pin' ? first.type !== 'k' && VALUE[q.type] > VALUE[first.type] : VALUE[first.type] > VALUE[q.type];
          if (ok) return { kind, first, firstSq, second: q, secondSq: sq };
          break;
        }
      }
      x += df; y += dr;
    }
  }
  return null;
}

/** Describe el motivo táctico de una jugada concreta en una posición. */
function describeMove(fen, uci) {
  const before = new Chess(fen);
  const after = new Chess(fen);
  const m = tryMove(after, uci);
  if (!m) return [];
  const out = [];
  if (after.isCheckmate()) return ['¡Es jaque mate!'];
  if (m.captured) {
    const victim = before.get(m.to) || { type: 'p' };
    const defended = before.attackers(m.to, victim.color).length > 0;
    if (!defended) out.push(`Captura ${pieceName(victim.type)} de ${m.to}, que estaba sin defensa.`);
    else if (VALUE[victim.type] > VALUE[m.piece]) out.push(`Cambia tu ${NAME[m.piece]} por ${pieceName(victim.type)}, que vale más (${VALUE[victim.type]} contra ${VALUE[m.piece]}).`);
  }
  if (isFork(after, m)) {
    const t = forkTargets(after, m);
    if (t.length >= 2) out.push(`Tu ${NAME[m.piece]} ataca a la vez ${listNames(t)}: el rival no puede salvar todo.`);
  }
  const ps = pinOrSkewer(after, m.to);
  if (ps === 'pin') out.push(`Clava una pieza rival: no puede moverse sin dejar expuesta otra más valiosa detrás.`);
  if (ps === 'skewer') out.push(`Es un ataque en rayos X: la pieza valiosa del rival tiene que apartarse y pierde la que está detrás.`);
  if (m.san.includes('+') && !out.length) out.push('Da jaque y obliga al rival a responder.');
  if (m.promotion) out.push(`Corona el peón y consigue una nueva ${NAME[m.promotion]}.`);
  if (m.flags.includes('k') || m.flags.includes('q')) out.push('Enroca: pone tu rey a salvo y activa la torre.');
  return out;
}

/** Piezas propias que estaban colgadas antes y dejan de estarlo después. */
function savedPieces(fen, uci, color) {
  const before = new Chess(fen);
  const after = new Chess(fen);
  const m = tryMove(after, uci);
  if (!m) return [];
  const saved = [];
  for (const row of before.board()) for (const p of row) {
    if (!p || p.color !== color || p.type === 'k' || VALUE[p.type] < 3) continue;
    if (!isHanging(before, p.square)) continue;
    const now = p.square === m.from ? m.to : p.square;
    const q = after.get(now);
    if (q && q.color === color && !isHanging(after, now)) saved.push({ type: p.type, square: p.square });
  }
  return saved;
}

/** FEN con el turno cambiado (para preguntar "¿qué amenaza el rival?"). Null si no es válido. */
export function nullMoveFen(fen) {
  const c = new Chess(fen);
  if (c.inCheck()) return null;
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const f = parts.join(' ');
  try {
    const t = new Chess(f);
    if (t.isAttacked(t.findPiece({ type: 'k', color: opp(t.turn()) })[0], t.turn())) return null;
    return f;
  } catch { return null; }
}

/** Describe la amenaza del rival (lo que haría si fuera su turno). */
export function describeThreat(fen, threat, color) {
  if (!threat || !threat.best) return null;
  const nf = nullMoveFen(fen);
  if (!nf) return null;
  const c = new Chess(nf);
  const m = tryMove(new Chess(nf), threat.best);
  if (!m) return null;
  const them = opp(color);
  const mate = mateFor(threat, them);
  if (mate) return { san: m.san, text: mate === 1 ? `amenazaba mate con ${m.san}` : `amenazaba un ataque de mate empezando por ${m.san}` };
  const { gain } = materialAlong(nf, threat.pv || [threat.best], them, 4);
  if (m.captured && VALUE[m.captured] >= 3 && gain >= 2) return { san: m.san, text: `amenazaba ${m.san}, capturando ${pieceName(m.captured)} de ${m.to}` };
  const after = new Chess(nf); tryMove(after, threat.best);
  if (isFork(after, m)) return { san: m.san, text: `amenazaba ${m.san}, con una horquilla` };
  if (gain >= 2) return { san: m.san, text: `amenazaba ganar material con ${m.san}` };
  void c;
  return null;
}

function evalPhrase(w) {
  if (w >= 90) return 'una posición ganadora';
  if (w >= 70) return 'una clara ventaja';
  if (w >= 57) return 'una ligera ventaja';
  if (w > 43) return 'una posición igualada';
  if (w > 30) return 'una posición algo peor';
  if (w > 10) return 'una posición difícil';
  return 'una posición perdida';
}

/**
 * Explica por qué una jugada (buena) funciona.
 * @param {object} p
 * @param {string} p.fen posición antes de la jugada
 * @param {string} p.uci jugada del usuario
 * @param {object} p.after evaluación tras la jugada (POV blancas) con best y pv
 * @param {object} [p.threat] evaluación de la posición con el turno cambiado (POV blancas): amenaza rival
 * @param {string} [p.played] jugada que se hizo en la partida original (SAN)
 * @param {string[]} [p.playedTags] etiquetas de error de la jugada original
 */
export function explainGood({ fen, uci, after, threat, played, playedLabels = [] }) {
  const color = new Chess(fen).turn();
  const lines = [];
  const afterPos = new Chess(fen);
  const mv = tryMove(afterPos, uci);
  const mate = mateFor(after, color);

  if (afterPos.isCheckmate()) lines.push('¡Es jaque mate! El rey rival no tiene escapatoria.');
  else if (mate) {
    lines.push(`Inicia un mate forzado en ${mate + 1} jugadas: ${lineToSan(fen, [uci, ...(after.pv || [])], mate * 2 + 1)}.`);
  } else {
    lines.push(...describeMove(fen, uci));
    const saved = savedPieces(fen, uci, color);
    if (saved.length) lines.push(`Salva tu ${NAME[saved[0].type]} de ${saved[0].square}, que estaba atacada y sin suficiente defensa.`);
    const th = threat ? describeThreat(fen, threat, color) : null;
    if (th) {
      // ¿la jugada neutraliza la amenaza? (la amenaza ya no gana tras la jugada)
      lines.push(`El rival ${th.text}; tu jugada lo evita.`);
    }
    const { gain } = materialAlong(fen, [uci, ...(after.pv || [])], color, 6);
    if (gain >= 2 && !lines.some((l) => l.startsWith('Captura') || l.includes('ataca a la vez'))) {
      lines.push(`Con la mejor continuación (${lineToSan(fen, [uci, ...(after.pv || [])], 6)}) ganas ${plural(gain, 'punto', 'puntos')} de material.`);
    }
    if (!lines.length) {
      lines.push(`Es la jugada más sólida: mejora tu posición sin dar oportunidades. La continuación esperada es ${lineToSan(fen, [uci, ...(after.pv || [])], 5)}.`);
    }
  }
  if (!afterPos.isCheckmate()) lines.push(`Después de ${mv ? mv.san : uci} tienes ${evalPhrase(winPct(after, color))}.`);
  if (played) lines.push(`En tu partida jugaste ${played}${playedLabels.length ? ` (${playedLabels.join(', ').toLowerCase()})` : ''}. Recuerda esta idea para la próxima vez.`);
  return lines;
}

/**
 * Explica por qué una jugada no es suficiente.
 * @param {object} p
 * @param {string} p.fen posición antes
 * @param {string} p.uci jugada del usuario
 * @param {object} p.after evaluación tras la jugada (POV blancas) con best (refutación) y pv
 * @param {object} p.before evaluación antes (POV blancas)
 * @param {string} p.bestUci mejor jugada (no se revela, solo se usa para dar una pista)
 */
export function explainBad({ fen, uci, after, before, bestUci }) {
  const color = new Chess(fen).turn();
  const them = opp(color);
  const pos = new Chess(fen);
  const mv = tryMove(pos, uci);
  const lines = [];
  const reply = after.best ? tryMove(new Chess(pos.fen()), after.best) : null;
  const pvSan = lineToSan(pos.fen(), after.pv && after.pv.length ? after.pv : (after.best ? [after.best] : []), 5);
  const mateAgainst = mateFor(after, them);

  if (pos.isStalemate()) lines.push('¡Es rey ahogado! La partida terminaría en tablas.');
  else if (mateAgainst) {
    lines.push(mateAgainst === 1 ? `Permite jaque mate inmediato: ${reply ? reply.san : ''}.` : `Permite un ataque de mate forzado: ${pvSan}.`);
  } else if (reply) {
    const replyAfter = new Chess(pos.fen()); tryMove(replyAfter, after.best);
    const { gain } = materialAlong(pos.fen(), after.pv && after.pv.length ? after.pv : [after.best], them, 6);
    const pin = pinDetail(replyAfter, reply.to);
    if (reply.captured && VALUE[reply.captured] >= 3 && gain >= 2) {
      const wasMoved = mv && reply.to === mv.to;
      lines.push(wasMoved
        ? `El rival responde ${reply.san} y captura tu ${NAME[reply.captured]}: la casilla ${reply.to} no estaba protegida.`
        : `El rival responde ${reply.san} y captura tu ${NAME[reply.captured]} de ${reply.to}, que quedó sin defensa.`);
    } else if (isFork(replyAfter, reply) && gain >= 2) {
      lines.push(`El rival responde ${reply.san} y ataca a la vez ${listNames(forkTargets(replyAfter, reply))}.`);
    } else if (pin && gain >= 2) {
      lines.push(pin.kind === 'pin'
        ? `El rival responde ${reply.san} y clava tu ${NAME[pin.first.type]} de ${pin.firstSq}: no puede moverse sin dejar ${pieceName(pin.second.type)} expuesto${pin.second.type === 'r' || pin.second.type === 'q' ? 'a' : ''}.`
        : `El rival responde ${reply.san} con un ataque en rayos X: ${pieceName(pin.first.type)} debe apartarse y pierdes ${pieceName(pin.second.type)} de detrás.`);
    } else if (gain >= 2) {
      lines.push(`Tras ${pvSan} el rival gana ${plural(gain, 'punto', 'puntos')} de material.`);
    } else if (winPct(after, color) >= 45) {
      lines.push('No pierdes material de inmediato, pero dejas escapar una jugada mucho mejor.');
    } else {
      lines.push(`El rival responde ${reply.san} y su posición mejora claramente (línea esperada: ${pvSan}).`);
    }
  }

  // Lo que se deja pasar (sin revelar la jugada)
  if (bestUci && bestUci !== uci) {
    const motifs = describeMove(fen, bestUci).join(' ');
    const mateBefore = mateFor(before, color);
    let hint = null;
    if (mateBefore) hint = mateBefore === 1 ? 'hay un jaque mate en una jugada' : `hay un mate forzado en ${mateBefore}`;
    else if (savedPieces(fen, bestUci, color).length) hint = 'una de tus piezas está atacada: búscale defensa o una casilla segura';
    else if (motifs.includes('ataca a la vez')) hint = 'hay una jugada que ataca dos piezas a la vez';
    else if (motifs.includes('sin defensa')) hint = 'hay una pieza rival sin defensa que puedes capturar';
    else if (motifs.includes('vale más')) hint = 'hay un cambio que te hace ganar material';
    else if (motifs.includes('Clava') || motifs.includes('rayos X')) hint = 'hay una clavada o un ataque en rayos X';
    else if (motifs.includes('jaque')) hint = 'mira los jaques disponibles';
    if (hint) lines.push(`Pista: ${hint}.`);
  }
  const wb = winPct(before, color), wa = winPct(after, color);
  lines.push(`Tu probabilidad de ganar bajaría de ${Math.round(wb)}% a ${Math.round(wa)}%.`);
  return { lines, replyUci: after.best || null };
}

export { uciToMove };
