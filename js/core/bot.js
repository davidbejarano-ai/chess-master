// Bot adaptativo: elige jugadas "humanas" según un rating objetivo.
import { VALUE } from './tactics.js';
import { winPctFromCp } from './analysis.js';
import { eloExpected } from './plan.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

/** Parámetros de juego para un rating. */
export function botParams(rating) {
  const t = clamp((rating - 200) / 1600, 0, 1); // 200 → 0, 1800 → 1
  return {
    depth: Math.round(lerp(6, 12, t)),
    multipv: 6,
    randomChance: lerp(0.30, 0.01, Math.pow(t, 0.7)),   // jugada "despistada"
    temperature: lerp(14, 1.5, t),                       // en puntos de % de victoria
    missFreeCapture: lerp(0.35, 0.02, t),                // a veces no ve material gratis
  };
}

function scoreToWin(line) {
  if (line.mate !== undefined && line.mate !== null) return line.mate > 0 ? 100 - line.mate * 0.1 : line.mate * -0.1;
  return winPctFromCp(line.cp);
}

/**
 * Elige una jugada.
 * @param {Array<{uci:string, cp?:number, mate?:number}>} lines líneas MultiPV (POV del bot)
 * @param {Array<{uci:string, captured?:string, piece:string, san:string}>} legal jugadas legales (verbose + uci)
 * @param {number} rating
 * @param {() => number} rng
 */
export function chooseBotMove(lines, legal, rating, rng = Math.random) {
  const p = botParams(rating);
  if (!lines.length) return legal[Math.floor(rng() * legal.length)].uci;
  // Si hay mate en 1, los jugadores de bajo nivel a veces lo ven, a veces no
  const mate1 = lines.find((l) => l.mate === 1);
  if (mate1 && rng() > p.randomChance) return mate1.uci;

  if (rng() < p.randomChance) {
    // Jugada "plausible" aleatoria: preferimos capturas, jaques y desarrollo sobre movimientos raros.
    const weights = legal.map((m) => {
      let w = 1;
      if (m.captured) w += 2 + VALUE[m.captured] / 3;
      if (m.san.includes('+')) w += 1.5;
      if (m.piece === 'k' && !m.san.startsWith('O')) w *= 0.3;
      return w;
    });
    return weighted(legal.map((m) => m.uci), weights, rng);
  }

  let candidates = lines.slice();
  // Simular que no se ve una captura gratis
  if (candidates.length > 1 && rng() < p.missFreeCapture) {
    const best = legal.find((m) => m.uci === candidates[0].uci);
    if (best && best.captured) candidates = candidates.slice(1);
  }
  const wins = candidates.map(scoreToWin);
  const top = Math.max(...wins);
  const weights = wins.map((w) => Math.exp(-(top - w) / p.temperature));
  return weighted(candidates.map((c) => c.uci), weights, rng);
}

function weighted(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Actualiza el rating del usuario tras una partida contra el bot.
 * Si se usaron pistas, las ganancias se reducen a la mitad.
 */
export function updateRating(userRating, botRating, score, { gamesPlayed = 0, hintsUsed = 0 } = {}) {
  const k = gamesPlayed < 10 ? 60 : 32;
  let delta = k * (score - eloExpected(userRating, botRating));
  if (delta > 0 && hintsUsed > 0) delta *= 0.5;
  return Math.max(100, Math.round(userRating + delta));
}

/** El bot juega ligeramente por encima del usuario para que la partida sea un reto ganable. */
export function nextBotRating(userRating, recentScores = []) {
  const last = recentScores.slice(-3);
  const streak = last.length === 3 && last.every((s) => s === 0) ? -60 : last.length === 3 && last.every((s) => s === 1) ? 60 : 0;
  return clamp(Math.round(userRating + 25 + streak), 100, 2400);
}
