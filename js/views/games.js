import { getState, update } from '../storage.js';
import { fetchRecentGames } from '../chesscom.js';
import { queue } from '../analyzer.js';
import { el, esc, $, fmtDate, toast } from '../ui/dom.js';
import { getSelection, setSelection } from './report.js';

export function render(root, { params }) {
  const s = getState();
  const node = el(`<section class="stack">
    <div class="card" id="import-card">
      <h2>Importar partidas de Chess.com</h2>
      <p class="muted">Descargamos tus partidas públicas y las analizamos con Stockfish en tu navegador. Puede tardar unos segundos por partida; puedes seguir usando la app mientras tanto.</p>
      <form id="imp" class="row wrap">
        <label class="field"><span>Usuario</span><input name="user" value="${esc(s.settings.chesscomUser)}" required autocomplete="off"></label>
        <label class="field"><span>Partidas</span><select name="max">
          <option value="10">10 últimas</option><option value="20" selected>20 últimas</option><option value="40">40 últimas</option><option value="80">80 últimas</option>
        </select></label>
        <label class="field"><span>Tipo</span><select name="tc">
          <option value="rapid,blitz,bullet,daily">Todas</option><option value="rapid">Rápidas</option><option value="blitz">Blitz</option><option value="daily">Diarias</option>
        </select></label>
        <button class="btn primary" type="submit">Importar y analizar</button>
      </form>
      <div id="imp-status" class="muted small"></div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Tus partidas <small>${s.games.length}</small></h2>
        <div class="seg small" id="filter"><button data-v="all" class="on">Todas</button><button data-v="app">App</button><button data-v="chesscom">Chess.com</button></div>
      </div>
      <div class="selbar" id="selbar">
        <span class="muted small">Seleccionar:</span>
        <button class="btn small" data-sel="10">Últimas 10</button>
        <button class="btn small" data-sel="20">Últimas 20</button>
        <button class="btn small" data-sel="all">Todas</button>
        <button class="btn small" data-sel="none">Ninguna</button>
        <button class="btn primary small" id="go-report" disabled>📊 Resumen</button>
      </div>
      <div id="list"></div>
    </div>
  </section>`);
  root.appendChild(node);
  if (params.import) setTimeout(() => $('input[name=user]', node).focus(), 50);

  let filter = 'all';
  const selected = new Set(getSelection());
  const visible = () => getState().games.slice().sort((a, b) => (b.date || 0) - (a.date || 0)).filter((g) => filter === 'all' || g.source === filter);
  const updateSelBar = () => {
    const n = [...selected].filter((id) => getState().games.some((g) => g.id === id && g.summary)).length;
    const btn = $('#go-report', node);
    btn.disabled = n === 0;
    btn.textContent = n ? `📊 Resumen de ${n} partida${n > 1 ? 's' : ''}` : '📊 Resumen';
    setSelection([...selected]);
  };
  const drawList = () => {
    const games = visible();
    const pending = new Set(queue.items.map((x) => x.id));
    if (queue.current) pending.add(queue.current.id);
    $('#list', node).innerHTML = games.length ? `<table class="games">
      <thead><tr><th></th><th>Fecha</th><th>Rival</th><th>Res.</th><th>Apertura</th><th>Precisión</th><th>Errores</th><th></th></tr></thead>
      <tbody>${games.map((g) => {
        const sc = g.summary ? g.summary.userScore : scoreOf(g);
        const res = sc === 1 ? '<span class="res w">G</span>' : sc === 0 ? '<span class="res l">P</span>' : sc === 0.5 ? '<span class="res d">T</span>' : '·';
        const c = g.summary ? g.summary.counts : null;
        return `<tr class="${selected.has(g.id) ? 'sel' : ''}">
          <td><input type="checkbox" class="pick" data-id="${esc(g.id)}" ${selected.has(g.id) ? 'checked' : ''} ${g.summary ? '' : 'disabled'} aria-label="Seleccionar partida"></td>
          <td>${fmtDate(g.date)}<small>${g.source === 'chesscom' ? 'Chess.com' : 'App'}${g.hintsUsed ? ' · 💡' + g.hintsUsed : ''}</small></td>
          <td>${g.userColor === 'w' ? '♔' : '♚'} ${esc(g.opponent || '')}${g.oppElo ? ` <small>(${g.oppElo})</small>` : ''}</td>
          <td>${res}</td>
          <td class="ellipsis">${esc(g.opening || '')}</td>
          <td>${g.summary && g.summary.accuracy !== null ? g.summary.accuracy + '%' : pending.has(g.id) ? '…' : '—'}</td>
          <td>${c ? `<span class="b">${c.blunder}</span>/<span class="m">${c.mistake}</span>/<span class="i">${c.inaccuracy}</span>` : ''}</td>
          <td>${g.moves ? `<a class="btn small" href="#/review/${encodeURIComponent(g.id)}">Revisar</a>` : ''}</td>
        </tr>`;
      }).join('')}</tbody></table>
      <p class="muted small">Errores: <span class="b">graves</span>/<span class="m">errores</span>/<span class="i">imprecisiones</span></p>`
      : '<p class="muted">Todavía no hay partidas. Importa desde Chess.com o juega contra el bot.</p>';
  };
  drawList();
  updateSelBar();

  $('#list', node).addEventListener('change', (e) => {
    const cb = e.target.closest('.pick'); if (!cb) return;
    if (cb.checked) selected.add(cb.dataset.id); else selected.delete(cb.dataset.id);
    cb.closest('tr').classList.toggle('sel', cb.checked);
    updateSelBar();
  });
  $('#selbar', node).addEventListener('click', (e) => {
    const b = e.target.closest('[data-sel]'); if (!b) return;
    const analyzed = visible().filter((g) => g.summary);
    selected.clear();
    if (b.dataset.sel !== 'none') (b.dataset.sel === 'all' ? analyzed : analyzed.slice(0, +b.dataset.sel)).forEach((g) => selected.add(g.id));
    drawList(); updateSelBar();
  });
  $('#go-report', node).onclick = () => { setSelection([...selected]); location.hash = '#/report'; };

  $('#filter', node).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.v;
    $$('#filter button').forEach((x) => x.classList.toggle('on', x === b));
    drawList();
  });

  $('#imp', node).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const user = String(f.get('user')).trim();
    const max = +f.get('max');
    const tcs = String(f.get('tc')).split(',');
    const st = $('#imp-status', node);
    update((s) => { s.settings.chesscomUser = user; });
    st.textContent = 'Descargando partidas de Chess.com…';
    try {
      const recs = await fetchRecentGames(user, { max, timeClasses: tcs });
      if (!recs.length) { st.textContent = 'No encontramos partidas con esos filtros.'; return; }
      const added = queue.add(recs);
      st.textContent = added ? `Encontradas ${recs.length} partidas · ${added} nuevas en cola de análisis.` : `Las ${recs.length} partidas ya estaban analizadas.`;
      if (added) toast(`Analizando ${added} partidas en segundo plano`, 'info');
      drawList();
    } catch (err) {
      st.textContent = `Error: ${err.message}. Revisa el usuario o tu conexión.`;
    }
  });

  const onProg = () => drawList();
  const onDone = () => { drawList(); toast('¡Análisis terminado! Revisa tu Progreso y el plan de hoy.', 'ok', 5000); };
  let last = 0;
  const throttled = (e) => { if (e.detail.progress === 0 || Date.now() - last > 3000) { last = Date.now(); onProg(); } };
  queue.addEventListener('progress', throttled);
  queue.addEventListener('finished', onDone);
  return () => { queue.removeEventListener('progress', throttled); queue.removeEventListener('finished', onDone); };
}

function $$(sel) { return [...document.querySelectorAll(sel)]; }

function scoreOf(g) {
  if (!g.result || g.result === '*') return null;
  if (g.result === '1/2-1/2') return 0.5;
  return g.result === (g.userColor === 'w' ? '1-0' : '0-1') ? 1 : 0;
}
