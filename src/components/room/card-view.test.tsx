import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardView } from "./card-view";
import type { Card } from "@/lib/game/types";

describe("CardView", () => {
  it("renders spanish suits with local SVG artwork while keeping the card label", () => {
    render(<CardView card={card("oros", "12", 9)} />);

    const cardButton = screen.getByRole("button", { name: "12 oros" });
    const suitImage = within(cardButton).getByRole("img", { name: "Palo oros" });

    expect(suitImage).toHaveAttribute("src", "/suits/spanish/oros.svg");
    expect(screen.queryByText("oro")).not.toBeInTheDocument();
  });
});

function card(suit: string, rank: string, value: number): Card {
  return {
    id: `spanish-${suit}-${rank}`,
    deckType: "spanish",
    suit,
    rank,
    label: rank,
    value,
  };
}
