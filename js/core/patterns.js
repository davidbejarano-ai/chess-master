// Catálogo de patrones de error/acierto, consejos y su relación con los entrenamientos.

/**
 * themes: temas de puzzles de Lichess para entrenarlo.
 * modules: módulos extra (openings, endgames, review, checklist).
 * weight: gravedad relativa del patrón.
 */
export const WEAKNESSES = {
  hanging: {
    label: 'Piezas colgadas',
    desc: 'Mueves una pieza a una casilla donde la pueden capturar gratis, o la dejas sin defensa.',
    advice: 'Antes de soltar la pieza pregúntate: "¿Quién ataca la casilla adonde voy? ¿Quién la defiende?"',
    themes: ['hangingPiece'], modules: ['review', 'checklist'], weight: 3,
  },
  ignoredThreat: {
    label: 'No ves la amenaza del rival',
    desc: 'El rival atacó una de tus piezas y jugaste otra cosa sin defenderla.',
    advice: 'Después de cada jugada del rival pregúntate: "¿Qué quiere hacer? ¿Qué ataca ahora?"',
    themes: ['hangingPiece', 'defensiveMove'], modules: ['review', 'checklist'], weight: 3,
  },
  missedCapture: {
    label: 'No capturas piezas gratis',
    desc: 'El rival dejó material sin defensa y no lo tomaste.',
    advice: 'En cada turno revisa: "¿Hay alguna pieza del rival que pueda capturar gratis?"',
    themes: ['hangingPiece', 'capturingDefender'], modules: ['review'], weight: 2,
  },
  allowedMate: {
    label: 'Permites jaque mate',
    desc: 'Una jugada tuya dejó un mate disponible para el rival.',
    advice: 'Revisa todos los jaques posibles del rival antes de mover, sobre todo cerca de tu rey.',
    themes: ['mateIn1', 'defensiveMove', 'backRankMate'], modules: ['review', 'checklist'], weight: 4,
  },
  backRank: {
    label: 'Mate del pasillo',
    desc: 'Tu rey quedó encerrado en la última fila por sus propios peones.',
    advice: 'Haz "luft": mueve un peón delante del rey (h3/h6) cuando tengas tiempo.',
    themes: ['backRankMate'], modules: [], weight: 3,
  },
  missedMate: {
    label: 'No ves el mate',
    desc: 'Tenías jaque mate disponible y no lo jugaste.',
    advice: 'Busca primero jaques, luego capturas, luego amenazas (en ese orden).',
    themes: ['mateIn1', 'mateIn2', 'smotheredMate', 'kingsideAttack'], modules: ['review'], weight: 3,
  },
  missedFork: {
    label: 'No ves horquillas',
    desc: 'Había una jugada que atacaba dos piezas a la vez y no la encontraste.',
    advice: 'Fíjate en casillas desde donde un caballo o peón ataque dos piezas al mismo tiempo.',
    themes: ['fork'], modules: ['review'], weight: 2,
  },
  fellForFork: {
    label: 'Caes en horquillas',
    desc: 'Dejas tus piezas donde el rival puede atacar dos a la vez.',
    advice: 'Evita dejar rey, dama y torres en casillas alcanzables por el mismo caballo.',
    themes: ['fork'], modules: ['review'], weight: 2,
  },
  missedPin: {
    label: 'No aprovechas clavadas',
    desc: 'Había una clavada o rayos X que ganaba material.',
    advice: 'Cuando el rey o la dama rival estén en la misma línea que otra pieza, busca alfiles y torres.',
    themes: ['pin', 'skewer'], modules: [], weight: 2,
  },
  fellForPin: {
    label: 'Caes en clavadas',
    desc: 'Tus piezas quedan alineadas con el rey o la dama y el rival las clava.',
    advice: 'No alinees rey y dama en la misma diagonal o columna que un alfil/torre rival.',
    themes: ['pin', 'skewer'], modules: [], weight: 2,
  },
  fellForTactic: {
    label: 'Pierdes material por tácticas',
    desc: 'Tu jugada permitió al rival una secuencia (ataque doble, jaque y captura…) que gana material.',
    advice: 'Después de mover, imagina los jaques del rival: ¿alguno ataca algo más al mismo tiempo?',
    themes: ['discoveredAttack', 'attraction', 'deflection'], modules: ['review'], weight: 2,
  },
  threwAdvantage: {
    label: 'Desperdicias ventajas',
    desc: 'Estabas ganando claramente y una jugada te devolvió al empate o peor.',
    advice: 'Con ventaja, juega simple: cambia piezas, protege todo y no te apresures.',
    themes: ['defensiveMove'], modules: ['review'], weight: 2,
  },
  noConversion: {
    label: 'No rematas partidas ganadas',
    desc: 'Tuviste posiciones ganadas que terminaron en empate o derrota.',
    advice: 'Practica los mates básicos para cerrar partidas con ventaja material.',
    themes: ['promotion', 'advancedPawn'], modules: ['endgames'], weight: 2,
  },
  endgameError: {
    label: 'Errores en el final',
    desc: 'Pierdes ventaja cuando quedan pocas piezas.',
    advice: 'En el final, el rey es una pieza de ataque: ¡llévalo al centro!',
    themes: ['pawnEndgame', 'rookEndgame', 'promotion'], modules: ['endgames'], weight: 2,
  },
  positional: {
    label: 'Jugadas sin plan',
    desc: 'Errores sin táctica concreta: piezas mal colocadas o jugadas que empeoran la posición.',
    advice: 'Cuando no haya táctica, mejora tu pieza peor colocada.',
    themes: ['advancedPawn', 'exposedKing'], modules: ['openings'], weight: 1,
  },
  timePressure: {
    label: 'Apuros de tiempo',
    desc: 'Cometes errores cuando te queda poco reloj.',
    advice: 'Reparte tu tiempo: juega la apertura rápido con principios y guarda minutos para el medio juego.',
    themes: [], modules: ['openings'], weight: 1,
  },
  impulsive: {
    label: 'Jugadas impulsivas',
    desc: 'Errores graves jugados en menos de 3 segundos teniendo tiempo de sobra.',
    advice: 'Antes de soltar la pieza, cuenta hasta 3 y haz la revisión: jaques, capturas, amenazas.',
    themes: [], modules: ['checklist'], weight: 2,
  },
  earlyQueen: {
    label: 'Sacas la dama muy pronto',
    desc: 'Mueves la dama en las primeras jugadas y el rival gana tiempo atacándola.',
    advice: 'Desarrolla caballos y alfiles antes que la dama.',
    themes: ['opening'], modules: ['openings'], weight: 1,
  },
  fPawn: {
    label: 'Mueves el peón f temprano',
    desc: 'Mover el peón f debilita la diagonal de tu rey.',
    advice: 'En la apertura prioriza los peones centrales (e y d).',
    themes: ['opening'], modules: ['openings'], weight: 1,
  },
  samePieceTwice: {
    label: 'Mueves la misma pieza dos veces',
    desc: 'En la apertura repites jugadas con una pieza en vez de desarrollar otras.',
    advice: 'Cada jugada de apertura debería sacar una pieza nueva.',
    themes: ['opening'], modules: ['openings'], weight: 1,
  },
  slowDevelopment: {
    label: 'Desarrollo lento',
    desc: 'Tras 10 jugadas aún tienes caballos o alfiles sin mover.',
    advice: 'Objetivo: caballos y alfiles fuera y enroque antes de la jugada 10.',
    themes: ['opening'], modules: ['openings'], weight: 1,
  },
  noCastle: {
    label: 'No enrocas',
    desc: 'Tu rey se queda en el centro mientras las damas siguen en el tablero.',
    advice: 'Enroca pronto (normalmente corto) para proteger al rey.',
    themes: ['exposedKing', 'kingsideAttack'], modules: ['openings'], weight: 2,
  },
};

export const STRENGTHS = {
  punished: { label: 'Aprovechas errores del rival', desc: 'Cuando el rival se equivoca, encuentras la mejor respuesta.' },
  foundMate: { label: 'Encuentras mates', desc: 'Ves y ejecutas jaques mate.' },
  tookFreePiece: { label: 'Capturas material gratis', desc: 'No dejas pasar piezas sin defensa.' },
  foundFork: { label: 'Haces horquillas', desc: 'Atacas dos piezas a la vez.' },
  foundPin: { label: 'Usas clavadas', desc: 'Aprovechas piezas alineadas.' },
  toughDefense: { label: 'Defensa tenaz', desc: 'En posiciones difíciles encuentras la mejor defensa.' },
  castledEarly: { label: 'Enroque temprano', desc: 'Pones a tu rey a salvo pronto.' },
  goodOpening: { label: 'Buena apertura', desc: 'Sigues los principios: desarrollo, centro y enroque.' },
  converted: { label: 'Rematas ventajas', desc: 'Conviertes posiciones ganadas en victorias.' },
  comeback: { label: 'Remontadas', desc: 'Salvas o ganas partidas que parecían perdidas.' },
};

export const PHASE_LABEL = { opening: 'Apertura', middlegame: 'Medio juego', endgame: 'Final' };

export const THEME_LABEL = {
  hangingPiece: 'Pieza colgada', fork: 'Horquilla', pin: 'Clavada', skewer: 'Rayos X / enfilada',
  discoveredAttack: 'Ataque descubierto', mateIn1: 'Mate en 1', mateIn2: 'Mate en 2', backRankMate: 'Mate del pasillo',
  trappedPiece: 'Pieza atrapada', capturingDefender: 'Eliminar al defensor', promotion: 'Coronación',
  defensiveMove: 'Jugada defensiva', pawnEndgame: 'Final de peones', rookEndgame: 'Final de torres',
  queenEndgame: 'Final de damas', opening: 'Trampas de apertura', doubleCheck: 'Jaque doble',
  attraction: 'Atracción', deflection: 'Desviación', smotheredMate: 'Mate de la coz', exposedKing: 'Rey expuesto',
  advancedPawn: 'Peón avanzado', kingsideAttack: 'Ataque al enroque',
};

export const CLS_LABEL = {
  best: 'Mejor', excellent: 'Excelente', good: 'Buena', inaccuracy: 'Imprecisión', mistake: 'Error', blunder: 'Error grave',
};
