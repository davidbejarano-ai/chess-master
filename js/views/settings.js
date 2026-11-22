import { getState, update, exportBackup, importBackup, resetAll } from '../storage.js';
import { el, esc, $, toast } from '../ui/dom.js';

export function render(root) {
  const s = getState();
  const node = el(`<section class="stack narrow">
    <div class="card">
      <h1>Ajustes</h1>
      <form id="f" class="stack">
        <label class="field"><span>Usuario de Chess.com</span><input name="user" value="${esc(s.settings.chesscomUser)}"></label>
        <label class="field"><span>Rating en la app (ajústalo si el bot es muy fácil o difícil)</span><input name="rating" type="number" min="100" max="2500" value="${s.rating.user}"></label>
        <button class="btn primary" type="submit">Guardar</button>
      </form>
    </div>
    <div class="card">
      <h2>Tus datos</h2>
      <p class="muted">Todo se guarda en este navegador. Exporta una copia para no perderla o pasarla a otro dispositivo.</p>
      <div class="row wrap">
        <button class="btn" id="exp">⬇ Exportar copia</button>
        <label class="btn">⬆ Importar copia<input type="file" id="imp" accept="application/json" hidden></label>
        <button class="btn danger" id="reset">Borrar todo</button>
      </div>
    </div>
    <div class="card muted small">
      <h3>Créditos</h3>
      <p>Motor: Stockfish 18 (GPL-3.0) vía stockfish.js · Reglas: chess.js (BSD-2) · Puzzles: base de datos de Lichess (CC0) · Piezas: Cburnett / Wikimedia Commons (CC BY-SA 3.0).</p>
    </div>
  </section>`);
  root.appendChild(node);
  $('#f', node).onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    update((st) => {
      st.settings.chesscomUser = String(f.get('user')).trim();
      const r = parseInt(f.get('rating'), 10);
      if (r >= 100 && r <= 2500) st.rating.user = r;
    });
    toast('Guardado', 'ok');
  };
  $('#exp', node).onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(exportBackup());
    a.download = `chess-master-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#imp', node).onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { importBackup(await file.text()); toast('Copia restaurada', 'ok'); location.hash = '#/home'; }
    catch (err) { toast('No se pudo importar: ' + err.message, 'error'); }
  };
  $('#reset', node).onclick = () => {
    if (confirm('¿Borrar todas tus partidas, progreso y ajustes? Esta acción no se puede deshacer.')) { resetAll(); toast('Datos borrados'); location.hash = '#/home'; }
  };
}
