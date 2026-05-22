# BURU Online

Una aplicación web multijugador para jugar a **BURU** con amigos: crea una sala, comparte un código, entra con tu nombre, ajusta las reglas y juega manos completas hasta que solo quede una persona con vida.

> [!NOTE]
> BURU no nace de un reglamento oficial. Es un juego de mesa oral, deformado por conversaciones, grupos de amigos y reglas que fueron cambiando por el camino. Esta app captura nuestra versión.

## Qué es BURU

BURU es un juego de bazas y predicción. En cada mano recibes varias cartas, declaras cuántas bazas crees que vas a ganar y después intentas cumplir exactamente esa apuesta.

Si aciertas, sobrevives. Si fallas, pierdes vida. Y en BURU las vidas no son números: son letras.

```text
1 vida perdida   -> vas B
2 vidas perdidas -> vas BU
3 vidas perdidas -> vas BUR
4 vidas perdidas -> vas BURU
```

Cuando completas **BURU**, estás fuera. Gana la última persona que siga en pie.

## La historia

Este juego llegó a nuestro grupo como llegan muchas buenas tradiciones: mal explicado, incompleto y con una confianza absurda en que "las reglas eran así".

Venía de diferentes juegos populares que fueron pasando de boca en boca, de amigos a amigos de amigos. Por el camino se perdieron detalles, aparecieron variantes y nadie sabe muy bien qué reglas eran originales y cuáles se inventaron en algún momento del trayecto. Literalmente fue un teléfono escacharrado.

Un día, uno de mis amigos nos lo enseñó y empezamos a jugarlo. Lo llamamos **BURU**. Al principio jugábamos con 5 vidas, pero las partidas se alargaban demasiado. Después de muchas rondas, discusiones y ajustes, nos dimos cuenta de que **4 vidas** era la forma perfecta de jugar: B, BU, BUR y BURU.

Durante años lo jugamos en persona y siempre salía la misma frase: "habría que hacer una app". Esta es esa app.

## Cómo se juega

1. Se crea una sala y entran entre 3 y 6 jugadores.
2. Cada jugador empieza con 4 vidas.
3. La primera mano tiene 5 cartas por jugador.
4. Antes de jugar, cada persona declara cuántas bazas cree que ganará.
5. Se juegan las cartas por turnos y gana la baza la carta de mayor valor.
6. Al final de la mano, quien no haya acertado su predicción pierde vida.
7. Las manos siguen el patrón:

```text
5 -> 4 -> 3 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5 -> ...
```

La partida termina cuando solo queda un jugador sin eliminar.

### Reglas especiales

- **Último jugador al apostar**: no puede declarar una cantidad que haga que la suma total de apuestas sea exactamente igual al número de cartas de la mano.
- **Mano de una carta**: no ves tu propia carta, pero sí ves la de los demás.
- **Reglas Diego**: si dos cartas empatan, gana la primera carta jugada.
- **Reglas Lete**: si dos cartas empatan, gana la segunda carta jugada.
- **Modo normal**: si fallas tu apuesta, pierdes una vida.
- **Modo extremo**: pierdes tantas vidas como diferencia haya entre lo que dijiste y lo que ganaste.

## Funcionalidades

- Crear salas privadas con código corto.
- Unirse a una sala desde otro dispositivo.
- Configurar baraja española o francesa.
- Configurar modo de vidas normal o extremo.
- Elegir regla de desempate Diego o Lete.
- Jugar manos completas con turnos, apuestas, bazas y resultados.
- Tutorial visual integrado con las reglas principales.
- Sincronización en tiempo real con Supabase.
- Estado privado por jugador: cada cliente solo ve las cartas que debe ver.
- Interfaz pixelart inspirada en mesa nocturna, con feedback visual y sonoro.

## Stack técnico

- **Next.js 15** con App Router.
- **React 19**.
- **TypeScript**.
- **Tailwind CSS**.
- **Supabase** para persistencia y Realtime.
- **Vitest** y Testing Library para pruebas.
- **Vercel** como objetivo natural de despliegue.

## Arquitectura

La aplicación está separada en tres capas principales:

| Capa | Descripción |
| --- | --- |
| `src/lib/game` | Motor puro del juego: barajas, reparto, apuestas, resolución de bazas, vidas y estado público. |
| `src/lib/rooms` | Servicio de salas, jugadores, tokens, snapshots y persistencia. |
| `src/app` y `src/components` | Pantallas, API routes, lobby, mesa de juego, cartas y tutorial visual. |

El estado completo de la partida vive en Supabase, pero la app expone al cliente una versión filtrada. Las manos privadas no se publican directamente; cada jugador recibe solo la información que le corresponde.

> [!IMPORTANT]
> `rooms.game_state` no se publica al navegador mediante Realtime. Realtime se usa como señal de refresco sobre `players` y `room_events`, y el estado visible se obtiene desde la API.

## Desarrollo con IA

Esta aplicación fue desarrollada mediante un flujo de vibecoding guiado, combinando dirección humana con ejecución asistida por modelos de IA.

El proceso se apoyó en:

- Desarrollo e integración de **Custom Tools / Agentic Skills** para dotar a los modelos de IA de capacidades de interacción directa con el sistema, ejecución autónoma de código y manipulación controlada del entorno.
- Orquestación de arquitecturas multi-agente usando patrones **Plan-and-Solve** y **Reasoning and Acting (ReAct)** para descomponer tareas complejas, planificar la arquitectura y ejecutar cambios de forma secuencial.
- Bucles de ejecución autónoma con **Self-Reflection** y **Auto-Healing**, donde los agentes auditan su propio código, ejecutan pruebas, depuran errores e iteran soluciones con mínima intervención manual.

Lo difícil no era solo generar código. Era convertir una tradición de grupo, con reglas transmitidas oralmente y alguna que otra discusión de mesa, en una aplicación jugable, testeable y desplegable.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- Un proyecto Supabase.
- Una cuenta Vercel si quieres desplegarlo.

## Instalación

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` con las variables de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Abre el SQL Editor.
3. Ejecuta el contenido de `supabase/schema.sql`.
4. Copia la URL del proyecto, la anon key y la service role key en `.env.local`.

## Ejecución local

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run test     # pruebas con Vitest
npm run lint     # ESLint
npm run build    # build de producción
```

## Despliegue

1. Sube el repositorio a GitHub sin archivos `.env`.
2. Importa el proyecto en Vercel.
3. Configura las variables de entorno.
4. Despliega.
5. Crea una sala en producción y prueba con varios jugadores.

## Estructura del proyecto

```text
src/
  app/                 rutas, páginas y API routes
  components/          mesa, cartas, lobby y tutorial
  lib/
    game/              motor de reglas de BURU
    rooms/             salas, snapshots y persistencia
    sound/             sonidos de interfaz
    supabase/          clientes de Supabase
supabase/
  schema.sql           tablas, políticas y realtime
public/
  suits/spanish/       iconos de palos españoles
```

## Estado actual

El proyecto ya permite jugar una partida completa de BURU online con salas privadas, reglas configurables, persistencia en Supabase y sincronización entre clientes.

Quedan ideas naturales para futuras versiones: reconexión más avanzada, historial de partidas, estadísticas, modo espectador, más estilos de baraja y mejoras de experiencia en móvil.
