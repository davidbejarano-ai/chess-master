// Ejecuta el motor sobre una partida completa y guarda el resultado.
import { Chess } from './vendor/chess.js';
import { analysisEngine, toWhitePov } from './engine.js';
import { analyzeGame, terminalEval, mistakePositions } from './core/analysis.js';
import { openingName } from './core/openings.js';
import { update, getState } from './storage.js';

/**
 * @param {object} rec { id, ucis, startFen?, userColor, result, clocks?, baseTime? }
 * @param {object} opts { depth, onProgress(fraction), urgent }
 */
export async function analyzeRecord(rec, { depth = 11, onProgress = () => {}, urgent = false } = {}) {
  const engine = analysisEngine();
  const chess = new Chess(rec.startFen || undefined);
  const fens = [chess.fen()];
  const sans = [];
  for (const u of rec.ucis) {
    const m = chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    sans.push(m.san);
    fens.push(chess.fen());
  }
  const evals = [];
  for (let i = 0; i < fens.length; i++) {
    const c = new Chess(fens[i]);
    if (!c.moves().length) { evals.push(terminalEval(c)); continue; }
    const r = await engine.analyze(fens[i], { depth, urgent });
    const line = r.lines[0];
    const ev = toWhitePov(line, c.turn());
    ev.best = r.best;
    ev.pv = line ? line.pv.slice(0, 8) : [];
    evals.push(ev);
    onProgress((i + 1) / fens.length);
  }
  const { moves, summary } = analyzeGame({
    ucis: rec.ucis, startFen: rec.startFen, userColor: rec.userColor, evals,
    clocks: rec.clocks || [], baseTime: rec.baseTime || 600, result: rec.result,
  });
  return {
    ...rec,
    opening: rec.opening || (rec.startFen ? 'Posición inicial especial' : openingName(sans)),
    moves, summary, analyzed: true, analyzedAt: Date.now(),
  };
}

/** Guarda una partida analizada y añade sus errores a la cola de repaso. */
export function storeAnalyzed(game) {
  update((s) => {
    s.games = s.games.filter((g) => g.id !== game.id);
    s.games.push(game);
    if (game.source === 'chesscom') s.importedIds[game.id] = true;
    const known = new Set(s.reviews.map((r) => r.fen));
    const items = mistakePositions(game.moves, game.userColor)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 4)
      .filter((m) => !known.has(m.fen));
    for (const m of items) {
      s.reviews.push({ id: `${game.id}:${m.fen}`, gameId: game.id, ...m, box: 0, due: Date.now(), createdAt: Date.now() });
    }
    // limitar cola
    if (s.reviews.length > 300) s.reviews = s.reviews.sort((a, b) => b.createdAt - a.createdAt).slice(0, 300);
  });
}

/** Cola en segundo plano para analizar muchas partidas (importaciones). */
class AnalysisQueue extends EventTarget {
  constructor() { super(); this.items = []; this.running = false; this.current = null; this.done = 0; this.total = 0; }

  add(recs) {
    const st = getState();
    const fresh = recs.filter((r) => !this.items.some((x) => x.id === r.id) && !(st.games.find((g) => g.id === r.id && g.analyzed)));
    this.items.push(...fresh);
    this.total += fresh.length;
    this._emit();
    this._run();
    return fresh.length;
  }

  _emit(progress = 0) {
    this.dispatchEvent(new CustomEvent('progress', { detail: { done: this.done, total: this.total, current: this.current, progress, running: this.running } }));
  }

  async _run() {
    if (this.running) return;
    this.running = true;
    while (this.items.length) {
      const rec = this.items.shift();
      this.current = rec;
      this._emit(0);
      try {
        const g = await analyzeRecord(rec, { depth: 10, onProgress: (p) => this._emit(p) });
        storeAnalyzed(g);
      } catch (e) {
        console.error('Error analizando', rec.id, e);
      }
      this.done++;
    }
    this.running = false;
    this.current = null;
    this._emit(1);
    this.dispatchEvent(new CustomEvent('finished'));
    this.done = 0; this.total = 0;
  }
}

export const queue = new AnalysisQueue();
