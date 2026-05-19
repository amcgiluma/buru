"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Crown, Loader2, Play, RotateCcw, Swords } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getBuruStatus } from "@/lib/game/engine";
import type { GameState, HiddenCard } from "@/lib/game/types";
import type { PlayerRecord, RoomSnapshot } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";
import { CardView } from "./card-view";

type Props = {
  code: string;
};

type PublicGameState = Omit<GameState, "hands"> & {
  hands: Record<string, HiddenCard[]>;
};

export function RoomClient({ code }: Props) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerToken, setPlayerToken] = useState<string>("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const id = localStorage.getItem(`buru:${code}:playerId`) ?? "";
    const token = localStorage.getItem(`buru:${code}:playerToken`) ?? "";
    setPlayerId(id);
    setPlayerToken(token);
    const params = id && token ? `?playerId=${id}&playerToken=${encodeURIComponent(token)}` : "";
    const response = await fetch(`/api/rooms/${code}${params}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSnapshot(data);
  }, [code]);

  useEffect(() => {
    setJoinName(localStorage.getItem("buru:name") ?? "");
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la sala."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!snapshot?.room.id) return;
    const supabase = createBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`room-${snapshot.room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${snapshot.room.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_events", filter: `room_id=eq.${snapshot.room.id}` }, () => load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, snapshot?.room.id]);

  async function joinRoom() {
    await api(`/api/rooms/${code}/join`, { name: joinName }, (data) => {
      if (!data.player) {
        setError("La respuesta no incluyo jugador.");
        return;
      }
      localStorage.setItem(`buru:${code}:playerId`, data.player.id);
      localStorage.setItem(`buru:${code}:playerToken`, data.playerToken ?? "");
      localStorage.setItem("buru:name", joinName);
      setPlayerId(data.player.id);
      setPlayerToken(data.playerToken ?? "");
      setSnapshot(data);
    });
  }

  async function patchSettings(settings: Record<string, unknown>) {
    await api(`/api/rooms/${code}/settings`, { playerId, playerToken, settings }, setSnapshot, "PATCH");
  }

  async function startGame() {
    await api(`/api/rooms/${code}/start`, { playerId, playerToken }, setSnapshot);
  }

  async function action(body: Record<string, unknown>) {
    if (!snapshot) return;
    await api(`/api/rooms/${code}/action`, { playerId, playerToken, version: snapshot.room.version, ...body }, setSnapshot);
  }

  async function api(
    path: string,
    body: unknown,
    onSuccess: (data: RoomSnapshot & { player?: PlayerRecord; playerToken?: string }) => void,
    method = "POST",
  ) {
    setError("");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Operacion rechazada.");
      return;
    }
    onSuccess(data);
  }

  const me = snapshot?.players.find((player) => player.id === playerId);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-gold" size={42} />
      </main>
    );
  }

  if (!snapshot) {
    return <Shell code={code} error={error} />;
  }

  return (
    <Shell code={code} error={error}>
      {!me ? (
        <JoinPanel name={joinName} setName={setJoinName} onJoin={joinRoom} />
      ) : snapshot.room.status === "lobby" ? (
        <Lobby snapshot={snapshot} playerId={playerId} onSettings={patchSettings} onStart={startGame} />
      ) : (
        <GameTable snapshot={snapshot} playerId={playerId} onAction={action} />
      )}
    </Shell>
  );
}

function Shell({ code, error, children }: { code: string; error?: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col gap-3 rounded-[8px] border-2 border-ink bg-petrol/90 p-3 shadow-pixel sm:min-h-[calc(100vh-2.5rem)] sm:p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs font-black uppercase text-signal">Sala</p>
            <h1 className="font-display text-3xl font-black text-bone">{code}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-bone px-3 font-display font-black text-ink shadow-card"
          >
            <Copy size={18} />
            Copiar
          </button>
        </header>
        {error ? <p className="rounded-[6px] border-2 border-ember bg-ember/25 p-3 text-sm text-bone">{error}</p> : null}
        {children}
      </div>
    </main>
  );
}

function JoinPanel({ name, setName, onJoin }: { name: string; setName: (name: string) => void; onJoin: () => void }) {
  return (
    <section className="mx-auto mt-8 w-full max-w-md rounded-[8px] border-2 border-ink bg-bone p-4 text-ink shadow-card">
      <label className="text-xs font-black uppercase text-ember">Nombre</label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 h-12 w-full rounded-[6px] border-2 border-ink px-3 font-display text-lg font-black outline-none"
      />
      <button
        onClick={onJoin}
        disabled={!name.trim()}
        className="mt-4 h-12 w-full rounded-[6px] border-2 border-ink bg-mint font-display font-black shadow-card disabled:opacity-50"
      >
        Entrar
      </button>
    </section>
  );
}

function Lobby({
  snapshot,
  playerId,
  onSettings,
  onStart,
}: {
  snapshot: RoomSnapshot;
  playerId: string;
  onSettings: (settings: Record<string, unknown>) => void;
  onStart: () => void;
}) {
  const me = snapshot.players.find((player) => player.id === playerId);
  const isHost = Boolean(me?.isHost);
  const settings = snapshot.room.settings;

  return (
    <section className="grid flex-1 gap-3 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[8px] border-2 border-ink bg-felt p-3 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.players.map((player) => (
            <div key={player.id} className="rounded-[6px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-display text-lg font-black">{player.name}</p>
                {player.isHost ? <Crown className="shrink-0 text-gold" size={20} /> : null}
              </div>
              <p className="mt-1 text-xs font-bold uppercase text-ink/60">Seat {player.seat + 1}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[8px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
        <div className="grid gap-3">
          <SelectSetting
            label="Baraja"
            value={settings.deckType}
            disabled={!isHost}
            options={[
              ["spanish", "Espanola"],
              ["french", "Francesa"],
            ]}
            onChange={(deckType) => onSettings({ deckType })}
          />
          <SelectSetting
            label="Vidas"
            value={settings.lifeMode}
            disabled={!isHost}
            options={[
              ["normal", "Normal"],
              ["extreme", "Extremo"],
            ]}
            onChange={(lifeMode) => onSettings({ lifeMode })}
          />
          <SelectSetting
            label="Empate"
            value={settings.tieRule}
            disabled={!isHost}
            options={[
              ["diego", "Diego"],
              ["lete", "Lete"],
            ]}
            onChange={(tieRule) => onSettings({ tieRule })}
          />
          <button
            onClick={onStart}
            disabled={!isHost || snapshot.players.length < settings.minPlayers}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-[6px] border-2 border-ink bg-mint font-display font-black shadow-card disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={19} />
            Empezar
          </button>
        </div>
      </aside>
    </section>
  );
}

function SelectSetting({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black uppercase text-ember">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-[6px] border-2 border-ink bg-white px-2 font-display font-black disabled:opacity-55"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GameTable({
  snapshot,
  playerId,
  onAction,
}: {
  snapshot: RoomSnapshot;
  playerId: string;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const state = snapshot.room.gameState as unknown as PublicGameState;
  const myHand = state.hands?.[playerId] ?? [];
  const isMyTurn = state.currentTurnPlayerId === playerId;
  const phase = state.phase;
  const currentPlayer = snapshot.players.find((player) => player.id === state.currentTurnPlayerId);
  const winner = state.winnerId ? snapshot.players.find((player) => player.id === state.winnerId) : null;

  const bidOptions = useMemo(() => Array.from({ length: state.handSize + 1 }, (_, value) => value), [state.handSize]);

  return (
    <section className="flex flex-1">
      <div className="flex min-h-[620px] w-full flex-col gap-3 rounded-[8px] border-2 border-ink bg-felt p-3 shadow-card">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {snapshot.players.map((player) => (
            <PlayerBadge key={player.id} player={player} state={state} active={state.currentTurnPlayerId === player.id} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-xs font-black uppercase text-signal">Mano {state.handIndex + 1}</p>
            <h2 className="font-display text-2xl font-black text-bone">{state.handSize} cartas</h2>
          </div>
          <div className="rounded-[6px] border-2 border-ink bg-bone px-3 py-2 text-ink shadow-card">
            {winner ? (
              <p className="font-display font-black">Gana {winner.name}</p>
            ) : (
              <p className="font-display font-black">
                {phase === "bidding" ? `${currentPlayer?.name ?? "Turno"} elige bazas` : `${currentPlayer?.name ?? "Turno"} juega`}
              </p>
            )}
          </div>
        </div>

        <div className="grid min-h-64 flex-1 place-items-center rounded-[8px] border-2 border-ink bg-petrol/75 p-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {state.currentTrick.length === 0 ? (
              <Swords className="text-bone/50" size={54} />
            ) : (
              state.currentTrick.map((played) => (
                <div key={`${played.playerId}-${played.card.id}`} className="grid justify-items-center gap-1">
                  <CardView card={played.card} winner={state.leaderPlayerId === played.playerId && phase !== "playing"} />
                  <span className="max-w-24 truncate rounded-[4px] bg-ink px-2 py-1 text-xs font-bold text-bone">
                    {snapshot.players.find((player) => player.id === played.playerId)?.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {phase === "hand_result" || phase === "game_over" ? (
          <ResultPanel state={state} players={snapshot.players} onNext={() => onAction({ type: "next_hand" })} />
        ) : phase === "bidding" ? (
          <div className="rounded-[8px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
            <p className="mb-2 font-display font-black">
              {isMyTurn ? "Cuantas bazas crees que ganaras?" : "Esperando bazas"}
            </p>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
              {myHand.map((card) => (
                <CardView key={card.id} card={card} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {bidOptions.map((bid) => (
                <button
                  key={bid}
                  disabled={!isMyTurn}
                  onClick={() => onAction({ type: "place_bid", bid })}
                  className="h-11 min-w-11 rounded-[6px] border-2 border-ink bg-gold px-3 font-display font-black shadow-card disabled:opacity-45"
                >
                  {bid}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
            <p className="mb-2 font-display font-black">{isMyTurn ? "Tu carta" : "Esperando turno"}</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {myHand.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  playable={isMyTurn && !card.hidden}
                  onClick={isMyTurn && !card.hidden ? () => onAction({ type: "play_card", cardId: card.id }) : undefined}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

function PlayerBadge({
  player,
  state,
  active,
}: {
  player: PlayerRecord;
  state: PublicGameState;
  active: boolean;
}) {
  const buruStatus = getBuruStatus(player.lives);
  const bid = state.bids?.[player.id];
  const tricksWon = state.tricksWon?.[player.id] ?? 0;

  return (
    <div
      className={cn(
        "min-w-0 rounded-[6px] border-2 border-ink p-2 shadow-card",
        active ? "bg-gold text-ink" : player.status === "eliminated" ? "bg-ink/20 text-ink/45" : "bg-white text-ink",
        player.status === "disconnected" && "bg-slate-200 text-ink/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-display font-black">{player.name}</p>
        {buruStatus ? (
          <span className="rounded-[4px] border-2 border-ink bg-ember px-2 py-0.5 font-display text-xs font-black text-bone">
            {buruStatus}
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid gap-1 text-xs font-black uppercase">
        <span>Bazas: {bid ?? "-"}</span>
        <span>Ganadas: {tricksWon}</span>
      </div>
      {player.status === "disconnected" ? <p className="mt-1 text-xs font-black uppercase">desconectado</p> : null}
    </div>
  );
}

function ResultPanel({
  state,
  players,
  onNext,
}: {
  state: PublicGameState;
  players: PlayerRecord[];
  onNext: () => void;
}) {
  const winner = state.winnerId ? players.find((player) => player.id === state.winnerId) : null;

  return (
    <div className="rounded-[8px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl font-black">{winner ? `${winner.name} gana BURU` : "Resultado"}</p>
        {winner ? (
          <Link
            href="/"
            className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-gold px-3 font-display font-black shadow-card"
          >
            Nueva sala
          </Link>
        ) : (
          <button
            onClick={onNext}
            className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-mint px-3 font-display font-black shadow-card"
          >
            <RotateCcw size={18} />
            Siguiente
          </button>
        )}
      </div>
      {winner ? (
        <p className="mt-2 text-sm font-bold">
          Eliminados:{" "}
          {players
            .filter((player) => player.status === "eliminated")
            .map((player) => player.name)
            .join(", ") || "nadie"}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {players.map((player) => (
          <div key={player.id} className="rounded-[6px] border-2 border-ink bg-white p-2">
            <p className="truncate font-display font-black">{player.name}</p>
            <p className="text-sm">
              Bazas: {state.bids[player.id] ?? "-"} / Ganadas: {state.tricksWon[player.id] ?? 0}
            </p>
            <p className="text-sm font-black text-ember">{getBuruStatus(player.lives) || "Sin letras"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
