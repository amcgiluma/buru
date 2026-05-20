"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";
import { SuitMark, isRedSuit } from "@/components/cards/suit-mark";
import { playUiSound } from "@/lib/sound/ui-sounds";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

type MiniCard = {
  rank: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
};

type TutorialLifeMode = "normal" | "extreme";

const scenes = ["Objetivo", "Apuesta", "Baza", "Manos", "Empates", "Resultado"];
const handPattern = [5, 4, 3, 2, 1, 2, 3, 4, 5];

export function GameRulesTutorial({ open, onClose }: Props) {
  const [scene, setScene] = useState(0);
  const [bid, setBid] = useState(2);
  const [handStep, setHandStep] = useState(0);
  const [tieRule, setTieRule] = useState<"diego" | "lete">("diego");
  const [won, setWon] = useState(2);
  const [lifeMode, setLifeMode] = useState<TutorialLifeMode>("extreme");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        playUiSound("confirm");
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const body = useMemo(() => {
    if (scene === 0) return <GoalScene lifeMode={lifeMode} onLifeMode={setLifeMode} />;
    if (scene === 1) return <BidScene bid={bid} onBid={setBid} />;
    if (scene === 2) return <TrickScene />;
    if (scene === 3) return <HandPatternScene step={handStep} onStep={setHandStep} />;
    if (scene === 4) return <TieScene rule={tieRule} onRule={setTieRule} />;
    return <ResultScene won={won} onWon={setWon} lifeMode={lifeMode} onLifeMode={setLifeMode} />;
  }, [bid, handStep, lifeMode, scene, tieRule, won]);

  if (!open) return null;

  function go(nextScene: number) {
    setScene(Math.max(0, Math.min(scenes.length - 1, nextScene)));
    playUiSound("tap");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/78 px-3 py-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          playUiSound("confirm");
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial visual de BURU"
        className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-[8px] border-2 border-ink bg-petrol text-bone shadow-pixel"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-bone p-3 text-ink">
          <div>
            <p className="font-display text-xs font-black uppercase text-ember">Baraja francesa</p>
            <h2 className="font-display text-xl font-black">Tutorial visual de BURU</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar tutorial"
            onClick={() => {
              playUiSound("confirm");
              onClose();
            }}
            className="grid h-11 w-11 place-items-center rounded-[6px] border-2 border-ink bg-ember text-bone shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {scenes.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => go(index)}
                className={cn(
                  "h-9 rounded-[6px] border-2 border-ink px-2 font-display text-xs font-black shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-signal",
                  index === scene ? "bg-gold text-ink" : "bg-bone text-ink",
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
          {body}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t-2 border-ink bg-bone p-3 text-ink">
          <button
            type="button"
            aria-label="Escena anterior"
            disabled={scene === 0}
            onClick={() => go(scene - 1)}
            className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-white px-3 font-display font-black shadow-card transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          <p className="font-display text-xs font-black uppercase">
            {scene + 1}/{scenes.length} - {scenes[scene]}
          </p>
          {scene === scenes.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                playUiSound("confirm");
                onClose();
              }}
              className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-mint px-3 font-display font-black shadow-card transition-transform hover:-translate-y-0.5"
            >
              Listo
              <Trophy size={18} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Siguiente escena"
              onClick={() => go(scene + 1)}
              className="flex h-11 items-center gap-2 rounded-[6px] border-2 border-ink bg-gold px-3 font-display font-black shadow-card transition-transform hover:-translate-y-0.5"
            >
              Siguiente
              <ChevronRight size={18} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function GoalScene({ lifeMode, onLifeMode }: { lifeMode: TutorialLifeMode; onLifeMode: (mode: TutorialLifeMode) => void }) {
  return (
    <SceneFrame title="Acierta tus bazas" caption="Predice, juega y conserva vidas. Si fallas, vas juntando BURU.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid min-h-72 place-items-center rounded-[8px] border-2 border-ink bg-felt p-4">
          <div className="flex flex-wrap items-end justify-center gap-4">
            <PlayerStack name="Ana" bid={2} won={2} badge={penaltyBadge(2, 2, lifeMode)} tone="safe" />
            <PlayerStack name="Beto" bid={1} won={3} badge={penaltyBadge(1, 3, lifeMode)} tone="hurt" />
            <PlayerStack name="Cris" bid={0} won={1} badge={penaltyBadge(0, 1, lifeMode)} tone="hurt" />
          </div>
        </div>
        <VisualRule title="Objetivo">
          <LifeModeSwitch lifeMode={lifeMode} onLifeMode={onLifeMode} />
          <MiniFormula left="Dices 2" middle="Ganas 2" result="sigues vivo" good />
          <MiniFormula
            left="Dices 1"
            middle="Ganas 3"
            result={lifeMode === "extreme" ? "pierdes BU" : "pierdes B"}
          />
        </VisualRule>
      </div>
    </SceneFrame>
  );
}

function BidScene({ bid, onBid }: { bid: number; onBid: (bid: number) => void }) {
  const forbidden = 2;

  return (
    <SceneFrame title="Elige tu apuesta" caption="Antes de jugar, cada jugador declara cuantas bazas cree que ganara.">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[8px] border-2 border-ink bg-bone p-3 text-ink shadow-card">
          <div className="mb-3 flex justify-center gap-2">
            <TutorialCard card={{ rank: "A", suit: "hearts" }} />
            <TutorialCard card={{ rank: "10", suit: "diamonds" }} />
            <TutorialCard card={{ rank: "7", suit: "clubs" }} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  playUiSound(option === forbidden ? "error" : "select");
                  onBid(option);
                }}
                className={cn(
                  "h-12 min-w-12 rounded-[6px] border-2 border-ink px-3 font-display font-black shadow-card transition-transform hover:-translate-y-1",
                  option === forbidden ? "bg-ember text-bone ring-4 ring-ember/25" : option === bid ? "bg-mint text-ink" : "bg-gold text-ink",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <VisualRule title="Ultimo jugador">
          <div className="grid gap-2 rounded-[6px] border-2 border-ink bg-white p-3 text-ink">
            <p className="font-display text-lg font-black">La suma no puede quedar en 5</p>
            <div className="flex items-center justify-center gap-2 font-display text-2xl font-black">
              <span className="rounded-[4px] bg-gold px-2">2</span>
              <span>+</span>
              <span className="rounded-[4px] bg-gold px-2">1</span>
              <span>+</span>
              <span className="rounded-[4px] bg-ember px-2 text-bone">2</span>
              <span>=</span>
              <span className="rounded-[4px] bg-ember px-2 text-bone">5</span>
            </div>
            <p className="text-sm font-bold">Si hay 5 cartas, esa opcion queda bloqueada.</p>
          </div>
        </VisualRule>
      </div>
    </SceneFrame>
  );
}

function TrickScene() {
  return (
    <SceneFrame title="Gana la carta mas alta" caption="Cada jugador pone una carta. La mayor se lleva la baza y empieza la siguiente.">
      <div className="grid min-h-80 place-items-center rounded-[8px] border-2 border-ink bg-felt p-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <PlayedCard player="Ana" card={{ rank: "9", suit: "hearts" }} />
          <PlayedCard player="Beto" card={{ rank: "K", suit: "spades" }} winner />
          <PlayedCard player="Cris" card={{ rank: "J", suit: "diamonds" }} />
        </div>
        <p className="mt-4 rounded-[6px] border-2 border-ink bg-gold px-3 py-2 font-display font-black text-ink shadow-card">
          K spades gana la baza
        </p>
      </div>
    </SceneFrame>
  );
}

function HandPatternScene({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const active = handPattern[step];

  return (
    <SceneFrame title="Las manos bajan y luego suben" caption="Cada mano cambia el numero de cartas. Cuando llega a 1, vuelve a subir.">
      <div className="grid gap-4 rounded-[8px] border-2 border-ink bg-bone p-4 text-ink shadow-card">
        <p className="text-center font-display text-sm font-black sm:text-lg">5 -&gt; 4 -&gt; 3 -&gt; 2 -&gt; 1 -&gt; 2 -&gt; 3 -&gt; 4 -&gt; 5</p>
        <div className="flex flex-wrap justify-center gap-2">
          {handPattern.map((count, index) => (
            <button
              key={`${count}-${index}`}
              type="button"
              onClick={() => {
                playUiSound("select");
                onStep(index);
              }}
              className={cn(
                "h-12 min-w-12 rounded-[6px] border-2 border-ink font-display font-black shadow-card transition-transform hover:-translate-y-1",
                index === step ? "bg-mint" : "bg-gold",
              )}
            >
              {count}
            </button>
          ))}
        </div>
        <div className="flex min-h-32 flex-wrap items-center justify-center gap-2 rounded-[8px] border-2 border-ink bg-felt p-3">
          {Array.from({ length: active }, (_, index) => (
            <TutorialCard key={index} card={sampleCards[index]} compact />
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}

function TieScene({ rule, onRule }: { rule: "diego" | "lete"; onRule: (rule: "diego" | "lete") => void }) {
  const winner = rule === "diego" ? "primera" : "segunda";

  return (
    <SceneFrame title="Los empates cambian segun la regla" caption="Misma fuerza, distinto ganador segun el modo elegido en la sala.">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[8px] border-2 border-ink bg-felt p-4">
          <PlayedCard player="Primera" card={{ rank: "Q", suit: "hearts" }} winner={winner === "primera"} />
          <PlayedCard player="Segunda" card={{ rank: "Q", suit: "clubs" }} winner={winner === "segunda"} />
        </div>
        <VisualRule title="Empate">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                playUiSound("select");
                onRule("diego");
              }}
              className={cn("h-11 rounded-[6px] border-2 border-ink px-3 font-display font-black shadow-card", rule === "diego" ? "bg-mint" : "bg-white")}
            >
              Reglas Diego
            </button>
            <button
              type="button"
              onClick={() => {
                playUiSound("select");
                onRule("lete");
              }}
              className={cn("h-11 rounded-[6px] border-2 border-ink px-3 font-display font-black shadow-card", rule === "lete" ? "bg-mint" : "bg-white")}
            >
              Reglas Lete
            </button>
          </div>
          <p className="rounded-[6px] border-2 border-ink bg-gold p-3 font-display font-black text-ink">
            {rule === "diego" ? "Diego: gana la primera carta empatada" : "Lete: gana la segunda carta empatada"}
          </p>
        </VisualRule>
      </div>
    </SceneFrame>
  );
}

function ResultScene({
  won,
  onWon,
  lifeMode,
  onLifeMode,
}: {
  won: number;
  onWon: (won: number) => void;
  lifeMode: TutorialLifeMode;
  onLifeMode: (mode: TutorialLifeMode) => void;
}) {
  const exact = won === 2;
  const loss = penaltyAmount(2, won, lifeMode);

  return (
    <SceneFrame title="Compara lo que dijiste con lo que ganaste" caption="Acertar exacto te salva. Fallar te acerca a BURU.">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[8px] border-2 border-ink bg-bone p-4 text-ink shadow-card">
          <div className="grid gap-3 sm:grid-cols-2">
            <Counter label="Dije" value={2} />
            <Counter label="Gane" value={won} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3].map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Gane ${option}`}
                onClick={() => {
                  playUiSound(option === 2 ? "confirm" : "error");
                  onWon(option);
                }}
                className={cn(
                  "h-11 rounded-[6px] border-2 border-ink px-3 font-display font-black shadow-card transition-transform hover:-translate-y-1",
                  won === option ? "bg-mint" : "bg-gold",
                )}
              >
                Gane {option}
              </button>
            ))}
          </div>
        </div>
        <VisualRule title="Resultado">
          <LifeModeSwitch lifeMode={lifeMode} onLifeMode={onLifeMode} />
          <p className={cn("rounded-[6px] border-2 border-ink p-4 font-display text-xl font-black", exact ? "bg-mint text-ink" : "bg-ember text-bone")}>
            {exact
              ? "Exacto: no pierdes vida"
              : `${lifeMode === "extreme" ? "Modo extremo" : "Modo normal"}: pierdes ${loss} ${loss === 1 ? "letra" : "letras"}`}
          </p>
          <div className="flex gap-2">
            {["B", "U", "R", "U"].map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-[6px] border-2 border-ink font-display font-black shadow-card",
                  index < loss ? "bg-ember text-bone" : "bg-white text-ink",
                )}
              >
                {letter}
              </span>
            ))}
          </div>
        </VisualRule>
      </div>
    </SceneFrame>
  );
}

function LifeModeSwitch({
  lifeMode,
  onLifeMode,
}: {
  lifeMode: TutorialLifeMode;
  onLifeMode: (mode: TutorialLifeMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Modo de vidas">
      {([
        ["extreme", "Modo extremo"],
        ["normal", "Modo normal"],
      ] as const).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => {
            playUiSound("select");
            onLifeMode(mode);
          }}
          className={cn(
            "h-10 rounded-[6px] border-2 border-ink px-3 font-display text-xs font-black shadow-card transition-transform hover:-translate-y-0.5",
            lifeMode === mode ? "bg-mint text-ink" : "bg-white text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function penaltyAmount(bid: number, won: number, lifeMode: TutorialLifeMode) {
  const difference = Math.abs(won - bid);
  if (difference === 0) return 0;
  return lifeMode === "normal" ? 1 : Math.min(4, difference);
}

function penaltyBadge(bid: number, won: number, lifeMode: TutorialLifeMode) {
  const loss = penaltyAmount(bid, won, lifeMode);
  if (loss === 0) return "OK";
  return "BURU".slice(0, loss);
}

const sampleCards: MiniCard[] = [
  { rank: "A", suit: "hearts" },
  { rank: "K", suit: "spades" },
  { rank: "10", suit: "diamonds" },
  { rank: "8", suit: "clubs" },
  { rank: "5", suit: "hearts" },
];

function SceneFrame({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <article className="grid gap-3">
      <div>
        <h3 className="font-display text-2xl font-black text-bone">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-bone/75">{caption}</p>
      </div>
      {children}
    </article>
  );
}

function VisualRule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="grid content-center gap-3 rounded-[8px] border-2 border-ink bg-bone p-4 text-ink shadow-card">
      <p className="font-display text-xs font-black uppercase text-ember">{title}</p>
      {children}
    </aside>
  );
}

function TutorialCard({ card, compact }: { card: MiniCard; compact?: boolean }) {
  const red = isRedSuit(card.suit);

  return (
    <div
      role="img"
      aria-label={`${card.rank} ${card.suit}`}
      className={cn(
        "relative grid aspect-[5/7] place-items-center rounded-[6px] border-2 border-ink bg-bone font-display font-black text-ink shadow-card",
        compact ? "w-12 text-xs sm:w-14" : "w-20 text-lg sm:w-24 sm:text-xl",
      )}
    >
      <span className={cn("absolute left-2 top-1", red ? "text-ember" : "text-ink")}>{card.rank}</span>
      <SuitMark suit={card.suit} className={cn("text-center text-[0.78em]", red ? "text-ember" : "text-ink")} />
      <span className={cn("absolute bottom-1 right-2 rotate-180", red ? "text-ember" : "text-ink")}>{card.rank}</span>
    </div>
  );
}

function PlayedCard({ player, card, winner }: { player: string; card: MiniCard; winner?: boolean }) {
  return (
    <div className="grid justify-items-center gap-2">
      <div className={cn("rounded-[8px] p-1 transition-transform", winner && "-translate-y-2 bg-gold")}>
        <TutorialCard card={card} />
      </div>
      <span className={cn("rounded-[4px] border-2 border-ink px-2 py-1 text-xs font-black", winner ? "bg-gold text-ink" : "bg-ink text-bone")}>
        {player}
      </span>
    </div>
  );
}

function PlayerStack({ name, bid, won, badge, tone }: { name: string; bid: number; won: number; badge: string; tone: "safe" | "hurt" }) {
  return (
    <div className={cn("grid gap-2 rounded-[8px] border-2 border-ink p-3 text-ink shadow-card", tone === "safe" ? "bg-mint" : "bg-bone")}>
      <p className="font-display font-black">{name}</p>
      <div className="flex gap-2">
        <Counter label="Dijo" value={bid} compact />
        <Counter label="Gano" value={won} compact />
      </div>
      <span
        data-testid={`tutorial-badge-${name}`}
        className={cn("rounded-[4px] border-2 border-ink px-2 py-1 text-center font-display font-black", tone === "safe" ? "bg-gold" : "bg-ember text-bone")}
      >
        {badge}
      </span>
    </div>
  );
}

function MiniFormula({ left, middle, result, good }: { left: string; middle: string; result: string; good?: boolean }) {
  return (
    <div className="grid gap-1 rounded-[6px] border-2 border-ink bg-white p-2 text-ink">
      <div className="flex flex-wrap items-center gap-2 font-display font-black">
        <span>{left}</span>
        <span>+</span>
        <span>{middle}</span>
      </div>
      <p className={cn("font-bold", good ? "text-felt" : "text-ember")}>{result}</p>
    </div>
  );
}

function Counter({ label, value, compact }: { label: string; value: number; compact?: boolean }) {
  return (
    <div className="grid justify-items-center rounded-[6px] border-2 border-ink bg-white px-3 py-2 text-ink">
      <span className="text-xs font-black uppercase text-ink/60">{label}</span>
      <span className={cn("font-display font-black", compact ? "text-xl" : "text-4xl")}>{value}</span>
    </div>
  );
}
