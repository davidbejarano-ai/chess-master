// Ficha visual de una apertura.
import { openingInfo } from '../core/opening-info.js';
import { esc } from './dom.js';

export const NOTATION_HELP = 'Notación: N = caballo, B = alfil, R = torre, Q = dama, K = rey; sin letra = peón. "x" = captura, "+" = jaque, O-O = enroque corto.';

/**
 * @param {string} family nombre de la familia (clave de OPENING_INFO)
 * @param {object} [opts] { color:'w'|'b' (ideas a destacar), variant, lineName }
 */
export function openingCardHtml(family, { color = null, variant = null, lineName = null } = {}) {
  const info = openingInfo(family);
  if (!info) return `<div class="opcard"><p class="muted">No hay ficha para "${esc(family)}" todavía.</p></div>`;
  const colors = color ? [color] : ['w', 'b'];
  const label = { w: 'Ideas con blancas', b: 'Ideas con negras' };
  return `<div class="opcard">
    <p class="op-type">${esc(info.tipo)}</p>
    <p>${esc(info.resumen)}</p>
    ${variant ? `<p class="op-variant"><b>${esc(lineName || 'Esta línea')}:</b> ${esc(variant)}</p>` : ''}
    ${colors.map((c) => `<h4>${label[c]}${color ? ' (tu repertorio)' : ''}</h4><ul>${info.ideas[c].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
    <h4>⚠️ Cuidado con</h4><ul>${info.cuidado.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="op-origin">📜 ${esc(info.origen)}</p>
  </div>`;
}
