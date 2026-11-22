// Motor Stockfish para pruebas en Node (usa el mismo WASM que la app).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ENGINE = fileURLToPath(new URL('../vendor/stockfish/stockfish-18-lite-single.js', import.meta.url));

export function startEngine() {
  const p = spawn(process.execPath, [ENGINE]);
  let buf = '';
  const waiters = [];
  p.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      for (const w of [...waiters]) w(line);
    }
  });
  const send = (c) => p.stdin.write(c + '\n');
  const until = (pred) => new Promise((res) => { const fn = (l) => { if (pred(l)) { waiters.splice(waiters.indexOf(fn), 1); res(l); } }; waiters.push(fn); });
  return {
    async init() { const r = until((l) => l === 'uciok'); send('uci'); await r; const q = until((l) => l === 'readyok'); send('isready'); await q; },
    async analyze(fen, depth = 10) {
      let last = null;
      const fn = (l) => { if (l.startsWith('info') && l.includes(' pv ')) last = l; };
      waiters.push(fn);
      const done = until((l) => l.startsWith('bestmove'));
      send(`position fen ${fen}`); send(`go depth ${depth}`);
      const bm = await done;
      waiters.splice(waiters.indexOf(fn), 1);
      const t = last ? last.split(' ') : [];
      const out = { best: bm.split(' ')[1] };
      const si = t.indexOf('score');
      if (si >= 0) { if (t[si + 1] === 'cp') out.cp = +t[si + 2]; else out.mate = +t[si + 2]; }
      const pi = t.indexOf('pv'); out.pv = pi >= 0 ? t.slice(pi + 1) : [];
      return out;
    },
    quit() { send('quit'); p.kill(); },
  };
}
