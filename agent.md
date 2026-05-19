# Instrucciones Para Agentes

## Producto

BURU Online es una app Next.js para jugar BURU en salas privadas de 3 a 6 jugadores, sin cuentas, con Supabase como persistencia y realtime.

## Reglas De Arte

- No copiar Balatro ni usar sus assets.
- No replicar jokers, composiciones, shaders, UI o identidad visual reconocible.
- La inspiracion permitida es general: energia arcade, tactilidad, feedback visual y cartas expresivas.

## Prioridad

El frontend importa tanto como la logica: debe ser claro, responsive, bonito y usable en movil y desktop.

## Convenciones

- TypeScript estricto.
- Motor de juego puro en `src/lib/game`.
- Supabase solo desde helpers en `src/lib/supabase`.
- Las rutas API validan toda mutacion de estado.
- Tests de reglas con Vitest.
- No subir secretos.

## Comandos

```bash
npm run test
npm run lint
npm run build
```

## Archivos Importantes

- `reglas.md`: reglas originales.
- `PLAN.md`: plan de implementacion.
- `design.md`: direccion visual.
- `supabase/schema.sql`: migracion inicial.
- `src/lib/game`: motor puro.
- `src/app/api`: endpoints internos.
