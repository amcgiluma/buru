"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Press_Start_2P } from "next/font/google";
import { DoorOpen, Plus, Sparkles } from "lucide-react";
import { playUiSound } from "@/lib/sound/ui-sounds";

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    playUiSound("confirm");
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
      playUiSound("error");
      setError(err instanceof Error ? err.message : "No se pudo crear la sala.");
    } finally {
      setLoading(null);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    playUiSound("confirm");
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
      playUiSound("error");
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="grid min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl content-center gap-6 rounded-[8px] border-2 border-ink bg-petrol/92 p-4 shadow-pixel sm:p-6">
        <div className="mx-auto grid w-full max-w-4xl justify-items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-[6px] border-2 border-ink bg-gold text-ink shadow-card sm:h-16 sm:w-16">
            <Sparkles size={30} />
          </div>
          <h1 className={`${pixelFont.className} pixel-title text-4xl text-bone sm:text-5xl md:text-6xl`}>BURU</h1>
          <p className="max-w-xl text-sm font-semibold text-bone/78 sm:text-base">
            Aplasta a tus enemigos, no tengas piedad
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-2">
          <form onSubmit={create} className="rounded-[8px] border-2 border-ink bg-felt p-4 shadow-card sm:p-5">
            <label className="text-xs font-black uppercase text-signal">Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              className="mt-2 h-12 w-full rounded-[6px] border-2 border-ink bg-bone px-3 font-display text-lg font-black text-ink outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-gold/45"
              placeholder="Tu nombre"
            />
            <button
              disabled={!name.trim() || loading !== null}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-ink bg-mint font-display font-black text-ink shadow-card transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-signal"
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
              className="mt-2 h-12 w-full rounded-[6px] border-2 border-ink bg-white px-3 text-center font-display text-2xl font-black uppercase tracking-[0.18em] outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-ember/30"
              placeholder="ABCDE"
            />
            <button
              disabled={!name.trim() || code.trim().length < 5 || loading !== null}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-ink bg-gold font-display font-black text-ink shadow-card transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              <DoorOpen size={20} />
              {loading === "join" ? "Entrando..." : "Unirse"}
            </button>
          </form>
        </div>

        {error ? (
          <p className="mx-auto w-full max-w-4xl rounded-[6px] border-2 border-ember bg-ember/25 p-3 text-sm text-bone">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
