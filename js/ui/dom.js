// Utilidades mínimas de DOM.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function toast(msg, kind = 'info', ms = 3000) {
  let box = document.getElementById('toasts');
  if (!box) { box = el('<div id="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
  const t = el(`<div class="toast ${kind}">${esc(msg)}</div>`);
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

export function fmtClock(sec) {
  if (sec === null || sec === undefined) return '--:--';
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  if (s < 20) return `${m}:${String(r).padStart(2, '0')}.${Math.floor((s * 10) % 10)}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pct(x) { return x === null || x === undefined ? '—' : `${Math.round(x)}%`; }

/** Ventana emergente simple. */
export function showModal(html) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  d.innerHTML = `<button class="modal-close" aria-label="Cerrar">✕</button><div class="modal-body">${html}</div>`;
  document.body.appendChild(d);
  const close = () => { d.close(); d.remove(); };
  d.querySelector('.modal-close').onclick = close;
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  d.addEventListener('cancel', () => d.remove());
  d.showModal();
  return d;
}
