# BURU Online

Aplicacion web multijugador para jugar BURU con amigos. El MVP permite crear una sala, compartir un codigo, entrar con nombre, configurar la partida y jugar manos completas hasta que solo quede un jugador con vida.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- Un proyecto Supabase.
- Una cuenta Vercel para desplegar.

## Instalacion

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` con las variables de Supabase.

## Ejecucion Local

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Variables De Entorno

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anonima publica.
- `SUPABASE_SERVICE_ROLE_KEY`: clave de servicio para rutas API del servidor. No la expongas al navegador.

## Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta `supabase/schema.sql`.
4. Copia URL, anon key y service role key a `.env.local`.

Realtime se activa para `players` y `room_events`; la app usa esos cambios como senal para refrescar el estado filtrado desde la API. `rooms.game_state` no se publica al cliente para evitar filtrar manos privadas.

## GitHub Y Vercel

1. Sube el repositorio a GitHub sin archivos `.env`.
2. En Vercel, usa **Add New Project** e importa el repo.
3. Configura las tres variables de entorno.
4. Deploy.
5. Prueba crear una sala en produccion y entrar con tres jugadores.

## Comandos

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Licencias De Assets

El MVP usa cartas renderizadas con HTML/CSS propio, no assets externos. La direccion visual evita copiar composiciones, shaders, jokers, UI o identidad reconocible de Balatro.
