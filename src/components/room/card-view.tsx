"use client";

import { SuitMark, isRedSuit } from "@/components/cards/suit-mark";
import type { HiddenCard } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Props = {
  card: HiddenCard;
  playable?: boolean;
  selected?: boolean;
  winner?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export function CardView({ card, playable, selected, winner, compact, onClick }: Props) {
  const red = isRedSuit(card.suit);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative grid aspect-[5/7] shrink-0 place-items-center rounded-[6px] border-2 border-ink font-display font-black shadow-card transition-transform duration-150 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-default",
        compact ? "w-12 text-xs sm:w-14" : "w-20 text-lg sm:w-24 sm:text-xl",
        card.hidden ? "card-back text-bone" : "bg-bone text-ink",
        playable && "ring-4 ring-mint/70",
        selected && "-translate-y-2 ring-4 ring-signal",
        winner && "ring-4 ring-gold",
        onClick && "cursor-pointer hover:-translate-y-2 active:-translate-y-1",
      )}
      aria-label={card.hidden ? "Carta oculta" : `${card.rank} ${card.suit}`}
    >
      {card.hidden ? (
        <span>BU</span>
      ) : (
        <>
          <span className={cn("absolute left-2 top-1", red ? "text-ember" : "text-ink")}>{card.rank}</span>
          <SuitMark suit={card.suit} className={cn("text-center text-[0.7em]", red ? "text-ember" : "text-ink")} />
          <span className={cn("absolute bottom-1 right-2 rotate-180", red ? "text-ember" : "text-ink")}>
            {card.rank}
          </span>
        </>
      )}
    </button>
  );
}
