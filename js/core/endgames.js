// Ejercicios de finales contra el motor.
// goal: 'mate' (dar mate en <= maxMoves) | 'promote' (coronar y mantener ventaja) | 'draw' (conseguir tablas)

export const ENDGAMES = [
  {
    id: 'two-rooks', title: 'Mate de la escalera (dos torres)', goal: 'mate', maxMoves: 12, level: 1,
    fen: '8/8/3k4/8/8/8/8/R3K2R w - - 0 1',
    tip: 'Las torres se turnan: una corta el paso al rey, la otra da jaque. El rey rival retrocede fila a fila.',
  },
  {
    id: 'queen-1', title: 'Mate con dama y rey', goal: 'mate', maxMoves: 15, level: 1,
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    tip: 'Usa la dama a salto de caballo del rey rival para encerrarlo. Cuidado con el ahogado: deja siempre una casilla libre hasta que tu rey se acerque.',
  },
  {
    id: 'queen-2', title: 'Mate con dama (rey en la esquina)', goal: 'mate', maxMoves: 10, level: 1,
    fen: '8/8/8/8/8/2k5/8/6KQ w - - 0 1',
    tip: 'Encierra al rey en una caja cada vez más pequeña y luego trae tu rey para ayudar.',
  },
  {
    id: 'rook-1', title: 'Mate con torre y rey', goal: 'mate', maxMoves: 25, level: 2,
    fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
    tip: 'La torre corta al rey en una columna o fila. Acerca tu rey en oposición y da jaque cuando los reyes estén enfrentados.',
  },
  {
    id: 'rook-2', title: 'Mate con torre (rey en el borde)', goal: 'mate', maxMoves: 15, level: 2,
    fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1',
    tip: 'Con los reyes enfrentados, un jaque de torre en la fila 8 es mate.',
  },
  {
    id: 'pawn-1', title: 'Corona el peón (rey delante)', goal: 'promote', maxMoves: 15, level: 2,
    fen: '4k3/8/8/8/8/4K3/4P3/8 w - - 0 1',
    tip: 'El rey va delante del peón. Busca la oposición: reyes enfrentados con una casilla de por medio y que le toque mover al rival.',
  },
  {
    id: 'pawn-2', title: 'Rey y peón: la oposición', goal: 'promote', maxMoves: 15, level: 3,
    fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1',
    tip: 'Los reyes están enfrentados. Usa la "jugada de reserva" del peón (e3) para que el rival tenga que ceder el paso.',
  },
  {
    id: 'square', title: 'La regla del cuadrado', goal: 'promote', maxMoves: 8, level: 2,
    fen: '8/8/8/8/1P6/8/6k1/K7 w - - 0 1',
    tip: 'Si el rey rival no puede entrar en el "cuadrado" del peón, corona solo. ¡Avanza ya!',
  },
  {
    id: 'draw-1', title: 'Defiende: tablas con rey contra rey y peón', goal: 'draw', maxMoves: 15, level: 3,
    fen: '8/4k3/8/8/4P3/4K3/8/8 w - - 0 1', side: 'b',
    tip: 'Ponte delante del peón y toma la oposición. Si el rey blanco no puede pasar, son tablas.',
  },
];
