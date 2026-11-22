// Resumen agregado de varias partidas seleccionadas (funciones puras).
import { THRESHOLDS } from './analysis.js';
import { WEAKNESSES, STRENGTHS } from './patterns.js';

const MISSED = {
  missedMate: 'No viste un mate',
  missedCapture: 'No capturaste material gratis',
  missedFork: 'No viste una horquilla',
  missedPin: 'No aprovechaste una clavada',
};

const moveLabel = (m) => `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'} ${m.san}`;

function ref(g, m, extra = {}) {
  return {
    gameId: g.id, ply: m.ply, move: moveLabel(m), bestSan: m.bestSan, opponent: g.opponent || '',
    date: g.date, wBefore: m.wBefore, wAfter: m.wAfter, drop: m.drop, ...extra,
  };
}

/**
 * @param {Array} games partidas analizadas (con moves y summary)
 */
export function buildReport(games) {
  const list = games.filter((g) => g.summary).sort((a, b) => (a.date || 0) - (b.date || 0));
  const full = list.filter((g) => g.moves);
  const n = list.length;
  const r = {
    games: n,
    withMoves: full.length,
    record: { w: 0, d: 0, l: 0 },
    byColor: { w: { games: 0, score: 0 }, b: { games: 0, score: 0 } },
    accuracy: null,
    accuracyTrend: [],
    counts: { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    phase: { opening: { moves: 0, errors: 0, acc: [] }, middlegame: { moves: 0, errors: 0, acc: [] }, endgame: { moves: 0, errors: 0, acc: [] } },
    errorTypes: [],
    missed: [],
    missedByType: {},
    bestMoves: [],
    strengths: [],
    turning: { worsened: [], punished: [], letGo: [] },
    time: null,
    openings: [],
    recommendations: [],
  };
  if (!n) return r;

  let accSum = 0, accN = 0;
  const tagCount = {}, tagGames = {}, goodCount = {};
  const openings = {};

  for (const g of list) {
    const s = g.summary;
    if (s.userScore === 1) r.record.w++; else if (s.userScore === 0.5) r.record.d++; else if (s.userScore === 0) r.record.l++;
    if (s.userScore !== null && s.userScore !== undefined) { r.byColor[g.userColor].games++; r.byColor[g.userColor].score += s.userScore; }
    if (s.accuracy !== null && s.accuracy !== undefined) { accSum += s.accuracy; accN++; r.accuracyTrend.push({ date: g.date, accuracy: s.accuracy, gameId: g.id }); }
    for (const k of Object.keys(r.counts)) r.counts[k] += s.counts[k] || 0;
    for (const [t, c] of Object.entries(s.tags)) { tagCount[t] = (tagCount[t] || 0) + c; tagGames[t] = (tagGames[t] || 0) + 1; }
    for (const [t, c] of Object.entries(s.good)) goodCount[t] = (goodCount[t] || 0) + c;
    const op = g.opening || 'Desconocida';
    openings[op] = openings[op] || { name: op, games: 0, score: 0, acc: [] };
    openings[op].games++;
    openings[op].score += s.userScore || 0;
    if (s.accuracy !== null && s.accuracy !== undefined) openings[op].acc.push(s.accuracy);
  }
  r.accuracy = accN ? Math.round(accSum / accN) : null;

  // Detalle jugada a jugada
  const spentByPhase = { opening: [], middlegame: [], endgame: [] };
  let pressureErrors = 0, impulsive = 0, clockGames = 0;
  for (const g of full) {
    const mine = g.moves.filter((m) => m.color === g.userColor);
    if (mine.some((m) => m.clock !== null && m.clock !== undefined)) clockGames++;
    for (const m of mine) {
      const ph = r.phase[m.phase];
      ph.moves++;
      ph.acc.push(m.accuracy);
      if (m.drop >= THRESHOLDS.mistake) ph.errors++;
      if (m.spent !== null && m.spent !== undefined) spentByPhase[m.phase].push(m.spent);
      if (m.tags.includes('timePressure')) pressureErrors++;
      if (m.tags.includes('impulsive')) impulsive++;
      for (const t of m.tags) if (MISSED[t]) {
        r.missed.push(ref(g, m, { type: t, label: MISSED[t] }));
        r.missedByType[t] = (r.missedByType[t] || 0) + 1;
      }
      const goods = m.good.filter((t) => ['foundMate', 'foundFork', 'tookFreePiece', 'foundPin', 'punished', 'toughDefense'].includes(t));
      if (goods.length && (m.cls === 'best' || m.cls === 'excellent')) {
        r.bestMoves.push(ref(g, m, { labels: goods.map((t) => STRENGTHS[t].label), score: goods.length + (goods.includes('foundMate') ? 2 : 0) + (m.wBefore < 50 ? 1 : 0) }));
      }
    }
    // Puntos de inflexión
    for (let i = 0; i < g.moves.length; i++) {
      const m = g.moves[i];
      if (m.color === g.userColor) {
        if (m.drop >= THRESHOLDS.blunder) {
          const prev = g.moves[i - 1];
          if (prev && prev.color !== g.userColor && prev.drop >= THRESHOLDS.mistake) {
            r.turning.letGo.push(ref(g, m, { oppMove: moveLabel(prev) }));
          } else {
            r.turning.worsened.push(ref(g, m, { tags: m.tags.filter((t) => WEAKNESSES[t]).map((t) => WEAKNESSES[t].label) }));
          }
        }
      } else if (m.drop >= THRESHOLDS.mistake) {
        const next = g.moves[i + 1];
        if (next && next.color === g.userColor && next.drop < THRESHOLDS.inaccuracy) {
          r.turning.punished.push(ref(g, next, { oppMove: moveLabel(m), gain: Math.round(m.drop) }));
        }
      }
    }
  }
  const byDrop = (a, b) => b.drop - a.drop;
  r.turning.worsened.sort(byDrop);
  r.turning.letGo.sort(byDrop);
  r.turning.punished.sort((a, b) => b.gain - a.gain);
  r.missed.sort(byDrop);
  r.bestMoves.sort((a, b) => b.score - a.score);
  for (const p of Object.values(r.phase)) p.accuracy = p.acc.length ? Math.round(p.acc.reduce((a, b) => a + b, 0) / p.acc.length) : null;

  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  if (clockGames) {
    r.time = {
      games: clockGames,
      avgSpent: { opening: avg(spentByPhase.opening), middlegame: avg(spentByPhase.middlegame), endgame: avg(spentByPhase.endgame) },
      pressureErrors, impulsive,
    };
  }

  r.errorTypes = Object.entries(tagCount)
    .filter(([t]) => WEAKNESSES[t] && !MISSED[t])
    .map(([t, c]) => ({ id: t, label: WEAKNESSES[t].label, desc: WEAKNESSES[t].desc, advice: WEAKNESSES[t].advice, count: c, games: tagGames[t], themes: WEAKNESSES[t].themes }))
    .sort((a, b) => b.count * WEAKNESSES[b.id].weight - a.count * WEAKNESSES[a.id].weight);
  r.strengths = Object.entries(goodCount).filter(([t]) => STRENGTHS[t])
    .map(([t, c]) => ({ id: t, label: STRENGTHS[t].label, desc: STRENGTHS[t].desc, count: c })).sort((a, b) => b.count - a.count);
  r.openings = Object.values(openings).map((o) => ({ name: o.name, games: o.games, pct: Math.round((o.score / o.games) * 100), accuracy: avg(o.acc) }))
    .sort((a, b) => b.games - a.games);

  r.recommendations = recommend(r);
  return r;
}

function recommend(r) {
  const out = [];
  const perGame = (x) => x / Math.max(1, r.games);
  if (perGame(r.counts.blunder) >= 1) out.push(`Cometes ${perGame(r.counts.blunder).toFixed(1)} errores graves por partida. Antes de cada jugada revisa: ¿qué ataca el rival? ¿Mi pieza queda segura?`);
  if (r.errorTypes[0]) out.push(`Tu error más frecuente: ${r.errorTypes[0].label.toLowerCase()} (${r.errorTypes[0].count} veces). ${r.errorTypes[0].advice}`);
  const missedTotal = r.missed.length;
  if (missedTotal) {
    const top = Object.entries(r.missedByType).sort((a, b) => b[1] - a[1])[0];
    out.push(`Dejaste pasar ${missedTotal} ${missedTotal === 1 ? 'oportunidad táctica' : 'oportunidades tácticas'} (sobre todo: ${MISSED[top[0]].toLowerCase()}). En cada turno busca primero jaques y capturas.`);
  }
  if (r.turning.letGo.length) out.push(`${r.turning.letGo.length === 1 ? 'Una vez' : `${r.turning.letGo.length} veces`} el rival se equivocó y respondiste con otro error. Cuando el rival juega algo raro, detente: puede haber dejado algo colgado.`);
  const phases = Object.entries(r.phase).filter(([, p]) => p.moves >= 5 && p.accuracy !== null).sort((a, b) => a[1].accuracy - b[1].accuracy);
  const name = { opening: 'la apertura', middlegame: 'el medio juego', endgame: 'el final' };
  if (phases.length >= 2) out.push(`Tu fase más débil es ${name[phases[0][0]]} (${phases[0][1].accuracy}% de precisión), y la más fuerte, ${name[phases.at(-1)[0]]} (${phases.at(-1)[1].accuracy}%).`);
  if (r.time && r.time.impulsive >= 2) out.push(`${r.time.impulsive} errores graves fueron jugadas de menos de 3 segundos. Tómate tu tiempo: tienes reloj de sobra.`);
  if (r.time && r.time.pressureErrors >= 2) out.push(`${r.time.pressureErrors} errores llegaron con poco tiempo en el reloj. Juega la apertura más rápido y guarda tiempo para el medio juego.`);
  if (r.strengths[0]) out.push(`Punto fuerte: ${r.strengths[0].label.toLowerCase()} (${r.strengths[0].count} veces). ¡Sigue así!`);
  return out;
}

export { MISSED };
