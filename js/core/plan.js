// Generación del plan de entrenamiento diario, selección de puzzles y repetición espaciada.
import { THEME_LABEL } from './patterns.js';

export const DEFAULT_THEMES = ['hangingPiece', 'mateIn1', 'fork', 'defensiveMove'];
export const LEITNER_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 86400000;

export function todayStr(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function dayIndex(dateStr) { return Math.floor(new Date(dateStr + 'T12:00:00').getTime() / DAY); }

/**
 * Crea el plan del día (≈25 minutos) a partir del perfil.
 * @param {object|null} profile resultado de buildProfile
 * @param {object} ctx { dueReviews:number, dateStr }
 */
export function generatePlan(profile, { dueReviews = 0, dateStr = todayStr() } = {}) {
  const weaknesses = profile && profile.games ? profile.weaknesses : [];
  const themeScores = {};
  weaknesses.forEach((w, i) => {
    w.themes.forEach((t, j) => { themeScores[t] = (themeScores[t] || 0) + w.score / (1 + j * 0.5) / (1 + i * 0.15); });
  });
  let themes = Object.entries(themeScores).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  for (const t of DEFAULT_THEMES) if (themes.length < 2 && !themes.includes(t)) themes.push(t);
  // Rotar el segundo tema día a día para dar variedad entre los 4 primeros
  const d = dayIndex(dateStr);
  const main = themes[0];
  const pool = themes.slice(1, 4);
  const second = pool.length ? pool[d % pool.length] : DEFAULT_THEMES[1];

  const whyFor = (theme) => {
    const w = weaknesses.find((x) => x.themes.includes(theme));
    return w ? `Refuerza: ${w.label.toLowerCase()} (${w.total} veces en tus partidas)` : 'Base táctica para tu nivel';
  };

  const blocks = [];
  blocks.push({ id: 'p1', type: 'puzzles', theme: main, count: 6, minutes: 6, title: `Táctica: ${THEME_LABEL[main] || main}`, why: whyFor(main) });
  if (dueReviews > 0) {
    blocks.push({ id: 'rv', type: 'review', count: Math.min(5, dueReviews), minutes: 5, title: 'Repaso de tus errores', why: 'Vuelve a las posiciones donde fallaste hasta dominarlas' });
  }
  blocks.push({ id: 'p2', type: 'puzzles', theme: second, count: dueReviews > 0 ? 4 : 6, minutes: 4, title: `Táctica: ${THEME_LABEL[second] || second}`, why: whyFor(second) });

  // Módulo de apertura o final según debilidades; si no, alternar
  const modules = weaknesses.slice(0, 5).flatMap((w) => w.modules);
  const wantsOpen = modules.includes('openings');
  const wantsEnd = modules.includes('endgames');
  let mod;
  if (wantsOpen && !wantsEnd) mod = 'openings';
  else if (wantsEnd && !wantsOpen) mod = 'endgames';
  else mod = d % 2 === 0 ? 'openings' : 'endgames';
  if (mod === 'openings') blocks.push({ id: 'op', type: 'openings', minutes: 5, title: 'Aperturas: tu repertorio', why: wantsOpen ? 'Tus partidas muestran problemas en la apertura' : 'Una base sólida de aperturas evita sustos tempranos' });
  else blocks.push({ id: 'eg', type: 'endgames', minutes: 5, title: 'Finales básicos', why: wantsEnd ? 'Pierdes ventaja en los finales' : 'Saber dar mate te asegura rematar partidas ganadas' });

  const focus = weaknesses[0];
  blocks.push({ id: 'gm', type: 'game', minutes: 10, title: 'Partida 10 min vs. bot', why: focus ? `Objetivo de la partida: ${focus.advice}` : 'Juega y analizaremos tus jugadas' });
  return { date: dateStr, blocks, done: {} };
}

/** Selecciona puzzles de un tema cercanos al rating del usuario, evitando los ya resueltos. */
export function selectPuzzles(puzzles, { theme, rating = 600, count = 5, solved = {}, rng = Math.random }) {
  let pool = puzzles.filter((p) => !theme || p.themes.includes(theme));
  const fresh = pool.filter((p) => !solved[p.id]);
  if (fresh.length >= count) pool = fresh;
  const scored = pool.map((p) => ({ p, s: Math.abs(p.rating - rating) + rng() * 150 }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, count).map((x) => x.p);
}

export function eloExpected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }

export function updatePuzzleRating(userRating, puzzleRating, success, k = 24) {
  const e = eloExpected(userRating, puzzleRating);
  return Math.round(Math.max(200, userRating + k * ((success ? 1 : 0) - e)));
}

/** Repetición espaciada (cajas de Leitner) para posiciones de error. */
export function scheduleReview(item, correct, now = Date.now()) {
  const box = correct ? Math.min(LEITNER_DAYS.length - 1, (item.box || 0) + 1) : 0;
  const due = correct ? now + LEITNER_DAYS[box] * DAY : now + 10 * 60 * 1000;
  return { ...item, box, due, attempts: (item.attempts || 0) + 1, lastResult: correct };
}

export function dueItems(items, now = Date.now()) {
  return items.filter((i) => (i.due || 0) <= now).sort((a, b) => (a.due || 0) - (b.due || 0));
}
