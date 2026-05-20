import Image from "next/image";
import { cn } from "@/lib/utils";

const SPANISH_SUIT_ASSETS: Record<string, string> = {
  oros: "/suits/spanish/oros.svg",
  copas: "/suits/spanish/copas.svg",
  espadas: "/suits/spanish/espadas.svg",
  bastos: "/suits/spanish/bastos.svg",
};

const FRENCH_SUIT_SYMBOLS: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

export function SuitMark({ suit, className }: { suit?: string; className?: string }) {
  const spanishAsset = suit ? SPANISH_SUIT_ASSETS[suit] : undefined;

  if (spanishAsset && suit) {
    return (
      <Image
        src={spanishAsset}
        alt={`Palo ${suit}`}
        width={56}
        height={56}
        unoptimized
        draggable={false}
        className={cn("h-[2.1em] max-h-14 w-[2.1em] max-w-14 object-contain", className)}
      />
    );
  }

  return <span className={className}>{suit ? FRENCH_SUIT_SYMBOLS[suit] ?? "" : ""}</span>;
}

export function isRedSuit(suit?: string) {
  return suit === "hearts" || suit === "diamonds" || suit === "copas" || suit === "oros";
}
