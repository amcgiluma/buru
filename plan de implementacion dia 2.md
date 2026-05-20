# Plan De Implementacion Dia 2

## Resumen

Crear una pausa sincronizada al terminar cada baza: la ultima carta queda visible, aparece un mensaje tipo `Ana ha ganado la baza`, y se muestra `2 ganadas / 3 declaradas`. La pausa durara 3 segundos y despues avanzara automaticamente.

Ademas, se pulira el frontend con direccion `pixel arcade`: landing centrada, logo BURU mas potente, mejor feedback visual, responsive y sonidos mas claros.

## Contexto Actual

- Proyecto: Next 15, React 19, Tailwind, Vitest.
- Baseline antes del plan:
  - `npm test`: pasa 28/28.
  - `.\node_modules\.bin\tsc --noEmit`: pasa.
  - `npm run lint`: pasa.
  - `npm run build`: pasa.
- El flujo actual resuelve la baza dentro de `playCard` en `src/lib/game/engine.ts`.
- Al jugar la ultima carta, el motor limpia `currentTrick` inmediatamente y cambia el turno al ganador, por eso el frontend no puede mostrar la ultima carta ni el mensaje de ganador.
- `src/lib/sound/ui-sounds.ts` ya contiene sonidos sintetizados con Web Audio.
- `design.md` define una direccion visual pixelart minimalista que se debe conservar y mejorar.

## Cambios Clave De Motor

- En `src/lib/game/types.ts`, anadir `GamePhase: "trick_result"`.
- En `RoomAction`, anadir una accion `continue_trick`.
- En `GameState`, anadir `lastTrickWinnerPlayerId?: string`.
- En `playCard`, cuando se juegue la ultima carta de una baza:
  - calcular ganador;
  - incrementar `tricksWon`;
  - guardar la baza en `completedTricks`;
  - mantener `currentTrick` visible;
  - poner `phase: "trick_result"`;
  - guardar `lastTrickWinnerPlayerId`.
- Anadir `continueTrick(state)`:
  - si quedan bazas en la mano, limpia `currentTrick` y vuelve a `playing`;
  - si era la ultima baza, resuelve la mano y pasa a `hand_result` o `game_over`.
- Mantener `room.status` como `"playing"` durante `trick_result`, para no tocar el check constraint de Supabase.

## Cambios Frontend

- En `GameTable`, renderizar un banner `aria-live="polite"` durante `trick_result`:
  - `Jugador ha ganado la baza`;
  - `Ganadas: X / Declaradas: Y`;
  - destacar visualmente la tarjeta del jugador ganador.
- Anadir un `useEffect` que lance `continue_trick` tras 3 segundos.
- Solo el cliente del ganador enviara automaticamente `continue_trick`, con boton de fallback `Continuar`.
- Rehacer la landing en `src/app/page.tsx`:
  - logo BURU grande con estilo pixel usando CSS propio, sin fuente externa;
  - formularios de crear/unirse centrados en viewport;
  - layout estable en movil y desktop.
- Corregir clipping de cartas:
  - aplicar un contenedor de mano con padding vertical suficiente;
  - mantener scroll horizontal sin cortar el hover `translateY`.
- Mejorar feedback:
  - estados `hover`, `active`, `focus-visible`, `disabled`;
  - mensajes de turno y error mas claros;
  - anadir sonidos `trick` y/o `advance` en `src/lib/sound/ui-sounds.ts`.

## Tests

- `engine.test.ts`:
  - jugar la ultima carta deja `phase: "trick_result"` y conserva `currentTrick`;
  - `tricksWon` ya incluye la baza ganada;
  - `continueTrick` arranca la siguiente baza con el ganador;
  - en la ultima baza, `continueTrick` pasa a resultado de mano.
- `service.test.ts`:
  - flujo de mano de una carta: `play_card` termina en `trick_result`, luego `continue_trick` termina en `hand_result` o `game_over`.
- `room-client.test.tsx`:
  - muestra `ha ganado la baza`;
  - muestra `Ganadas: X / Declaradas: Y`;
  - conserva las cartas jugadas visibles durante `trick_result`.
- `ui-sounds.test.ts`:
  - los nuevos sonidos existen y devuelven copias inmutables.

## Verificacion Final

- Ejecutar:
  - `npm test`
  - `.\node_modules\.bin\tsc --noEmit`
  - `npm run lint`
  - `npm run build`
- Levantar `npm run dev` y revisar en navegador:
  - landing en movil y desktop;
  - sala/lobby responsive;
  - baza completa con 3 jugadores;
  - pausa de 3 segundos antes del siguiente turno;
  - cartas sin clipping al hacer hover.
