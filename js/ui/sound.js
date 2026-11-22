// Sonidos sintetizados con Web Audio (sin archivos externos).
import { getState } from '../storage.js';

let ctx = null;
let noiseBuf = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// En móviles el audio solo puede activarse tras un toque del usuario.
const unlock = () => {
  const c = audio();
  if (c) {
    const o = c.createOscillator(); const g = c.createGain();
    g.gain.value = 0; o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.01);
  }
  window.removeEventListener('pointerdown', unlock, true);
  window.removeEventListener('touchend', unlock, true);
};
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('touchend', unlock, true);
}

export function soundEnabled() {
  try { return getState().settings.sound !== false; } catch { return true; }
}

/** Golpe "de madera": ráfaga de ruido filtrada + un tono corto. */
function knock(t, { freq = 900, q = 6, vol = 0.6, len = 0.07, tone = 180 } = {}) {
  const c = ctx;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t); src.stop(t + len + 0.02);
  if (tone) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(tone * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(tone, t + len);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + len * 1.2);
    o.connect(og).connect(c.destination);
    o.start(t); o.stop(t + len * 1.3);
  }
}

function beep(t, freq, len, vol = 0.18, type = 'sine') {
  const c = ctx;
  const o = c.createOscillator();
  o.type = type; o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + len + 0.02);
}

/**
 * kind: 'select' | 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'illegal' | 'start' | 'end' | 'win' | 'correct' | 'wrong'
 */
export function play(kind) {
  if (!soundEnabled()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (kind) {
    case 'select': knock(t, { freq: 2200, q: 4, vol: 0.18, len: 0.03, tone: 0 }); break;
    case 'move': knock(t, { freq: 1100, q: 5, vol: 0.7, len: 0.08, tone: 170 }); break;
    case 'capture':
      knock(t, { freq: 1600, q: 3, vol: 0.9, len: 0.06, tone: 240 });
      knock(t + 0.035, { freq: 700, q: 4, vol: 0.6, len: 0.1, tone: 130 });
      break;
    case 'castle':
      knock(t, { freq: 1100, q: 5, vol: 0.6, len: 0.07, tone: 170 });
      knock(t + 0.11, { freq: 1000, q: 5, vol: 0.6, len: 0.07, tone: 160 });
      break;
    case 'check':
      knock(t, { freq: 1100, q: 5, vol: 0.6, len: 0.07, tone: 170 });
      beep(t + 0.03, 880, 0.18, 0.12, 'triangle');
      break;
    case 'promote':
      knock(t, { freq: 1100, q: 5, vol: 0.6, len: 0.07, tone: 170 });
      beep(t + 0.05, 660, 0.1, 0.12); beep(t + 0.14, 990, 0.16, 0.12);
      break;
    case 'illegal': beep(t, 180, 0.12, 0.15, 'square'); break;
    case 'start': beep(t, 523, 0.12); beep(t + 0.12, 784, 0.2); break;
    case 'win': beep(t, 523, 0.12); beep(t + 0.12, 659, 0.12); beep(t + 0.24, 784, 0.3); break;
    case 'end': beep(t, 440, 0.18); beep(t + 0.18, 330, 0.3); break;
    case 'correct': beep(t, 784, 0.1, 0.14); beep(t + 0.09, 1046, 0.18, 0.14); break;
    case 'wrong': beep(t, 220, 0.2, 0.15, 'triangle'); break;
  }
}

/** Sonido según la jugada (objeto Move de chess.js) y si deja jaque. */
export function playMove(move, givesCheck) {
  if (!move) return;
  if (givesCheck) play('check');
  else if (move.promotion) play('promote');
  else if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) play('castle');
  else if (move.captured) play('capture');
  else play('move');
}
