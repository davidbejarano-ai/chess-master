// Tablero de ajedrez interactivo (clic o arrastrar), con flechas, resaltados y diálogo de coronación.
import { Chess } from '../vendor/chess.js';
import { play, playMove } from './sound.js';

const FILES = 'abcdefgh';
const PIECES_URL = new URL('../../assets/pieces.svg', import.meta.url).href;
const NS = 'http://www.w3.org/2000/svg';

export class Board {
  /**
   * @param {HTMLElement} root
   * @param {object} opts
   * @param {'w'|'b'} [opts.orientation]
   * @param {(color:string)=>boolean} [opts.canMove] ¿puede el usuario mover piezas de este color ahora?
   * @param {(move:{from,to,promotion})=>void} [opts.onMove]
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.opts = opts;
    this.orientation = opts.orientation || 'w';
    this.chess = new Chess();
    this.selected = null;
    this.lastMove = null;
    this.marks = {};
    this.arrows = [];
    this._build();
    this.render();
  }

  _build() {
    this.root.classList.add('board-wrap');
    this.root.innerHTML = '';
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'board';
    this.boardEl.setAttribute('role', 'grid');
    this.boardEl.setAttribute('aria-label', 'Tablero de ajedrez');
    this.squares = {};
    for (let i = 0; i < 64; i++) {
      const d = document.createElement('div');
      d.className = 'sq';
      this.boardEl.appendChild(d);
    }
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'arrows');
    this.svg.setAttribute('viewBox', '0 0 8 8');
    this.svg.innerHTML = `<defs>
      <marker id="ah-g" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="var(--arrow-good)"/></marker>
      <marker id="ah-b" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="var(--arrow-bad)"/></marker>
      <marker id="ah-h" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="var(--arrow-hint)"/></marker>
    </defs>`;
    this.root.appendChild(this.boardEl);
    this.root.appendChild(this.svg);
    this.promo = document.createElement('div');
    this.promo.className = 'promo hidden';
    this.root.appendChild(this.promo);

    this.boardEl.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (this._mv = (e) => this._move(e)));
    window.addEventListener('pointerup', (this._up = (e) => this._release(e)));
  }

  destroy() {
    window.removeEventListener('pointermove', this._mv);
    window.removeEventListener('pointerup', this._up);
  }

  setPosition(fen, lastMove = null) {
    const prev = this.chess.fen();
    if (lastMove && prev !== fen && this.opts.sound !== false) this._soundFor(prev, fen, lastMove);
    this.chess.load(fen);
    this.lastMove = lastMove;
    this.selected = null;
    this.render();
  }

  /** Reproduce el sonido de la jugada que lleva de `prev` a `fen`. */
  _soundFor(prev, fen, lm) {
    try {
      const after = new Chess(fen);
      const piece = after.get(lm.to);
      const c = new Chess(prev);
      const mv = c.move({ from: lm.from, to: lm.to, promotion: piece && piece.type !== 'p' && c.get(lm.from)?.type === 'p' ? piece.type : undefined });
      playMove(mv, after.inCheck());
    } catch {
      play('move'); // salto de posición (p. ej. al navegar en la revisión)
    }
  }

  setOrientation(c) { this.orientation = c; this.render(); }
  flip() { this.setOrientation(this.orientation === 'w' ? 'b' : 'w'); }

  /** marks: { square: 'good'|'bad'|'hint'|'target' } */
  setMarks(marks = {}) { this.marks = marks; this.render(); }
  /** arrows: [{from,to,kind:'good'|'bad'|'hint'}] */
  setArrows(arrows = []) { this.arrows = arrows; this._drawArrows(); }

  _squareAt(index) {
    const r = Math.floor(index / 8), f = index % 8;
    return this.orientation === 'w' ? FILES[f] + (8 - r) : FILES[7 - f] + (r + 1);
  }

  _indexOf(square) {
    const f = FILES.indexOf(square[0]), r = +square[1];
    return this.orientation === 'w' ? (8 - r) * 8 + f : (r - 1) * 8 + (7 - f);
  }

  render() {
    const cells = this.boardEl.children;
    const dests = this.selected ? this._dests(this.selected) : [];
    const inCheck = this.chess.inCheck();
    const kingSq = inCheck ? this.chess.findPiece({ type: 'k', color: this.chess.turn() })[0] : null;
    for (let i = 0; i < 64; i++) {
      const s = this._squareAt(i);
      const cell = cells[i];
      const f = FILES.indexOf(s[0]), r = +s[1];
      const light = (f + r) % 2 === 1;
      const cls = ['sq', light ? 'light' : 'dark'];
      if (this.lastMove && (this.lastMove.from === s || this.lastMove.to === s)) cls.push('last');
      if (this.selected === s) cls.push('sel');
      if (kingSq === s) cls.push('check');
      if (this.marks[s]) cls.push('mk-' + this.marks[s]);
      const p = this.chess.get(s);
      if (dests.includes(s)) cls.push(p ? 'cap' : 'dest');
      cell.className = cls.join(' ');
      cell.dataset.sq = s;
      const coordFile = (this.orientation === 'w' ? r === 1 : r === 8) ? `<span class="cf">${s[0]}</span>` : '';
      const coordRank = (this.orientation === 'w' ? f === 0 : f === 7) ? `<span class="cr">${r}</span>` : '';
      const piece = p ? `<svg class="pc" viewBox="0 0 40 40"><use href="${PIECES_URL}#${p.color}${p.type}"/></svg>` : '';
      const html = coordFile + coordRank + piece;
      if (cell._html !== html) { cell.innerHTML = html; cell._html = html; }
    }
    this._drawArrows();
  }

  _center(square) {
    const idx = this._indexOf(square);
    return { x: (idx % 8) + 0.5, y: Math.floor(idx / 8) + 0.5 };
  }

  _drawArrows() {
    [...this.svg.querySelectorAll('line,circle')].forEach((n) => n.remove());
    for (const a of this.arrows) {
      const p1 = this._center(a.from), p2 = this._center(a.to);
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const k = (len - 0.35) / len;
      const line = document.createElementNS(NS, 'line');
      const key = a.kind === 'bad' ? 'b' : a.kind === 'hint' ? 'h' : 'g';
      line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p1.x + dx * k); line.setAttribute('y2', p1.y + dy * k);
      line.setAttribute('class', 'arrow ' + (a.kind || 'good'));
      line.setAttribute('marker-end', `url(#ah-${key})`);
      this.svg.appendChild(line);
    }
  }

  _dests(from) {
    return this.chess.moves({ square: from, verbose: true }).map((m) => m.to);
  }

  _canMovePiece(square) {
    const p = this.chess.get(square);
    if (!p || p.color !== this.chess.turn()) return false;
    return this.opts.canMove ? this.opts.canMove(p.color) : true;
  }

  _sqFromEvent(e) {
    const rect = this.boardEl.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const f = Math.floor((x / rect.width) * 8), r = Math.floor((y / rect.height) * 8);
    return this._squareAt(r * 8 + f);
  }

  _down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!this.promo.classList.contains('hidden')) return;
    const s = this._sqFromEvent(e);
    if (!s) return;
    if (this.selected && this.selected !== s && this._dests(this.selected).includes(s)) {
      this._attempt(this.selected, s);
      return;
    }
    if (this._canMovePiece(s)) {
      e.preventDefault();
      if (this.selected !== s && this.opts.sound !== false) play('select');
      this.selected = s;
      this.render();
      const cell = this.boardEl.children[this._indexOf(s)];
      const pc = cell.querySelector('.pc');
      if (pc) {
        const rect = cell.getBoundingClientRect();
        this.drag = { from: s, ghost: pc.cloneNode(true), size: rect.width, origin: pc, moved: false, x: e.clientX, y: e.clientY };
      }
    } else {
      this.selected = null;
      this.render();
    }
  }

  _move(e) {
    if (!this.drag) return;
    const d = this.drag;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    if (!d.moved) {
      d.moved = true;
      d.ghost.classList.add('ghost');
      d.ghost.style.width = d.ghost.style.height = d.size + 'px';
      document.body.appendChild(d.ghost);
      d.origin.style.opacity = '0.25';
    }
    d.ghost.style.left = e.clientX - d.size / 2 + 'px';
    d.ghost.style.top = e.clientY - d.size / 2 + 'px';
  }

  _release(e) {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    if (d.moved) {
      d.ghost.remove();
      d.origin.style.opacity = '';
      const to = this._sqFromEvent(e);
      if (to && to !== d.from && this._dests(d.from).includes(to)) this._attempt(d.from, to);
      else {
        if (to && to !== d.from && this.opts.sound !== false) play('illegal');
        this.render();
      }
    }
  }

  async _attempt(from, to) {
    const p = this.chess.get(from);
    let promotion;
    if (p.type === 'p' && (to[1] === '8' || to[1] === '1')) {
      promotion = await this._askPromotion(p.color, to);
      if (!promotion) { this.selected = null; this.render(); return; }
    }
    this.selected = null;
    if (this.opts.onMove) this.opts.onMove({ from, to, promotion });
  }

  _askPromotion(color, to) {
    return new Promise((resolve) => {
      this.promo.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'promo-box';
      for (const t of ['q', 'r', 'b', 'n']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', { q: 'Dama', r: 'Torre', b: 'Alfil', n: 'Caballo' }[t]);
        b.innerHTML = `<svg viewBox="0 0 40 40"><use href="${PIECES_URL}#${color}${t}"/></svg>`;
        b.onclick = (ev) => { ev.stopPropagation(); this.promo.classList.add('hidden'); resolve(t); };
        box.appendChild(b);
      }
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'promo-cancel'; cancel.textContent = '✕';
      cancel.onclick = (ev) => { ev.stopPropagation(); this.promo.classList.add('hidden'); resolve(null); };
      box.appendChild(cancel);
      this.promo.appendChild(box);
      this.promo.classList.remove('hidden');
    });
  }
}
