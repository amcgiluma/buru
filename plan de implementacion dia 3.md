# Carta Unica Y Rotacion De Rondas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir la mano de 1 carta para que el jugador no vea su propia carta pero si las de los rivales, y arreglar la rotacion del primer apostador/jugador entre manos.

**Architecture:** Mantener el motor como fuente de verdad: la privacidad de cartas se resuelve en `hidePrivateState`, el orden entre manos se corrige en `startNextHand`, y React solo renderiza el estado publico recibido. La UI anade una vista visual para la ronda de carta unica y permite jugar una carta propia aunque venga marcada como oculta.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest + Testing Library.

---

## Contexto Confirmado

- `reglas.md` ya define: en mano de 1 carta no puedes ver tu carta, solo las de los demas.
- `src/lib/game/engine.test.ts` contiene dos tests antiguos que ahora contradicen esa regla: esperan que el propietario vea su carta en mano de 1 carta.
- `src/lib/game/engine.ts` usa `hidePrivateState` para ocultar manos por jugador. Es el sitio correcto para invertir la visibilidad en manos de 1 carta.
- `src/components/room/room-client.tsx` solo renderiza `myHand` en los paneles de apostar/jugar. Para la mano de 1 carta necesita una zona adicional con cartas rivales visibles y nombre debajo.
- `startNextHand` calcula el siguiente repartidor con `activePlayers[(handIndex + state.dealerSeat) % activePlayers.length]`. Esto rota mal despues de mas de una mano porque mezcla indice de mano con el asiento anterior acumulado.
- El orden dentro de una baza ya se apoya en `getNextPlayerId` y `getTurnOrder`; no hay que tocarlo salvo que los tests demuestren lo contrario.

## Decisiones De Diseno

- La regla de carta unica aplica durante `bidding` y `playing` cuando `state.handSize === 1`.
- En carta unica:
  - mi propia mano llega como carta oculta, con `id` preservado para poder jugarla;
  - las manos de otros jugadores llegan con carta visible;
  - la UI ensena las cartas rivales en una fila visual con el nombre debajo;
  - mi carta aparece como reverso/oculta y sigue siendo jugable cuando es mi turno.
- La rotacion de inicio de mano debe avanzar exactamente un jugador activo desde el repartidor/lider anterior: con 3 jugadores seria `p1 -> p2 -> p3 -> p1`.
- Si el repartidor anterior fue eliminado, se elegira el siguiente jugador activo por asiento; si no se puede resolver, se usara el primer activo como fallback.

## Archivos

- Modify: `src/lib/game/engine.ts`
  - Ajustar `hidePrivateState`.
  - Ajustar `startNextHand`.
  - Anadir helper pequeno para siguiente jugador activo por asiento si ayuda a mantener legible el codigo.
- Modify: `src/lib/game/engine.test.ts`
  - Reemplazar expectativas antiguas de carta unica.
  - Anadir test de rotacion `p1 -> p2 -> p3 -> p1`.
- Modify: `src/components/room/room-client.tsx`
  - Renderizar zona de cartas rivales visibles en mano de 1 carta.
  - Permitir jugar mi carta oculta cuando sea mi turno.
  - Mantener responsive y sin textos largos.
- Modify: `src/components/room/card-view.tsx`
  - Anadir `ariaLabel?: string` si hace falta para nombrar la carta oculta jugable de forma accesible.
- Modify: `src/components/room/room-client.test.tsx`
  - Cubrir la nueva UI de carta unica.
  - Cubrir que se puede enviar `play_card` con una carta oculta propia.

---

### Task 1: Tests De Privacidad En Mano De 1 Carta

**Files:**
- Modify: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Cambiar el test de bidding de carta unica para que falle con el comportamiento actual**

Actualizar el test `shows the owner cards while bidding, including one-card rounds` para que exija la regla correcta:

```ts
it("hides the viewer card and reveals opponent cards while bidding a one-card hand", () => {
  const state = createInitialGameState(players, {
    deckType: "spanish",
    lifeMode: "normal",
    tieRule: "diego",
    initialLives: 4,
    minPlayers: 3,
    maxPlayers: 6,
  });
  const oneCardState = {
    ...state,
    handSize: 1,
    phase: "bidding" as const,
    hands: {
      p1: [card("spanish", "oros", "1")],
      p2: [card("spanish", "copas", "2")],
      p3: [card("spanish", "espadas", "3")],
    },
  };

  const publicForP1 = hidePrivateState(oneCardState, "p1");

  expect(publicForP1.hands.p1[0]).toEqual({ id: "spanish-oros-1", hidden: true });
  expect(publicForP1.hands.p2[0].rank).toBe("2");
  expect(publicForP1.hands.p3[0].rank).toBe("3");
});
```

- [ ] **Step 2: Cambiar el test de playing de carta unica para que falle con el comportamiento actual**

Reemplazar `shows the owner card during one-card play` por:

```ts
it("hides the viewer card and reveals opponent cards while playing a one-card hand", () => {
  const state = createInitialGameState(players, {
    deckType: "spanish",
    lifeMode: "normal",
    tieRule: "diego",
    initialLives: 4,
    minPlayers: 3,
    maxPlayers: 6,
  });
  const oneCardState = {
    ...state,
    handSize: 1,
    phase: "playing" as const,
    hands: {
      p1: [card("spanish", "oros", "1")],
      p2: [card("spanish", "copas", "2")],
      p3: [card("spanish", "espadas", "3")],
    },
  };

  const publicForP1 = hidePrivateState(oneCardState, "p1");

  expect(publicForP1.hands.p1[0]).toEqual({ id: "spanish-oros-1", hidden: true });
  expect(publicForP1.hands.p2[0].rank).toBe("2");
  expect(publicForP1.hands.p3[0].rank).toBe("3");
});
```

- [ ] **Step 3: Ejecutar los tests y confirmar fallo rojo**

Run: `npm test -- src/lib/game/engine.test.ts`

Expected: FAIL en los tests de carta unica porque `hidePrivateState` todavia ensena la carta propia y oculta las rivales.

---

### Task 2: Implementar Privacidad De Carta Unica

**Files:**
- Modify: `src/lib/game/engine.ts`

- [ ] **Step 1: Actualizar `hidePrivateState` con la regla especial**

Implementar una condicion local:

```ts
export function hidePrivateState(state: GameState, viewerPlayerId: string): PublicGameState {
  const isOneCardVisibilityPhase =
    state.handSize === 1 && (state.phase === "bidding" || state.phase === "playing");

  const hands = Object.fromEntries(
    Object.entries(state.hands).map(([playerId, hand]) => [
      playerId,
      hand.map((card) => {
        if (isOneCardVisibilityPhase) {
          if (playerId === viewerPlayerId) return { id: card.id, hidden: true };
          return card;
        }

        if (playerId !== viewerPlayerId) {
          return { id: card.id, hidden: true };
        }
        return card;
      }),
    ]),
  );

  return {
    ...state,
    hands,
  };
}
```

- [ ] **Step 2: Ejecutar los tests de motor**

Run: `npm test -- src/lib/game/engine.test.ts`

Expected: PASS para los tests de carta unica y sin regresiones en el resto del motor.

---

### Task 3: Tests De Rotacion Entre Manos

**Files:**
- Modify: `src/lib/game/engine.test.ts`

- [ ] **Step 1: Importar `startNextHand`**

Actualizar el import del motor:

```ts
import {
  buildDeck,
  continueTrick,
  createInitialGameState,
  dealHand,
  getBuruStatus,
  getNextHandSize,
  hidePrivateState,
  playCard,
  resolveHand,
  resolveTrick,
  startNextHand,
  validateBid,
} from "./engine";
```

- [ ] **Step 2: Anadir test rojo de rotacion**

```ts
it("rotates the next hand starter one active player at a time", () => {
  const initial = createInitialGameState(players, {
    deckType: "spanish",
    lifeMode: "normal",
    tieRule: "diego",
    initialLives: 4,
    minPlayers: 3,
    maxPlayers: 6,
  });

  const secondHand = startNextHand({ ...initial, phase: "hand_result" as const }, "hand-2");
  const thirdHand = startNextHand({ ...secondHand, phase: "hand_result" as const }, "hand-3");
  const fourthHand = startNextHand({ ...thirdHand, phase: "hand_result" as const }, "hand-4");

  expect(initial.currentTurnPlayerId).toBe("p1");
  expect(secondHand.currentTurnPlayerId).toBe("p2");
  expect(thirdHand.currentTurnPlayerId).toBe("p3");
  expect(fourthHand.currentTurnPlayerId).toBe("p1");
});
```

- [ ] **Step 3: Ejecutar los tests y confirmar fallo rojo**

Run: `npm test -- src/lib/game/engine.test.ts`

Expected: FAIL porque la tercera mano vuelve a `p1` con la formula actual.

---

### Task 4: Implementar Rotacion Correcta De Repartidor/Lider

**Files:**
- Modify: `src/lib/game/engine.ts`

- [ ] **Step 1: Cambiar el calculo de dealer en `startNextHand`**

Sustituir:

```ts
const dealer = activePlayers[(handIndex + state.dealerSeat) % activePlayers.length] ?? activePlayers[0];
```

por:

```ts
const previousDealerIndex = activePlayers.findIndex((player) => player.seat === state.dealerSeat);
const dealerIndex = previousDealerIndex === -1 ? 0 : (previousDealerIndex + 1) % activePlayers.length;
const dealer = activePlayers[dealerIndex] ?? activePlayers[0];
```

- [ ] **Step 2: Ejecutar los tests de motor**

Run: `npm test -- src/lib/game/engine.test.ts`

Expected: PASS, incluyendo la rotacion `p1 -> p2 -> p3 -> p1`.

---

### Task 5: Tests De UI Para Carta Unica

**Files:**
- Modify: `src/components/room/room-client.test.tsx`

- [ ] **Step 1: Crear snapshot de mano de 1 carta en bidding**

Anadir helper:

```ts
function oneCardBiddingSnapshot(): PublicRoomSnapshot {
  const players = [
    player("p1", "Ana", 0, true),
    player("p2", "Beto", 1, false),
    player("p3", "Cris", 2, false),
  ];
  const gameState: PublicGameState = {
    phase: "bidding",
    settings: {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    },
    players,
    dealerSeat: 1,
    leaderPlayerId: "p2",
    currentTurnPlayerId: "p1",
    handIndex: 4,
    handSize: 1,
    deck: [],
    hands: {
      p1: [{ id: "spanish-oros-12", hidden: true }],
      p2: [card("copas", "7", 6)],
      p3: [card("espadas", "3", 2)],
    },
    bids: {},
    tricksWon: { p1: 0, p2: 0, p3: 0 },
    currentTrick: [],
    completedTricks: [],
    losses: {},
  };

  return {
    room: {
      id: "room-1",
      code: "ABCDE",
      status: "bidding",
      settings: gameState.settings,
      gameState,
      version: 9,
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    },
    players,
  };
}
```

- [ ] **Step 2: Anadir test rojo de cartas rivales visibles**

```ts
it("shows opponents cards but keeps the viewer card hidden in a one-card bidding hand", () => {
  render(<GameTable snapshot={oneCardBiddingSnapshot()} playerId="p1" onAction={vi.fn()} />);

  expect(screen.getByText("Carta unica")).toBeInTheDocument();
  expect(screen.getByText("Tu carta esta oculta")).toBeInTheDocument();
  expect(screen.getByLabelText("7 copas")).toBeInTheDocument();
  expect(screen.getByLabelText("3 espadas")).toBeInTheDocument();
  expect(screen.getByText("Beto")).toBeInTheDocument();
  expect(screen.getByText("Cris")).toBeInTheDocument();
  expect(screen.queryByLabelText("12 oros")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Crear snapshot de mano de 1 carta en playing**

Anadir helper completo:

```ts
function oneCardPlayingSnapshot(): PublicRoomSnapshot {
  const players = [
    player("p1", "Ana", 0, true),
    player("p2", "Beto", 1, false),
    player("p3", "Cris", 2, false),
  ];
  const gameState: PublicGameState = {
    phase: "playing",
    settings: {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    },
    players,
    dealerSeat: 1,
    leaderPlayerId: "p2",
    currentTurnPlayerId: "p1",
    handIndex: 4,
    handSize: 1,
    deck: [],
    hands: {
      p1: [{ id: "spanish-oros-12", hidden: true }],
      p2: [card("copas", "7", 6)],
      p3: [card("espadas", "3", 2)],
    },
    bids: { p1: 0, p2: 1, p3: 0 },
    tricksWon: { p1: 0, p2: 0, p3: 0 },
    currentTrick: [],
    completedTricks: [],
    losses: {},
  };

  return {
    room: {
      id: "room-1",
      code: "ABCDE",
      status: "playing",
      settings: gameState.settings,
      gameState,
      version: 10,
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    },
    players,
  };
}
```

- [ ] **Step 4: Anadir test rojo de jugar carta oculta**

```ts
it("lets the viewer play their hidden card during a one-card playing hand", () => {
  const onAction = vi.fn();
  render(<GameTable snapshot={oneCardPlayingSnapshot()} playerId="p1" onAction={onAction} />);

  fireEvent.click(screen.getByRole("button", { name: "Jugar carta oculta" }));

  expect(onAction).toHaveBeenCalledWith({ type: "play_card", cardId: "spanish-oros-12" }, "card");
});
```

- [ ] **Step 5: Ejecutar tests y confirmar fallo rojo**

Run: `npm test -- src/components/room/room-client.test.tsx`

Expected: FAIL porque la UI aun no renderiza zona especial ni permite jugar carta oculta.

---

### Task 6: Implementar UI De Carta Unica

**Files:**
- Modify: `src/components/room/room-client.tsx`
- Modify: `src/components/room/card-view.tsx`

- [ ] **Step 1: Derivar datos de carta unica en `GameTable`**

Anadir junto a los derivados existentes:

```ts
const isOneCardHand = state.handSize === 1 && (phase === "bidding" || phase === "playing");
const visibleOpponentCards = isOneCardHand
  ? snapshot.players
      .filter((player) => player.id !== playerId)
      .map((player) => ({ player, card: state.hands?.[player.id]?.[0] }))
      .filter(
        (entry): entry is { player: PlayerRecord; card: PublicGameState["hands"][string][number] } =>
          Boolean(entry.card && !entry.card.hidden),
      )
  : [];
const myHiddenOneCard = isOneCardHand ? myHand[0] : undefined;
```

- [ ] **Step 2: Crear bloque visual reutilizable dentro del mismo archivo**

Anadir componente local antes de `getForbiddenBid`:

```tsx
function OneCardVisibilityPanel({
  opponents,
  myCard,
}: {
  opponents: { player: PlayerRecord; card: PublicGameState["hands"][string][number] }[];
  myCard?: PublicGameState["hands"][string][number];
}) {
  return (
    <div className="rounded-[8px] border-2 border-ink bg-petrol/85 p-3 text-bone shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-black uppercase text-signal">Carta unica</p>
        {myCard?.hidden ? (
          <span className="rounded-[4px] border-2 border-ink bg-ember px-2 py-1 text-xs font-black text-bone">
            Tu carta esta oculta
          </span>
        ) : null}
      </div>
      <div className="flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
        {opponents.map(({ player, card }) => (
          <div key={player.id} className="grid min-w-24 justify-items-center gap-1">
            <CardView card={card} compact />
            <span className="max-w-24 truncate rounded-[4px] bg-ink px-2 py-1 text-xs font-bold text-bone">
              {player.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Renderizar la zona especial en bidding y playing**

Dentro del panel de `bidding`, antes de la mano propia:

```tsx
{isOneCardHand ? (
  <OneCardVisibilityPanel opponents={visibleOpponentCards} myCard={myHiddenOneCard} />
) : null}
```

Dentro del panel de `playing`, antes de la mano propia:

```tsx
{isOneCardHand ? (
  <OneCardVisibilityPanel opponents={visibleOpponentCards} myCard={myHiddenOneCard} />
) : null}
```

- [ ] **Step 4: Hacer jugable la carta oculta propia en mano de 1 carta**

En el render de `myHand.map` del panel `playing`, calcular:

```tsx
const canPlayCard = isMyTurn && (!card.hidden || isOneCardHand);
const playLabel = card.hidden && isOneCardHand ? "Jugar carta oculta" : undefined;
```

Usar esos valores:

```tsx
<CardView
  key={card.id}
  card={card}
  playable={canPlayCard}
  onClick={canPlayCard ? () => onAction({ type: "play_card", cardId: card.id }, "card") : undefined}
  ariaLabel={playLabel}
/>
```

Si `CardView` no acepta `ariaLabel`, anadir esa prop en `src/components/room/card-view.tsx`:

```tsx
type Props = {
  card: HiddenCard;
  playable?: boolean;
  selected?: boolean;
  winner?: boolean;
  compact?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};
```

y usar:

```tsx
aria-label={ariaLabel ?? (card.hidden ? "Carta oculta" : `${card.rank} ${card.suit}`)}
```

- [ ] **Step 5: Ejecutar tests de UI**

Run: `npm test -- src/components/room/room-client.test.tsx src/components/room/card-view.test.tsx`

Expected: PASS.

---

### Task 7: Verificacion Completa

**Files:**
- No code changes.

- [ ] **Step 1: Ejecutar suite completa**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Ejecutar lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Ejecutar build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Probar en navegador o por servidor local**

Run: `npx next dev -H 127.0.0.1 -p 3000`

Manual check:

- Crear o entrar a sala funciona.
- En mano normal, el jugador ve sus cartas y no ve las rivales.
- En mano de 1 carta, el jugador ve cartas rivales con nombres debajo y su propia carta queda oculta.
- En mano de 1 carta, cuando sea su turno puede jugar su carta oculta.
- Al pasar de una mano a la siguiente, el primer jugador de apuestas rota de uno en uno: con 3 jugadores `p1 -> p2 -> p3 -> p1`.
- Mesa responsive: la fila de cartas rivales tiene scroll horizontal y no rompe movil.

## Riesgos

- Si `CardView` no acepta un `aria-label` personalizado, el test de jugar carta oculta sera dificil de escribir de forma accesible. La solucion prevista es anadir `ariaLabel` como prop pequena y reutilizable.
- En una mano de 1 carta, mostrar cartas rivales puede hacer crecer el panel en movil. La mitigacion es usar scroll horizontal y cartas `compact`.
- La rotacion con jugadores eliminados debe mantenerse simple: avanzar desde el asiento anterior al siguiente activo. Si el usuario quiere una regla distinta para eliminados, se tratara como cambio separado.

## Criterio De Aprobacion

- La regla especial coincide con `reglas.md`: no veo mi carta de 1 carta, si veo las de los demas.
- Se puede jugar la carta propia aunque este oculta.
- La rotacion de comienzo de mano no salta jugadores despues de varias rondas.
- `npm test`, `npm run lint` y `npm run build` pasan.
