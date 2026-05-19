"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Plus, Sparkles } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("create");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem(`buru:${data.room.code}:playerId`, data.player.id);
      localStorage.setItem(`buru:${data.room.code}:playerToken`, data.playerToken);
      localStorage.setItem("buru:name", name);
      router.push(`/rooms/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sala.");
    } finally {
      setLoading(null);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading("join");
    try {
      const cleanCode = code.trim().toUpperCase();
      const response = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem(`buru:${data.room.code}:playerId`, data.player.id);
      localStorage.setItem(`buru:${data.room.code}:playerToken`, data.playerToken);
      localStorage.setItem("buru:name", name);
      router.push(`/rooms/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col justify-between gap-6 rounded-[8px] border-2 border-ink bg-petrol/88 p-4 shadow-pixel sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black tracking-normal text-bone sm:text-6xl">BURU</h1>
            <p className="mt-1 max-w-xl text-sm text-bone/74 sm:text-base">
              Salas privadas, apuestas tensas y cartas con mala memoria.
            </p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-[6px] border-2 border-ink bg-gold text-ink shadow-card">
            <Sparkles size={30} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={create} className="rounded-[8px] border-2 border-ink bg-felt p-4 shadow-card sm:p-5">
            <label className="text-xs font-black uppercase text-signal">Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              className="mt-2 h-12 w-full rounded-[6px] border-2 border-ink bg-bone px-3 font-display text-lg font-black text-ink outline-none focus:ring-4 focus:ring-gold/45"
              placeholder="Tu nombre"
            />
            <button
              disabled={!name.trim() || loading !== null}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-ink bg-mint font-display font-black text-ink shadow-card disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={20} />
              {loading === "create" ? "Creando..." : "Crear sala"}
            </button>
          </form>

          <form onSubmit={join} className="rounded-[8px] border-2 border-ink bg-bone p-4 text-ink shadow-card sm:p-5">
            <label className="text-xs font-black uppercase text-ember">Codigo</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={5}
              className="mt-2 h-12 w-full rounded-[6px] border-2 border-ink bg-white px-3 text-center font-display text-2xl font-black uppercase tracking-[0.18em] outline-none focus:ring-4 focus:ring-ember/30"
              placeholder="ABCDE"
            />
            <button
              disabled={!name.trim() || code.trim().length < 5 || loading !== null}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-ink bg-gold font-display font-black text-ink shadow-card disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DoorOpen size={20} />
              {loading === "join" ? "Entrando..." : "Unirse"}
            </button>
          </form>
        </div>

        {error ? <p className="rounded-[6px] border-2 border-ember bg-ember/25 p-3 text-sm text-bone">{error}</p> : null}
      </section>
    </main>
  );
}
