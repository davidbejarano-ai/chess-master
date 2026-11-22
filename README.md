# ♞ Chess Master

Entrenador de ajedrez personal que funciona en el navegador. Juega partidas contra un bot que se adapta a tu nivel, analiza tus partidas (también las de Chess.com) con Stockfish, detecta tus **patrones de error y de acierto** y genera un **plan de entrenamiento diario** para corregir tus puntos débiles.

Pensado para jugadores que empiezan (≈250-800 de rating en Chess.com).

## Qué hace

| Sección | Qué encontrarás |
|---|---|
| **Inicio** | Plan del día (~25-30 min), tus 3 puntos a mejorar, tus fortalezas y la rutina antes de cada jugada. |
| **Jugar** | Partidas de 10 min (o 15+10, 5 min, sin reloj) contra un bot adaptativo. Botón de pista siempre disponible (se registra, y las victorias con pistas suman la mitad). Al terminar, la partida se analiza sola. |
| **Entrenar** | Puzzles por tema (1.600 puzzles reales de Lichess, de 350 a 1.250), repaso de tus propios errores con repetición espaciada, entrenador de aperturas y finales básicos contra Stockfish. |
| **Partidas** | Importa tus partidas públicas de Chess.com por usuario y revísalas jugada a jugada: clasificación (mejor, excelente, imprecisión, error, error grave), gráfica de evaluación y momentos clave. |
| **Progreso** | Perfil de jugador: debilidades ordenadas por gravedad, fortalezas, precisión por fase, resultados por color y por apertura, evolución del rating y de los errores graves. |

### Patrones que detecta

- **Errores:** piezas colgadas, no ver la amenaza del rival, no capturar material gratis, permitir mate (y mate del pasillo), no ver el mate, horquillas (no verlas y caer en ellas), clavadas, pérdida de material por combinaciones, desperdiciar ventajas, no rematar partidas ganadas, errores en finales, apuros de tiempo y jugadas impulsivas (usando el reloj de Chess.com).
- **Apertura:** sacar la dama pronto, mover el peón f, mover la misma pieza dos veces, desarrollo lento, no enrocar.
- **Aciertos:** aprovechar errores del rival, encontrar mates, horquillas y clavadas, capturar material gratis, defensa tenaz, enroque temprano, buena apertura, remontadas y conversión de ventajas.

Cada patrón está ligado a temas de puzzles y módulos concretos; el plan del día prioriza lo que más se repite en tus últimas 30 partidas.

## Cómo usarla

Abre la app publicada en GitHub Pages (ver abajo) o ejecútala en local:

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

Hace falta un servidor (no funciona abriendo `index.html` con doble clic) porque el motor corre en un Web Worker.

**Primeros pasos recomendados**

1. Ve a **Partidas** e importa tus últimas 20-40 partidas de Chess.com (tu usuario ya viene puesto).
2. Revisa **Progreso** para ver tu diagnóstico.
3. Cada día completa el **Plan de hoy** desde Inicio.

Tus datos se guardan en el navegador (localStorage). Usa **⚙ Ajustes → Exportar copia** para guardarlos o pasarlos a otro dispositivo.

## Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` ejecuta las pruebas y publica la app cada vez que hay cambios en `main`.

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz merge a `main` (o lanza el workflow a mano desde la pestaña *Actions*).
3. La app quedará en `https://davidbejarano-ai.github.io/chess-master/`.

> GitHub Pages en repositorios **privados** requiere un plan de pago (GitHub Pro, Team o Enterprise). Con un plan gratuito, haz el repositorio público o ejecuta la app en local.

## Desarrollo

Sin dependencias ni paso de compilación: HTML, CSS y módulos ES.

```
index.html            Estructura y navegación
css/app.css           Estilos (modo claro y oscuro)
js/app.js             Router
js/views/             Pantallas (inicio, jugar, entrenar, partidas, revisión, progreso, ajustes)
js/core/              Lógica pura y testeable: análisis, tácticas, perfil, plan, bot, aperturas, finales
js/engine.js          Stockfish en Web Worker con cola de prioridad
js/analyzer.js        Análisis de partidas completas y cola en segundo plano
js/chesscom.js        Importación desde la API pública de Chess.com
data/puzzles.json     Puzzles seleccionados de la base de Lichess
vendor/stockfish/     Stockfish 18 lite (WASM, un hilo)
tests/                Pruebas unitarias y de integración con el motor
```

```bash
npm test   # Node 20+; incluye pruebas que ejecutan Stockfish
```

## Créditos y licencias

- [Stockfish](https://stockfishchess.org/) 18 vía [stockfish.js](https://github.com/nmrugg/stockfish.js) — GPL-3.0
- [chess.js](https://github.com/jhlywa/chess.js) — BSD-2-Clause
- Puzzles: [base de datos de Lichess](https://database.lichess.org/#puzzles) — CC0
- Piezas: Cburnett / Wikimedia Commons (vía cm-chessboard) — CC BY-SA 3.0

Este proyecto se distribuye bajo **GPL-3.0** (ver `LICENSE`).
