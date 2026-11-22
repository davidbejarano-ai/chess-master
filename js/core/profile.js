// Agrega los análisis de varias partidas en un perfil: debilidades, fortalezas y estadísticas.
import { WEAKNESSES, STRENGTHS } from './patterns.js';

/**
 * @param {Array} games partidas analizadas ({summary, userColor, source, opening, date, ...})
 * @param {object} [opts]
 * @param {number} [opts.recent=30] usar solo las N partidas más recientes
 */
export function buildProfile(games, { recent = 30 } = {}) {
  const analyzed = games.filter((g) => g.summary).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, recent);
  const n = analyzed.length;
  const tagTotals = {};
  const goodTotals = {};
  const tagGames = {};
  const phases = { opening: [], middlegame: [], endgame: [] };
  const counts = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  const byColor = { w: { games: 0, score: 0 }, b: { games: 0, score: 0 } };
  const openings = {};
  let accSum = 0, accN = 0;

  for (const g of analyzed) {
    const s = g.summary;
    for (const [t, c] of Object.entries(s.tags)) {
      tagTotals[t] = (tagTotals[t] || 0) + c;
      tagGames[t] = (tagGames[t] || 0) + 1;
    }
    for (const [t, c] of Object.entries(s.good)) goodTotals[t] = (goodTotals[t] || 0) + c;
    for (const k of Object.keys(counts)) counts[k] += s.counts[k] || 0;
    for (const p of Object.keys(phases)) if (s.phaseAccuracy[p] !== null && s.phaseAccuracy[p] !== undefined) phases[p].push(s.phaseAccuracy[p]);
    if (s.accuracy !== null) { accSum += s.accuracy; accN++; }
    if (s.userScore !== null && s.userScore !== undefined) {
      byColor[g.userColor].games++;
      byColor[g.userColor].score += s.userScore;
      const op = g.opening || 'Desconocida';
      openings[op] = openings[op] || { games: 0, score: 0, color: g.userColor };
      openings[op].games++;
      openings[op].score += s.userScore;
    }
  }

  const weaknesses = Object.entries(tagTotals)
    .filter(([t]) => WEAKNESSES[t])
    .map(([t, total]) => {
      const perGame = total / Math.max(1, n);
      const share = tagGames[t] / Math.max(1, n);
      return { id: t, ...WEAKNESSES[t], total, perGame, share, score: perGame * WEAKNESSES[t].weight * (0.5 + share) };
    })
    .sort((a, b) => b.score - a.score);

  const strengths = Object.entries(goodTotals)
    .filter(([t]) => STRENGTHS[t])
    .map(([t, total]) => ({ id: t, ...STRENGTHS[t], total, perGame: total / Math.max(1, n) }))
    .sort((a, b) => b.perGame - a.perGame);

  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const phaseAccuracy = { opening: avg(phases.opening), middlegame: avg(phases.middlegame), endgame: avg(phases.endgame) };
  const userMoves = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    games: n,
    accuracy: accN ? Math.round(accSum / accN) : null,
    counts,
    perGame: {
      blunders: n ? counts.blunder / n : 0,
      mistakes: n ? counts.mistake / n : 0,
      inaccuracies: n ? counts.inaccuracy / n : 0,
    },
    userMoves,
    phaseAccuracy,
    weakestPhase: weakestPhase(phaseAccuracy),
    byColor,
    openings: Object.entries(openings).map(([name, o]) => ({ name, ...o, pct: Math.round((o.score / o.games) * 100) }))
      .sort((a, b) => b.games - a.games),
    weaknesses,
    strengths,
  };
}

function weakestPhase(pa) {
  const entries = Object.entries(pa).filter(([, v]) => v !== null);
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}
