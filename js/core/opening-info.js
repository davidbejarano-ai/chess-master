// Fichas explicativas de las aperturas (para principiantes).
// Clave = nombre de la familia, igual que el que devuelve openingName().

export const OPENING_INFO = {
  'Italiana': {
    tipo: 'Apertura abierta (1.e4 e5), clásica',
    origen: 'Una de las aperturas más antiguas: se jugaba en Italia en el siglo XVI.',
    resumen: 'Tras 1.e4 e5 2.Nf3 Nc6 3.Bc4, el alfil blanco apunta a f7, la casilla más débil del negro al principio porque solo la defiende el rey. Es una apertura natural: desarrolla piezas rápido, controla el centro y prepara el enroque. La variante Giuoco Piano ("juego tranquilo" en italiano) es la ideal para aprender.',
    ideas: {
      w: ['Jugar c3 y d3 (o d4) para tener un centro fuerte.', 'Enrocar pronto y llevar la torre a e1.', 'Mejorar el caballo de b1 por d2–f1–g3.'],
      b: ['Copiar el desarrollo: …Bc5, …Nf6, …d6 y enroque.', 'Vigilar el punto f7, sobre todo si el blanco juega Ng5.', 'Romper en el centro con …d5 cuando sea posible.'],
    },
    cuidado: ['No dejes f7/f2 sin defensa ante jugadas como Ng5 o Qh5.', 'No muevas la dama demasiado pronto.'],
  },
  'Española': {
    tipo: 'Apertura abierta (1.e4 e5), clásica',
    origen: 'Lleva el nombre de Ruy López de Segura, sacerdote español que la analizó en 1561. También se llama "Ruy López".',
    resumen: 'Tras 1.e4 e5 2.Nf3 Nc6 3.Bb5, el blanco ataca al caballo que defiende el peón de e5. Es una de las aperturas más importantes de la historia, con mucha estrategia. Con negras, la respuesta 3…a6 (Defensa Morphy) le pregunta al alfil qué quiere hacer.',
    ideas: {
      w: ['Presionar el peón de e5 y enrocar rápido.', 'Preparar c3 y d4 para dominar el centro.'],
      b: ['…a6 y …b5 echan al alfil.', 'Desarrollo sólido: …Nf6, …Be7, …d6 y enroque.', 'Si el blanco cambia Bxc6, tendrás la pareja de alfiles: ¡no es malo!'],
    },
    cuidado: ['No te apresures a defender e5 con piezas que luego estorben.', 'Ojo con las clavadas del alfil de b5 sobre el caballo de c6.'],
  },
  'Escocesa': {
    tipo: 'Apertura abierta (1.e4 e5)',
    origen: 'Se hizo famosa en una partida por correspondencia entre Edimburgo y Londres en 1824.',
    resumen: 'Tras 1.e4 e5 2.Nf3 Nc6 3.d4, el blanco abre el centro de inmediato. El juego es abierto y directo: las piezas salen rápido y hay menos maniobras que en la Española.',
    ideas: {
      w: ['Tras …exd4, recuperar con Nxd4 y desarrollar rápido.', 'Usar la ventaja de espacio en el centro.'],
      b: ['Capturar …exd4 y desarrollar con ataque: …Nf6 (atacando e4) y …Bb4 o …Bc5.', 'Enrocar rápido porque el centro se abre.'],
    },
    cuidado: ['Con el centro abierto, un rey sin enrocar es un blanco fácil.'],
  },
  'Petrov': {
    tipo: 'Defensa contra 1.e4 e5, simétrica y muy sólida',
    origen: 'Lleva el nombre del maestro ruso Alexander Petrov (siglo XIX). También se llama "Defensa Rusa".',
    resumen: 'Tras 1.e4 e5 2.Nf3 Nf6, el negro no defiende su peón: contraataca el del blanco. La posición suele ser equilibrada y tranquila.',
    ideas: {
      w: ['Tras 3.Nxe5 d6, retirar el caballo a f3 y jugar d4 y Bd3.', 'Desarrollar con calma y enrocar.'],
      b: ['Tras 3.Nxe5, jugar primero …d6 para echar al caballo y solo después recuperar el peón con …Nxe4.'],
    },
    cuidado: ['Trampa clásica: 3.Nxe5 Nxe4? 4.Qe2 Nf6?? 5.Nc6+ (jaque descubierto) gana la dama negra. Con negras, juega 3…d6 primero.'],
  },
  'Philidor': {
    tipo: 'Defensa contra 1.e4 e5, sólida pero pasiva',
    origen: 'Lleva el nombre de François-André Danican Philidor (siglo XVIII), el mejor jugador de su época y también compositor de ópera. Decía: "los peones son el alma del ajedrez".',
    resumen: 'Tras 1.e4 e5 2.Nf3 d6, el negro defiende e5 con un peón en vez de con el caballo. Es muy sólida, pero encierra al alfil de f8 y deja al negro con menos espacio. Con blancas, la idea es aprovechar ese espacio extra.',
    ideas: {
      w: ['Atacar el centro de inmediato con d4.', 'Desarrollar rápido (Nc3, Be2 o Bc4) y enrocar.', 'Aprovechar el espacio: el negro estará más apretado.'],
      b: ['Mantener el peón en e5 o cambiar en d4 y desarrollar con …Nf6, …Be7 y enroque.'],
    },
    cuidado: ['Con blancas, no te precipites con ataques sin terminar el desarrollo.', 'El alfil de c4 apuntando a f7 es una buena arma contra la Philidor.'],
  },
  'Ataque Parham': {
    tipo: 'Ataque temprano con la dama (1.e4 e5 2.Qh5)',
    origen: 'Muy común entre principiantes. Su objetivo es el "Mate del pastor": Bc4 y Qxf7#.',
    resumen: 'El blanco saca la dama en la jugada 2 para amenazar e5 y, sobre todo, el punto f7. Es fácil de refutar si sabes cómo: defiende con calma y echa a la dama ganando tiempo de desarrollo.',
    ideas: {
      w: ['(No es recomendable con blancas: la dama será perseguida.)'],
      b: ['2…Nc6 defiende e5.', 'Si viene Bc4, juega …g6 para echar a la dama y bloquear la diagonal.', 'Después, …Nf6 y …Bg7: tu desarrollo será mucho mejor.'],
    },
    cuidado: ['¡Nunca juegues …Nf6?? cuando la dama esté en h5 y el alfil en c4!: Qxf7 es jaque mate.', 'Mira siempre qué ataca la dama blanca en cada jugada.'],
  },
  'Vienesa': {
    tipo: 'Apertura abierta (1.e4 e5 2.Nc3)',
    origen: 'Se analizó mucho en Viena en el siglo XIX.',
    resumen: 'El blanco desarrolla el caballo de dama primero y deja libre el peón f para avanzarlo a f4 más adelante y atacar el centro negro.',
    ideas: {
      w: ['Preparar f4 para atacar e5.', 'Bc4 apuntando a f7.'],
      b: ['Desarrollo natural: …Nf6, …Nc6 y …Bc5.', 'Enroque rápido.'],
    },
    cuidado: ['Con negras, vigila el avance f4 y la presión sobre f7.'],
  },
  'Apertura del centro': {
    tipo: 'Apertura abierta (1.e4 e5 2.d4)',
    origen: 'Antigua y poco jugada en la élite, pero frecuente en niveles iniciales.',
    resumen: 'El blanco abre el centro en la jugada 2. Tras 2…exd4 3.Qxd4, la dama blanca queda en el centro y puede ser atacada con ganancia de tiempo.',
    ideas: {
      w: ['Desarrollar rápido para compensar la dama expuesta.'],
      b: ['3…Nc6 ataca a la dama y gana un tiempo.', 'Después, …Nf6, …Be7 y enroque. La torre en e8 presiona e4.'],
    },
    cuidado: ['Con negras, aprovecha cada jugada que el blanco gaste moviendo su dama.'],
  },
  'Gambito de rey': {
    tipo: 'Gambito (sacrificio de peón) agresivo, 1.e4 e5 2.f4',
    origen: 'El gambito romántico por excelencia: muy popular en el siglo XIX.',
    resumen: 'El blanco ofrece el peón f para abrir la columna f y atacar rápido. Es muy peligroso para ambos bandos.',
    ideas: { w: ['Desarrollo rápido y ataque por la columna f.'], b: ['Aceptar con …exf4 y desarrollar, o rechazar con …Bc5.'] },
    cuidado: ['El rey blanco queda expuesto en la diagonal e1–h4.'],
  },
  'Apertura de alfil': {
    tipo: 'Apertura abierta (1.e4 e5 2.Bc4)',
    origen: 'Recomendada por Philidor en el siglo XVIII.',
    resumen: 'El blanco saca primero el alfil hacia f7 y deja opciones flexibles para el caballo y el peón f.',
    ideas: { w: ['Desarrollo flexible: d3, Nf3, enroque.'], b: ['…Nf6 atacando e4 y desarrollo normal.'] },
    cuidado: ['Ojo con la presión temprana sobre f7.'],
  },
  'Abierta (1.e4 e5)': {
    tipo: 'Apertura abierta',
    origen: 'Familia de aperturas que empiezan 1.e4 e5.',
    resumen: 'Ambos bandos ocupan el centro con un peón de rey. Suelen ser posiciones abiertas, con desarrollo rápido y tácticas: ideales para aprender.',
    ideas: { w: ['Nf3, Bc4 o Bb5, y enroque.'], b: ['…Nc6, …Nf6, …Bc5 o …Be7, y enroque.'] },
    cuidado: ['Vigila siempre los puntos f2 y f7.'],
  },
  'Siciliana': {
    tipo: 'Defensa semiabierta contra 1.e4, asimétrica y combativa',
    origen: 'Analizada por el italiano Giulio Polerio en el siglo XVI. Hoy es la respuesta más popular contra 1.e4 en todos los niveles.',
    resumen: 'Con 1…c5 el negro lucha por la casilla d4 desde un lado, sin copiar al blanco. El blanco suele abrir el centro con d4 y tiene más espacio y desarrollo. A cambio, el negro obtiene la columna c semiabierta y un peón central extra. Las partidas suelen ser muy tácticas, con ataques en flancos opuestos.',
    ideas: {
      w: ['Abrir el centro con Nf3 y d4, y recuperar con el caballo.', 'Desarrollar rápido (Nc3, Be2 o Be3) y enrocar.', 'Planear un ataque en el flanco de rey (f4, f5).'],
      b: ['Presión por la columna c y avance de peones en el flanco de dama (…a6, …b5).'],
    },
    cuidado: ['El negro contraatacará por el flanco de dama: no te olvides de defender allí.', 'La variante con …a6 se llama Najdorf, por el gran maestro Miguel Najdorf.'],
  },
  'Francesa': {
    tipo: 'Defensa semicerrada contra 1.e4, sólida',
    origen: 'Debe su nombre a un match por correspondencia entre Londres y París (1834), donde los franceses la usaron con éxito.',
    resumen: 'Con 1…e6 y 2…d5 el negro ataca el peón de e4 desde una base sólida. Suele formarse una cadena de peones bloqueada. El punto débil del negro es su alfil de c8, encerrado detrás de sus propios peones.',
    ideas: {
      w: ['Mantener el centro con e5 y ganar espacio en el flanco de rey (f4).', 'Atacar en el flanco de rey, donde tienes más espacio.'],
      b: ['Atacar la base de la cadena blanca (d4) con …c5 y …f6.'],
    },
    cuidado: ['Con blancas, refuerza d4: si cae, tu centro se derrumba.'],
  },
  'Caro-Kann': {
    tipo: 'Defensa semiabierta contra 1.e4, muy sólida',
    origen: 'Lleva el nombre de Horatio Caro y Marcus Kann, que la analizaron en el siglo XIX.',
    resumen: 'Con 1…c6 y 2…d5 el negro ataca el centro como en la Francesa, pero sin encerrar a su alfil de c8, que suele salir a f5. Es de las defensas más sólidas y difíciles de vencer.',
    ideas: {
      w: ['Desarrollo rápido. Atacar al alfil de f5/g6 con Ng3 y h4–h5 para ganar espacio.', 'Enroque y aprovechar el espacio extra.'],
      b: ['Sacar el alfil de c8 antes de jugar …e6.', 'Estructura sólida y paciencia.'],
    },
    cuidado: ['Con blancas, no esperes ganar rápido: busca ventaja de espacio y desarrollo.'],
  },
  'Escandinava': {
    tipo: 'Defensa contra 1.e4 que ataca de inmediato el centro',
    origen: 'Analizada por jugadores escandinavos en el siglo XIX. También se llama "Defensa Centro-Contragolpe".',
    resumen: 'Con 1…d5 el negro ataca el peón de e4 en la primera jugada. Tras 2.exd5 Qxd5, la dama negra sale pronto, y el blanco puede ganar tiempo atacándola con Nc3.',
    ideas: {
      w: ['Atacar a la dama con Nc3 para ganar tiempos de desarrollo.', 'Tomar el centro con d4, jugar Nf3 y enrocar.'],
      b: ['Retirar la dama a a5 o d6, y desarrollar con …Nf6, …c6 y …Bf5.'],
    },
    cuidado: ['Con blancas, aprovecha el tiempo extra para desarrollarte: no lo gastes en jugadas de peón.'],
  },
  'Alekhine': {
    tipo: 'Defensa hipermoderna contra 1.e4',
    origen: 'Lleva el nombre del campeón mundial Alexander Alekhine.',
    resumen: 'Con 1…Nf6 el negro invita al blanco a avanzar sus peones para luego atacarlos.',
    ideas: { w: ['Ganar espacio con e5 y d4, sin sobreextenderte.'], b: ['Atacar el centro avanzado con …d6.'] },
    cuidado: ['Los peones muy avanzados pueden volverse débiles.'],
  },
  'Pirc': {
    tipo: 'Defensa hipermoderna contra 1.e4',
    origen: 'Lleva el nombre del maestro esloveno Vasja Pirc.',
    resumen: 'Con 1…d6, …Nf6 y …g6 el negro deja que el blanco ocupe el centro y lo ataca más tarde desde lejos (alfil en g7).',
    ideas: { w: ['Ocupar el centro con d4, Nc3 y desarrollo rápido.'], b: ['Fianchetto (…g6, …Bg7) y ruptura central más tarde.'] },
    cuidado: ['Con blancas, aprovecha el espacio para atacar.'],
  },
  'Moderna': {
    tipo: 'Defensa hipermoderna contra 1.e4',
    origen: 'Parecida a la Pirc.',
    resumen: 'Con 1…g6 el negro hace el fianchetto y controla el centro desde lejos con el alfil de g7.',
    ideas: { w: ['Tomar el centro con d4 y desarrollo natural.'], b: ['…Bg7, …d6 y contraataque central.'] },
    cuidado: ['El blanco tendrá más espacio: hay que contraatacar a tiempo.'],
  },
  'Peón de rey (otras)': {
    tipo: 'Aperturas con 1.e4',
    origen: 'Otras respuestas menos comunes a 1.e4.',
    resumen: 'Respuestas poco habituales. Sigue los principios: centro, desarrollo y enroque.',
    ideas: { w: ['Toma el centro con d4 y desarrolla.'], b: ['Desarrollo y control del centro.'] },
    cuidado: ['Cuando no conozcas la apertura, los principios básicos te guían.'],
  },
  'Gambito de dama': {
    tipo: 'Apertura cerrada (1.d4 d5 2.c4)',
    origen: 'Mencionada ya en el siglo XV. Es una de las aperturas más respetadas, muy usada en campeonatos del mundo.',
    resumen: 'El blanco ofrece el peón de c4 para desviar el peón negro de d5 y quedarse con el centro. No es un sacrificio real, porque el peón suele recuperarse. Con negras jugamos el Gambito de dama rehusado (2…e6): defender d5 con solidez.',
    ideas: {
      w: ['Presionar d5 con Nc3, Bg5 y Nf3.'],
      b: ['Defender d5 con …e6, desarrollar con …Nf6, …Be7 y enroque.', 'Más tarde liberarse con …c5 o …dxc4 seguido de …c5.'],
    },
    cuidado: ['El alfil de c8 queda encerrado: planea cómo sacarlo (…b6 y …Bb7, o tras …dxc4).'],
  },
  'Londres': {
    tipo: 'Sistema de apertura con 1.d4 y Bf4',
    origen: 'Se jugó en el torneo de Londres de 1922. Hoy es muy popular en todos los niveles porque el blanco juega casi siempre lo mismo.',
    resumen: 'El blanco saca el alfil a f4 antes de jugar e3 y monta una estructura sólida (d4, e3, c3, Nf3, Bd3). Es fácil de jugar, pero el negro puede igualar con un desarrollo natural.',
    ideas: {
      w: ['Montar la estructura y enrocar; luego Ne5 o ataque en el flanco de rey.'],
      b: ['…Nf6, …e6 y …Bd6 para cambiar el buen alfil blanco.', '…c5 para presionar el centro, y enroque.'],
    },
    cuidado: ['Con negras, vigila Nb5 apuntando a c7 y el caballo saltando a e5.'],
  },
  'Peón de dama': {
    tipo: 'Apertura cerrada (1.d4 d5)',
    origen: 'Familia de aperturas que empiezan 1.d4 d5.',
    resumen: 'Ambos ocupan el centro con el peón de dama. El juego suele ser más lento y estratégico que con 1.e4 e5.',
    ideas: { w: ['c4, Nf3, Nc3 o sistemas como el Londres.'], b: ['…Nf6, …e6, desarrollo sólido y enroque.'] },
    cuidado: ['Ojo con los alfiles encerrados detrás de tus peones.'],
  },
  'Sistema Colle': {
    tipo: 'Sistema tranquilo con 1.d4, Nf3, e3 y Bd3',
    origen: 'Lleva el nombre del maestro belga Edgard Colle (años 1920).',
    resumen: 'El blanco desarrolla con calma (Nf3, e3, Bd3, enroque) y prepara la ruptura e4. Es sólido, pero poco ambicioso.',
    ideas: { w: ['Enroque y luego e4.'], b: ['Desarrollo simétrico, …c5 para presionar el centro, …Nc6, …Bd6 y enroque.'] },
    cuidado: ['Con negras, vigila la ruptura e4 del blanco.'],
  },
  'India de rey': {
    tipo: 'Defensa hipermoderna contra 1.d4',
    origen: 'Popularizada por campeones como Bobby Fischer y Garry Kasparov.',
    resumen: 'El negro hace el fianchetto (…g6, …Bg7) y deja el centro al blanco para atacarlo luego con …e5 o …c5.',
    ideas: { w: ['Gran centro con c4, e4 y d4.'], b: ['Fianchetto, enroque y ruptura …e5.'] },
    cuidado: ['Las partidas suelen tener ataques en flancos opuestos.'],
  },
  'Defensas indias': {
    tipo: 'Defensas contra 1.d4 con 1…Nf6',
    origen: 'Familia hipermoderna del siglo XX.',
    resumen: 'El negro controla el centro con piezas en lugar de peones.',
    ideas: { w: ['c4, Nc3 y centro de peones.'], b: ['…e6 o …g6, y desarrollo flexible.'] },
    cuidado: ['Hay muchas variantes: guíate por los principios.'],
  },
  'Holandesa': {
    tipo: 'Defensa agresiva contra 1.d4 (1…f5)',
    origen: 'Recomendada por el holandés Elias Stein en el siglo XVIII.',
    resumen: 'El negro controla e4 con el peón f y busca atacar en el flanco de rey, aunque debilita a su rey.',
    ideas: { w: ['Aprovechar la debilidad en e6 y en la diagonal h5–e8.'], b: ['…Nf6, …e6 y ataque en el flanco de rey.'] },
    cuidado: ['La diagonal hacia el rey negro queda débil.'],
  },
  'Peón de dama (otras)': {
    tipo: 'Aperturas con 1.d4',
    origen: 'Otras respuestas a 1.d4.',
    resumen: 'Respuestas menos habituales. Sigue los principios básicos.',
    ideas: { w: ['c4, Nf3 y desarrollo.'], b: ['Control central y desarrollo.'] },
    cuidado: ['Si no la conoces, juega con principios.'],
  },
  'Inglesa': {
    tipo: 'Apertura de flanco (1.c4)',
    origen: 'Debe su nombre al inglés Howard Staunton, que la jugó en 1843.',
    resumen: 'El blanco controla la casilla d5 desde el lado con el peón c, sin ocupar el centro de inmediato. Con 1…e5 el negro obtiene una especie de "Siciliana al revés".',
    ideas: { w: ['Fianchetto (g3, Bg2) y control de d5.'], b: ['Ocupar el centro con …e5, …Nf6 y …d5.'] },
    cuidado: ['El alfil blanco de g2 presiona mucho la diagonal larga.'],
  },
  'Réti': {
    tipo: 'Apertura hipermoderna (1.Nf3)',
    origen: 'Lleva el nombre de Richard Réti, uno de los creadores de la escuela hipermoderna (años 1920).',
    resumen: 'El blanco controla el centro desde lejos con piezas y fianchettos, en vez de ocuparlo con peones.',
    ideas: { w: ['g3, Bg2, enroque y c4.'], b: ['Ocupar el centro con …d5, …Nf6 y …e6, y desarrollo sólido.'] },
    cuidado: ['Con negras, no sobreextiendas tus peones centrales.'],
  },
};

/** Ficha de una familia (o null). */
export function openingInfo(name) {
  return OPENING_INFO[name] || null;
}
