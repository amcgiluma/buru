# Plan BURU Online

Estado: pendiente de implementacion  
Fecha: 2026-05-19  
Fuente de reglas: `reglas.md`

## Objetivo

Crear una aplicacion web multijugador para jugar BURU con amigos, lista para subir a GitHub, conectar a Vercel y desplegar. La prioridad del proyecto es que el frontend sea muy visual, intuitivo y bonito, con una direccion minimalista pixelart inspirada en la energia de Balatro sin copiar su arte, assets ni identidad visual.

El MVP debe permitir crear una sala, compartir un enlace, que 3-6 jugadores entren con nombre, configurar la partida, jugar varias manos completas y terminar cuando solo quede un jugador con vida.

## Decisiones Cerradas

- Stack principal: Next.js con App Router, TypeScript, Tailwind CSS y Supabase.
- Hosting: Vercel.
- Realtime y persistencia: Supabase Realtime + base de datos Supabase.
- Entrada a sala: enlace/codigo + nombre visible, sin cuentas de usuario.
- Configuracion de sala: siempre configurable antes de empezar.
- Experiencia responsive: movil y desktop con el mismo nivel de prioridad.
- Reglas MVP de baza: gana la carta de mayor valor puro; no hay obligacion de seguir palo ni palo de triunfo en el MVP.
- Desempates: configurables entre reglas Diego y reglas Lete.
- Arte de cartas: partir de assets open source adaptados, con capa visual propia pixelart.
- Nota de nombres solicitados: crear `agent.md` y `design.md` durante la implementacion. Se interpreta `design.mg` como typo de `design.md`; si se quisiera conservar literalmente, documentarlo antes de implementar.

## Entregables Del Proyecto

- Aplicacion Next.js funcional.
- Repositorio preparado para GitHub.
- Configuracion documentada para Vercel.
- Esquema Supabase versionado en el repo.
- README con instrucciones de desarrollo, despliegue y variables de entorno.
- `agent.md` con instrucciones de trabajo para futuros agentes o colaboradores.
- `design.md` con direccion visual, componentes, paleta, referencias, assets y reglas de UI.
- Sistema de juego completo segun `reglas.md`.
- Assets de cartas licenciados correctamente y atribucion incluida cuando corresponda.

## Fase 1: Scaffold Y Documentacion Base

Crear la base del proyecto sin implementar todavia reglas complejas.

- Inicializar Next.js con TypeScript, Tailwind CSS, ESLint y estructura compatible con Vercel.
- Crear `.env.example` con:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Crear README con:
  - Requisitos.
  - Instalacion.
  - Ejecucion local.
  - Variables de entorno.
  - Como conectar GitHub con Vercel.
  - Como crear el proyecto Supabase.
- Crear `agent.md` con:
  - Resumen del producto.
  - Reglas de no copiar Balatro.
  - Prioridad frontend.
  - Convenciones de codigo.
  - Comandos de test/build.
  - Archivos importantes.
- Crear `design.md` con:
  - Direccion visual pixelart minimalista.
  - Paleta base.
  - Tipografia recomendada.
  - Estilo de cartas.
  - Estados visuales de turnos, apuestas, vidas y eliminacion.
  - Reglas responsive para movil y desktop.
  - Fuentes de assets y obligaciones de licencia.

## Fase 2: Modelo De Datos Y Supabase

Crear un modelo simple, robusto y facil de depurar.

Tablas principales:

- `rooms`
  - Codigo corto unico.
  - Estado de sala: lobby, bidding, playing, hand_result, game_over.
  - Settings de partida.
  - Estado serializado del juego.
  - Version incremental para evitar escrituras obsoletas.
  - Timestamps.
- `players`
  - Sala.
  - Nombre.
  - Seat/orden de juego.
  - Vidas.
  - Estado: activo, eliminado, desconectado.
  - Marca de host.
- `room_events`
  - Sala.
  - Tipo de evento.
  - Payload JSON.
  - Jugador asociado.
  - Timestamp.

Settings de partida:

- Tipo de baraja: espanola o francesa.
- Modo de vidas: normal o extremo.
- Regla de empate: Diego o Lete.
- Numero inicial de vidas: 4.
- Jugadores permitidos: minimo 3, maximo 6.

Supabase Realtime debe emitir cambios por sala para actualizar lobby, apuestas, cartas jugadas, vidas, ganador de baza y ganador final.

## Fase 3: API Y Control De Estado

La fuente de verdad debe estar en servidor. El cliente no debe poder mutar el estado de juego directamente sin validacion.

Endpoints internos:

- `POST /api/rooms`
  - Crea sala.
  - Crea jugador host.
  - Devuelve codigo y URL de invitacion.
- `POST /api/rooms/:code/join`
  - Une jugador por nombre.
  - Rechaza nombres vacios, duplicados o sala llena.
- `POST /api/rooms/:code/start`
  - Solo host.
  - Valida 3-6 jugadores.
  - Bloquea settings.
  - Reparte primera mano.
- `POST /api/rooms/:code/action`
  - Punto unico para acciones de juego.
  - Valida turno, fase y payload.

Acciones soportadas:

- `place_bid`
- `play_card`
- `resolve_trick`
- `next_hand`
- `leave_room`

Cada accion valida la version actual del estado antes de escribir. Si la version no coincide, devuelve error recuperable y el cliente debe refrescar estado.

## Fase 4: Motor De Juego BURU

Implementar el motor como codigo puro y testeable, separado de React y Supabase.

Reglas obligatorias:

- Cada jugador empieza con 4 vidas.
- Primera mano: 5 cartas por jugador.
- Patron de cartas: `5 -> 4 -> 3 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5`, repitiendo subida y bajada.
- Apuestas:
  - Cada jugador apuesta cuantas bazas cree que ganara.
  - En ronda de 1 carta, el jugador no ve su carta antes de apostar.
  - El ultimo jugador no puede apostar un numero que haga que la suma total de apuestas sea igual al numero de cartas repartidas.
- Juego de baza:
  - Empieza quien gano la baza anterior.
  - En la primera baza de una mano empieza quien reparte.
  - Orden anti horario segun asiento.
  - Gana la carta de mayor valor.
  - En empate, aplicar regla Diego o Lete.
- Valores:
  - Baraja espanola: As/1 mas alto, luego 12, 11, 10, 7, 6, 5, 4, 3, 2 si se usa baraja de 40 cartas.
  - Baraja francesa: As mas alto, luego K, Q, J, 10...2.
- Puntuacion:
  - Modo normal: fallar la apuesta resta 1 vida.
  - Modo extremo: fallar resta `abs(bazas_ganadas - apuesta)`.
  - Acertar exacto no resta vida.
- Frases de vidas perdidas:
  - 1 vida perdida: "vas b"
  - 2 vidas perdidas: "vas bu"
  - 3 vidas perdidas: "vas bur"
  - 4 vidas perdidas: "vas buru"
- Eliminacion:
  - Jugador con 0 vidas queda eliminado.
  - La partida termina cuando solo queda un jugador con vida.

Funciones puras recomendadas:

- Crear baraja.
- Barajar con semilla opcional para tests.
- Repartir mano.
- Calcular siguiente tamano de mano.
- Validar apuesta.
- Validar carta jugada.
- Resolver ganador de baza.
- Resolver fin de mano y vidas.
- Calcular siguiente estado.
- Ocultar informacion privada por jugador.

## Fase 5: Frontend Y Experiencia De Juego

La aplicacion debe abrir directamente en una experiencia usable, no en una landing page de marketing.

Pantallas:

- Inicio:
  - Crear sala.
  - Unirse con codigo.
  - Nombre del jugador.
- Lobby:
  - Lista de jugadores.
  - Codigo/enlace para copiar.
  - Settings editables por host.
  - Estado visual de jugadores conectados.
  - Boton empezar.
- Mesa:
  - Centro con cartas jugadas en la baza actual.
  - Mano del jugador abajo.
  - Jugadores alrededor de la mesa.
  - Indicador claro de turno.
  - Apuestas y bazas ganadas visibles.
  - Vidas y frase BURU visibles.
  - Panel de accion contextual: apostar, jugar carta, esperar, siguiente mano.
- Ronda de 1 carta:
  - El jugador ve su carta oculta.
  - Los demas pueden ver esa carta en la mesa/jugador correspondiente.
  - UI debe comunicar visualmente que es una ronda especial sin texto largo.
- Resultado de mano:
  - Mostrar apuestas vs bazas reales.
  - Mostrar vidas perdidas.
  - Animacion breve de "vas b/bu/bur/buru".
- Final:
  - Ganador destacado.
  - Resumen de eliminados.
  - Accion para crear nueva sala.

Principios UI:

- Priorizar claridad visual sobre explicaciones largas.
- Usar iconos, estados y color para turnos y acciones.
- Evitar textos que expliquen obviedades.
- Botones tactiles grandes en movil.
- Nada debe solaparse en pantallas pequenas.
- Las cartas deben tener dimensiones estables y no mover el layout al seleccionarse.

## Fase 6: Direccion Visual Y Cartas

Objetivo visual: pixelart minimalista, bonito, con contraste y personalidad propia.

No copiar:

- No usar assets de Balatro.
- No replicar composiciones, jokers, UI, shaders o identidad visual reconocible de Balatro.
- La inspiracion permitida es general: energia arcade, cartas expresivas, brillo, feedback visual y tactilidad.

Cartas:

- Elegir una fuente open source compatible con uso en GitHub y despliegue publico.
- Opciones a evaluar:
  - Webisso Playing Cards, licencia MIT, buena opcion para baraja francesa.
  - Wikimedia Commons Baraja espanola SVG, CC BY-SA 3.0, requiere atribucion y puede imponer share-alike sobre derivados.
- Adaptar el arte:
  - Crear reverso propio BURU.
  - Bordes pixelart.
  - Sombras limpias.
  - Paleta limitada.
  - Numeros y palos muy legibles.
  - Estados: normal, seleccionada, jugable, bloqueada, ganadora.
- Documentar en `design.md`:
  - Fuente exacta de cada asset.
  - Licencia.
  - Cambios realizados.
  - Texto de atribucion necesario.

Paleta sugerida:

- Fondo mesa: verde azulado oscuro.
- Superficie: verde mesa o gris petroleo.
- Cartas: blanco hueso, tinta oscura, rojo profundo, dorado suave.
- Estados: amarillo para turno, verde para accion valida, rojo para error/vida perdida, azul para informacion.
- Evitar que toda la UI sea un solo tono morado, beige, marron o azul oscuro.

## Fase 7: Testing

Tests unitarios del motor:

- Patron de manos.
- Creacion de baraja espanola y francesa.
- Reparto sin duplicados.
- Validacion de apuesta del ultimo jugador.
- Rechazo de apuesta fuera de rango.
- Ganador por valor puro.
- Empate Diego.
- Empate Lete.
- Ronda de 1 carta con carta oculta para propietario.
- Resolucion normal de vidas.
- Resolucion extrema de vidas.
- Eliminacion y ganador final.

Tests de integracion:

- Crear sala y unir 3 jugadores.
- Rechazar sala llena.
- Rechazar empezar con menos de 3 jugadores.
- Host cambia settings en lobby.
- No host no puede empezar partida.
- Flujo completo de una mano.
- Accion fuera de turno rechazada.
- Estado se sincroniza tras accion valida.

Tests visuales/manuales:

- Lobby en movil y desktop.
- Mesa en movil y desktop.
- Mano con 1, 3 y 5 cartas.
- 6 jugadores en mesa.
- Textos largos de nombres.
- Estados de desconexion.
- Comprobacion de que no hay solapes.
- Build local antes de desplegar.

## Fase 8: Preparacion Para GitHub Y Vercel

Antes de considerar terminado el MVP:

- `npm run build` debe pasar.
- Tests principales deben pasar.
- README debe permitir levantar el proyecto desde cero.
- `.env.example` debe estar completo.
- No subir secretos.
- Incluir atribuciones de assets.
- Incluir instrucciones de migracion Supabase.
- Incluir pasos para conectar Vercel:
  - Importar repo desde GitHub.
  - Configurar variables de entorno.
  - Deploy.
  - Probar crear sala en produccion.

## Fuera De Alcance Del MVP

- Cuentas de usuario.
- Ranking persistente global.
- Matchmaking publico.
- Chat dentro de la sala.
- Espectadores.
- Replays.
- IA/bots.
- Palo de triunfo.
- Obligacion de seguir palo.
- App movil nativa.

## Riesgos Y Decisiones A Revisar

- Licencia de baraja espanola:
  - Si se usa Wikimedia CC BY-SA, revisar impacto en derivados y documentar atribucion.
  - Si se quiere evitar complejidad legal, crear cartas espanolas propias inspiradas en iconografia tradicional pero no derivadas.
- Supabase Realtime:
  - Validar latencia con 3-6 jugadores.
  - Mantener servidor como fuente de verdad para evitar trampas o estados inconsistentes.
- Reconexiones:
  - MVP debe permitir refrescar pagina y recuperar sala si el jugador conserva identificador local.
  - No resolver casos extremos de multiples dispositivos con el mismo jugador en v1.
- Diseno:
  - El proyecto solo debe considerarse listo si la mesa y cartas se sienten pulidas, no como prototipo funcional sin arte.

## Orden Recomendado De Implementacion

1. Scaffold Next.js + Tailwind + README + `.env.example`.
2. Crear `agent.md` y `design.md`.
3. Implementar motor puro con tests.
4. Crear esquema Supabase y cliente/server helpers.
5. Implementar API de salas y acciones.
6. Implementar lobby.
7. Implementar mesa funcional sin pulido final.
8. Integrar Realtime.
9. Implementar arte de cartas y direccion visual final.
10. Pruebas responsive y correcciones visuales.
11. Documentar deploy GitHub + Vercel.
12. Build final y checklist de release.

