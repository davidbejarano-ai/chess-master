// Envoltura de Stockfish (WASM en un Web Worker) con cola de tareas y prioridad.
const ENGINE_URL = new URL('../vendor/stockfish/stockfish-18-lite-single.js', import.meta.url).href;

export class Engine {
  constructor(name = 'engine') {
    this.name = name;
    this.tasks = [];
    this.busy = false;
    this.listeners = new Set();
    this.multipv = 1;
    this.ready = this._init();
  }

  _init() {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(ENGINE_URL);
      } catch (e) { reject(e); return; }
      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        for (const l of [...this.listeners]) l(line);
      };
      this.worker.onerror = (e) => reject(e);
      this._waitFor('uciok', () => this.send('uci'))
        .then(() => { this.send('setoption name Hash value 16'); return this._isReady(); })
        .then(resolve, reject);
    });
  }

  send(cmd) { this.worker.postMessage(cmd); }

  _waitFor(prefix, start) {
    return new Promise((resolve) => {
      const fn = (line) => { if (line.startsWith(prefix)) { this.listeners.delete(fn); resolve(line); } };
      this.listeners.add(fn);
      start && start();
    });
  }

  _isReady() { return this._waitFor('readyok', () => this.send('isready')); }

  /** Encola una tarea. urgent=true la pone al principio. */
  _enqueue(fn, urgent = false) {
    return new Promise((resolve, reject) => {
      const task = { fn, resolve, reject };
      if (urgent) this.tasks.unshift(task); else this.tasks.push(task);
      this._pump();
    });
  }

  async _pump() {
    if (this.busy) return;
    const task = this.tasks.shift();
    if (!task) return;
    this.busy = true;
    try {
      await this.ready;
      task.resolve(await task.fn());
    } catch (e) { task.reject(e); }
    this.busy = false;
    this._pump();
  }

  newGame() { return this._enqueue(async () => { this.send('ucinewgame'); await this._isReady(); }); }

  /** Cancela tareas pendientes (no la que está en curso). */
  clearQueue() {
    const pending = this.tasks.splice(0);
    pending.forEach((t) => t.reject(new Error('cancelled')));
  }

  /**
   * Analiza una posición.
   * Devuelve { best, lines:[{uci, cp?, mate?, pv, depth}] } con puntuaciones desde el bando que mueve.
   */
  analyze(fen, { depth = 12, multipv = 1, movetime = null, urgent = false } = {}) {
    return this._enqueue(() => this._analyze(fen, { depth, multipv, movetime }), urgent);
  }

  _analyze(fen, { depth, multipv, movetime }) {
    return new Promise((resolve) => {
      if (multipv !== this.multipv) { this.send(`setoption name MultiPV value ${multipv}`); this.multipv = multipv; }
      const lines = {};
      const fn = (line) => {
        if (line.startsWith('info') && line.includes(' pv ') && line.includes(' score ')) {
          const parsed = parseInfo(line);
          if (parsed) lines[parsed.multipv] = parsed;
        } else if (line.startsWith('bestmove')) {
          this.listeners.delete(fn);
          const best = line.split(' ')[1];
          const arr = Object.values(lines).sort((a, b) => a.multipv - b.multipv);
          resolve({ best: best && best !== '(none)' ? best : null, lines: arr });
        }
      };
      this.listeners.add(fn);
      this.send(`position fen ${fen}`);
      this.send(movetime ? `go depth ${depth} movetime ${movetime}` : `go depth ${depth}`);
    });
  }
}

export function parseInfo(line) {
  const t = line.split(' ');
  const out = { multipv: 1 };
  for (let i = 0; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': out.depth = +t[i + 1]; break;
      case 'multipv': out.multipv = +t[i + 1]; break;
      case 'score':
        if (t[i + 1] === 'cp') out.cp = +t[i + 2];
        else if (t[i + 1] === 'mate') out.mate = +t[i + 2];
        break;
      case 'pv': out.pv = t.slice(i + 1); i = t.length; break;
    }
  }
  if (!out.pv || !out.pv.length) return null;
  out.uci = out.pv[0];
  return out;
}

/** Convierte una puntuación desde el bando que mueve al punto de vista blanco. */
export function toWhitePov(line, turn) {
  if (!line) return { cp: 0 };
  const s = turn === 'w' ? 1 : -1;
  if (line.mate !== undefined) return { mate: line.mate * s };
  return { cp: (line.cp || 0) * s };
}

let shared = null;
let player = null;
/** Motor compartido para análisis y comprobaciones. */
export function analysisEngine() { if (!shared) shared = new Engine('analysis'); return shared; }
/** Motor para el bot y las pistas durante la partida. */
export function playEngine() { if (!player) player = new Engine('play'); return player; }
