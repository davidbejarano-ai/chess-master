// Estado persistente en localStorage (con copia de seguridad exportable).
const KEY = 'chessmaster.v1';
const MAX_FULL_GAMES = 80;

function defaults() {
  return {
    version: 1,
    settings: { chesscomUser: 'Guasintonec', baseTime: 600, sound: true },
    rating: { user: 300, games: 0, history: [], recentScores: [] },
    games: [],
    reviews: [],
    puzzle: { rating: 600, solved: {}, themes: {}, history: [] },
    plan: null,
    streak: { last: null, days: 0, best: 0 },
    openings: { w: {}, b: {} },
    endgames: {},
    importedIds: {},
    activity: {},
  };
}

let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return deepMerge(defaults(), parsed);
  } catch {
    return defaults();
  }
}

function deepMerge(base, extra) {
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}

export function getState() { return state; }

export function save() {
  // Mantener tamaño acotado: las partidas antiguas conservan solo el resumen.
  state.games.sort((a, b) => (b.date || 0) - (a.date || 0));
  state.games.forEach((g, i) => { if (i >= MAX_FULL_GAMES && g.moves) { delete g.moves; g.trimmed = true; } });
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Si nos quedamos sin espacio, recortar más
    state.games.forEach((g, i) => { if (i >= 30 && g.moves) { delete g.moves; g.trimmed = true; } });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { console.warn('No se pudo guardar', e); }
  }
  subs.forEach((fn) => fn(state));
}

export function update(fn) { fn(state); save(); }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function exportBackup() {
  return new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
}

export function importBackup(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.version !== 1) throw new Error('Archivo no válido');
  state = deepMerge(defaults(), parsed);
  save();
}

export function resetAll() { state = defaults(); save(); }

/** Registra actividad diaria y racha. */
export function markActivity(kind, dateStr) {
  update((s) => {
    s.activity[dateStr] = s.activity[dateStr] || {};
    s.activity[dateStr][kind] = (s.activity[dateStr][kind] || 0) + 1;
    if (s.streak.last !== dateStr) {
      const y = new Date(dateStr + 'T12:00:00'); y.setDate(y.getDate() - 1);
      const z = (n) => String(n).padStart(2, '0');
      const yStr = `${y.getFullYear()}-${z(y.getMonth() + 1)}-${z(y.getDate())}`;
      s.streak.days = s.streak.last === yStr ? s.streak.days + 1 : 1;
      s.streak.last = dateStr;
      s.streak.best = Math.max(s.streak.best, s.streak.days);
    }
  });
}
