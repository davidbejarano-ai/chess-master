// Repertorio sencillo para principiantes. Cada línea: lista de [SAN, explicación opcional].
// Las explicaciones acompañan a las jugadas del propio repertorio.
import { Chess } from '../vendor/chess.js';

export const PRINCIPLES = [
  { title: 'Controla el centro', text: 'Empieza con un peón central (e4/d4 o e5/d5). El centro da espacio a tus piezas.' },
  { title: 'Desarrolla caballos y alfiles', text: 'Saca una pieza nueva en cada jugada. Caballos antes que alfiles suele ser buena idea.' },
  { title: 'Enroca pronto', text: 'Pon tu rey a salvo y conecta las torres. Intenta enrocar antes de la jugada 10.' },
  { title: 'No saques la dama temprano', text: 'El rival la atacará con piezas menores y ganará tiempo de desarrollo.' },
  { title: 'No muevas la misma pieza dos veces', text: 'Salvo para ganar material o evitar perderla.' },
  { title: 'Revisa cada jugada del rival', text: '¿Qué ataca? ¿Amenaza algo? Muchas partidas se pierden por no mirar esto.' },
];

export const REPERTOIRE = {
  w: {
    name: 'Blancas: 1.e4 e Italiana',
    lines: [
      { name: 'Italiana – Giuoco Piano', moves: [['e4', 'Peón al centro: libera a la dama y al alfil.'], ['e5'], ['Nf3', 'Desarrolla atacando el peón de e5.'], ['Nc6'], ['Bc4', 'El alfil apunta a f7, el punto débil del negro.'], ['Bc5'], ['c3', 'Prepara d4 para dominar el centro.'], ['Nf6'], ['d3', 'Protege e4 con calma, sin regalar nada.'], ['d6'], ['O-O', '¡Rey a salvo! Ahora planea Re1, Nbd2 y h3.']] },
      { name: 'Italiana – Dos caballos', moves: [['e4'], ['e5'], ['Nf3'], ['Nc6'], ['Bc4'], ['Nf6'], ['d3', 'Defiende e4. Simple y sólido: evitamos complicaciones.'], ['Be7'], ['O-O', 'Enroque. Después: Re1, c3, Nbd2.'], ['O-O'], ['Re1', 'La torre apoya el peón de e4.']] },
      { name: 'Defensa Philidor', moves: [['e4'], ['e5'], ['Nf3'], ['d6'], ['d4', 'Ataca el centro de inmediato.'], ['exd4'], ['Nxd4', 'Recupera el peón con un caballo centralizado.'], ['Nf6'], ['Nc3', 'Desarrolla y defiende e4.'], ['Be7'], ['Be2', 'Alfil fuera, listo para enrocar.'], ['O-O'], ['O-O', 'Ambos enrocados: desarrollo completo.']] },
      { name: 'Siciliana', moves: [['e4'], ['c5'], ['Nf3', 'Desarrollo natural, preparando d4.'], ['d6'], ['d4', 'Abre el centro.'], ['cxd4'], ['Nxd4', 'Caballo fuerte en el centro.'], ['Nf6'], ['Nc3', 'Defiende e4 y desarrolla.'], ['a6'], ['Be2', 'Alfil fuera y enroque a continuación.']] },
      { name: 'Siciliana con …Nc6', moves: [['e4'], ['c5'], ['Nf3'], ['Nc6'], ['d4'], ['cxd4'], ['Nxd4'], ['Nf6'], ['Nc3', 'Desarrolla y protege e4.'], ['e5'], ['Nxc6', 'Cambia antes de que lo echen.'], ['bxc6'], ['Bc4', 'Alfil activo y enroque pronto.']] },
      { name: 'Francesa', moves: [['e4'], ['e6'], ['d4', 'Toma el centro con dos peones.'], ['d5'], ['Nc3', 'Defiende e4 desarrollando.'], ['Nf6'], ['e5', 'Gana espacio y echa al caballo.'], ['Nfd7'], ['f4', 'Refuerza el peón de e5.']] },
      { name: 'Caro-Kann', moves: [['e4'], ['c6'], ['d4', 'Dos peones centrales.'], ['d5'], ['Nc3', 'Defiende e4.'], ['dxe4'], ['Nxe4', 'Recupera el peón con un caballo centralizado.'], ['Bf5'], ['Ng3', 'Ataca el alfil y gana tiempo.'], ['Bg6'], ['Nf3', 'Desarrollo y luego Bd3 o Bc4.']] },
      { name: 'Escandinava', moves: [['e4'], ['d5'], ['exd5', 'Captura el peón.'], ['Qxd5'], ['Nc3', '¡Ataca la dama ganando un tiempo!'], ['Qa5'], ['d4', 'Toma el centro.'], ['Nf6'], ['Nf3', 'Desarrolla y prepara Bc4 y enroque.']] },
      { name: 'Contra 1…e5 2…Nf6 (Petrov)', moves: [['e4'], ['e5'], ['Nf3'], ['Nf6'], ['Nxe5', 'Toma el peón.'], ['d6'], ['Nf3', 'Retira el caballo a buena casilla.'], ['Nxe4'], ['d4', 'Toma el centro; luego Bd3 echará al caballo.']] },
    ],
  },
  b: {
    name: 'Negras: 1…e5 y 1…d5',
    lines: [
      { name: 'Italiana (con negras)', moves: [['e4'], ['e5', 'Responde en el centro.'], ['Nf3'], ['Nc6', 'Defiende e5 desarrollando.'], ['Bc4'], ['Bc5', 'Alfil activo, igual que el blanco.'], ['c3'], ['Nf6', 'Ataca e4.'], ['d3'], ['d6', 'Abre camino al alfil de c8.'], ['O-O'], ['O-O', 'Rey a salvo.']] },
      { name: 'Española', moves: [['e4'], ['e5'], ['Nf3'], ['Nc6'], ['Bb5'], ['a6', 'Pregúntale al alfil qué quiere hacer.'], ['Ba4'], ['Nf6', 'Desarrolla atacando e4.'], ['O-O'], ['Be7', 'Prepara el enroque.'], ['Re1'], ['b5', 'Echa al alfil.'], ['Bb3'], ['d6', 'Protege e5. Luego enroque.']] },
      { name: 'Escocesa', moves: [['e4'], ['e5'], ['Nf3'], ['Nc6'], ['d4'], ['exd4', 'Captura el peón central.'], ['Nxd4'], ['Nf6', 'Desarrolla atacando e4.'], ['Nc3'], ['Bb4', 'Clava el caballo que defiende e4.']] },
      { name: 'Apertura del centro', moves: [['e4'], ['e5'], ['d4'], ['exd4', 'Toma el peón.'], ['Qxd4'], ['Nc6', '¡Ataca la dama ganando un tiempo!'], ['Qe3'], ['Nf6', 'Desarrolla. Luego Be7 y enroque.']] },
      { name: 'Vienesa', moves: [['e4'], ['e5'], ['Nc3'], ['Nf6', 'Desarrollo natural.'], ['Bc4'], ['Nc6', 'Desarrolla y defiende e5.'], ['d3'], ['Bc5', 'Alfil activo; luego d6 y enroque.']] },
      { name: 'Ataque Parham (Qh5)', moves: [['e4'], ['e5'], ['Qh5'], ['Nc6', '¡Defiende e5! No te asustes de la dama.'], ['Bc4'], ['g6', 'Echa a la dama y evita el mate en f7.'], ['Qf3'], ['Nf6', 'Bloquea a la dama y defiende f7.'], ['Ne2'], ['Bg7', 'Fianchetto y enroque a continuación.']] },
      { name: 'Gambito de dama', moves: [['d4'], ['d5', 'Peón al centro.'], ['c4'], ['e6', 'Defiende d5 con solidez.'], ['Nc3'], ['Nf6', 'Desarrolla.'], ['Bg5'], ['Be7', 'Rompe la clavada y prepara el enroque.'], ['e3'], ['O-O', 'Rey a salvo.']] },
      { name: 'Londres', moves: [['d4'], ['d5'], ['Bf4'], ['Nf6', 'Desarrolla.'], ['e3'], ['e6', 'Abre camino al alfil.'], ['Nf3'], ['Bd6', 'Ofrece cambiar el buen alfil blanco.'], ['Bg3'], ['O-O', 'Rey a salvo.']] },
      { name: 'Sistema con Nf3', moves: [['d4'], ['d5'], ['Nf3'], ['Nf6', 'Desarrollo simétrico.'], ['e3'], ['e6'], ['Bd3'], ['c5', 'Presiona el centro.'], ['O-O'], ['Nc6', 'Desarrolla. Luego Bd6 y enroque.']] },
      { name: 'Inglesa', moves: [['c4'], ['e5', 'Toma el centro.'], ['Nc3'], ['Nf6', 'Desarrolla.'], ['g3'], ['d5', '¡Centro!'], ['cxd5'], ['Nxd5', 'Recupera el peón con caballo central.']] },
      { name: 'Réti (1.Nf3)', moves: [['Nf3'], ['d5', 'Toma el centro.'], ['g3'], ['Nf6'], ['Bg2'], ['e6', 'Sólido.'], ['O-O'], ['Be7', 'Prepara el enroque.']] },
    ],
  },
};

/** Construye un árbol a partir de las líneas: { san -> { note, children, lines } }. */
export function buildTree(color) {
  const root = { children: {} };
  for (const line of REPERTOIRE[color].lines) {
    let node = root;
    for (const [san, note] of line.moves) {
      node.children[san] = node.children[san] || { san, note: null, children: {}, lines: [] };
      node = node.children[san];
      if (note) node.note = note;
      if (!node.lines.includes(line.name)) node.lines.push(line.name);
    }
  }
  return root;
}

/** Valida que todas las líneas sean legales. Devuelve lista de errores. */
export function validateRepertoire() {
  const errors = [];
  for (const color of ['w', 'b']) {
    for (const line of REPERTOIRE[color].lines) {
      const c = new Chess();
      for (const [san] of line.moves) {
        try { c.move(san); } catch { errors.push(`${color} ${line.name}: ${san}`); break; }
      }
    }
  }
  // Las jugadas propias deben ser únicas en cada nodo
  for (const color of ['w', 'b']) {
    const walk = (node, depth) => {
      const kids = Object.keys(node.children);
      const myTurn = (depth % 2 === 0) === (color === 'w');
      if (myTurn && kids.length > 1) errors.push(`${color}: varias respuestas propias tras ${depth} jugadas: ${kids.join(',')}`);
      kids.forEach((k) => walk(node.children[k], depth + 1));
    };
    walk(buildTree(color), 0);
  }
  return errors;
}

/** Nombre de la apertura (simple) a partir de las primeras jugadas SAN. */
const NAMES = [
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'Italiana'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'Española'],
  [['e4', 'e5', 'Nf3', 'Nc6', 'd4'], 'Escocesa'],
  [['e4', 'e5', 'Nf3', 'Nf6'], 'Petrov'],
  [['e4', 'e5', 'Nf3', 'd6'], 'Philidor'],
  [['e4', 'e5', 'Qh5'], 'Ataque Parham'],
  [['e4', 'e5', 'Nc3'], 'Vienesa'],
  [['e4', 'e5', 'd4'], 'Apertura del centro'],
  [['e4', 'e5', 'f4'], 'Gambito de rey'],
  [['e4', 'e5', 'Bc4'], 'Apertura de alfil'],
  [['e4', 'e5'], 'Abierta (1.e4 e5)'],
  [['e4', 'c5'], 'Siciliana'],
  [['e4', 'e6'], 'Francesa'],
  [['e4', 'c6'], 'Caro-Kann'],
  [['e4', 'd5'], 'Escandinava'],
  [['e4', 'Nf6'], 'Alekhine'],
  [['e4', 'd6'], 'Pirc'],
  [['e4', 'g6'], 'Moderna'],
  [['e4'], 'Peón de rey (otras)'],
  [['d4', 'd5', 'c4'], 'Gambito de dama'],
  [['d4', 'd5', 'Bf4'], 'Londres'],
  [['d4', 'Nf6', 'c4', 'g6'], 'India de rey'],
  [['d4', 'Nf6'], 'Defensas indias'],
  [['d4', 'd5'], 'Peón de dama'],
  [['d4', 'f5'], 'Holandesa'],
  [['d4'], 'Peón de dama (otras)'],
  [['c4'], 'Inglesa'],
  [['Nf3'], 'Réti'],
];

export function openingName(sans) {
  for (const [seq, name] of NAMES) if (seq.every((s, i) => sans[i] === s)) return name;
  return 'Otras aperturas';
}
