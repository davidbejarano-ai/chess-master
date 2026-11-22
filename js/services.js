// Servicios compartidos entre vistas.
import { getState, update, markActivity } from './storage.js';
import { buildProfile } from './core/profile.js';
import { generatePlan, todayStr, dueItems } from './core/plan.js';

let puzzlesCache = null;
export async function loadPuzzles() {
  if (!puzzlesCache) {
    const res = await fetch(new URL('../data/puzzles.json', import.meta.url));
    puzzlesCache = await res.json();
  }
  return puzzlesCache;
}

export function getProfile() { return buildProfile(getState().games); }

export function dueReviews() { return dueItems(getState().reviews); }

/** Plan del día; se regenera si cambia el día o si se pide. */
export function getTodayPlan({ regenerate = false } = {}) {
  const s = getState();
  const today = todayStr();
  if (!s.plan || s.plan.date !== today || regenerate) {
    const done = s.plan && s.plan.date === today ? s.plan.done : {};
    const plan = generatePlan(getProfile(), { dueReviews: dueReviews().length, dateStr: today });
    plan.done = done;
    plan.basedOn = s.games.filter((g) => g.analyzed).length;
    update((st) => { st.plan = plan; });
  }
  return getState().plan;
}

export function markBlockDone(blockId) {
  if (!blockId) return;
  const today = todayStr();
  update((s) => { if (s.plan && s.plan.date === today) s.plan.done[blockId] = true; });
}

export function activity(kind) { markActivity(kind, todayStr()); }
