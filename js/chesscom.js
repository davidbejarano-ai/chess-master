// Importación de partidas públicas desde la API de Chess.com.
import { Chess } from './vendor/chess.js';

const API = 'https://api.chess.com/pub/player';

export async function fetchRecentGames(username, { max = 20, timeClasses = ['rapid', 'blitz', 'bullet', 'daily'] } = {}) {
  const user = username.trim().toLowerCase();
  const res = await fetch(`${API}/${encodeURIComponent(user)}/games/archives`);
  if (res.status === 404) throw new Error(`No existe el usuario "${username}" en Chess.com`);
  if (!res.ok) throw new Error(`Chess.com respondió ${res.status}`);
  const { archives = [] } = await res.json();
  const out = [];
  for (const url of archives.slice().reverse()) {
    const r = await fetch(url);
    if (!r.ok) continue;
    const { games = [] } = await r.json();
    for (const g of games.slice().reverse()) {
      if (g.rules !== 'chess' || !g.pgn || !timeClasses.includes(g.time_class)) continue;
      const rec = parseGame(g, user);
      if (rec) out.push(rec);
      if (out.length >= max) return out;
    }
    if (out.length >= max) break;
  }
  return out;
}

export function parseClock(comment) {
  const m = /\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/.exec(comment || '');
  if (!m) return null;
  return +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
}

/** Convierte una partida de la API en un registro analizable. */
export function parseGame(g, user) {
  const chess = new Chess();
  try { chess.loadPgn(g.pgn); } catch { return null; }
  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });
  if (history.length < 6) return null;
  const comments = {};
  for (const c of chess.getComments()) comments[c.fen] = c.comment;
  const clocks = history.map((m) => parseClock(comments[m.after]));
  const userColor = g.white.username.toLowerCase() === user ? 'w' : 'b';
  const me = userColor === 'w' ? g.white : g.black;
  const them = userColor === 'w' ? g.black : g.white;
  const tc = String(g.time_control || headers.TimeControl || '600');
  const baseTime = tc.includes('/') ? 86400 : parseInt(tc.split('+')[0], 10) || 600;
  const id = 'cc:' + (g.uuid || g.url);
  return {
    id,
    source: 'chesscom',
    url: g.url,
    date: (g.end_time || 0) * 1000,
    white: g.white.username,
    black: g.black.username,
    userColor,
    userElo: me.rating,
    oppElo: them.rating,
    opponent: them.username,
    result: headers.Result || '*',
    termination: headers.Termination || '',
    timeClass: g.time_class,
    timeControl: tc,
    baseTime,
    startFen: headers.SetUp === '1' && headers.FEN ? headers.FEN : undefined,
    ucis: history.map((m) => m.from + m.to + (m.promotion || '')),
    clocks: clocks.some((c) => c !== null) ? clocks : [],
    hintsUsed: 0,
  };
}
