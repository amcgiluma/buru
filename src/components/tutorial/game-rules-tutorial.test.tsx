import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameRulesTutorial } from "./game-rules-tutorial";

describe("GameRulesTutorial", () => {
  it("walks through the visual scenes using a french deck by default", async () => {
    render(<GameRulesTutorial open onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Tutorial visual de BURU" })).toBeInTheDocument();
    expect(screen.getByText("Baraja francesa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente escena" }));
    expect(screen.getByText("Elige tu apuesta")).toBeInTheDocument();
    expect(within(screen.getByRole("img", { name: "A hearts" })).getByText("\u2665")).toBeInTheDocument();
    expect(screen.queryByText("heart")).not.toBeInTheDocument();
    expect(screen.getByText("La suma no puede quedar en 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente escena" }));
    expect(screen.getByText("Gana la carta mas alta")).toBeInTheDocument();
    expect(screen.getByText("K spades gana la baza")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente escena" }));
    expect(screen.getByText("5 -> 4 -> 3 -> 2 -> 1 -> 2 -> 3 -> 4 -> 5")).toBeInTheDocument();
  });

  it("switches the tie winner between Diego and Lete rules", async () => {
    render(<GameRulesTutorial open onClose={vi.fn()} />);

    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente escena" }));
    }

    expect(screen.getByText("Diego: gana la primera carta empatada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reglas Lete" }));
    expect(screen.getByText("Lete: gana la segunda carta empatada")).toBeInTheDocument();
  });

  it("shows win and loss outcomes in the result scene", async () => {
    render(<GameRulesTutorial open onClose={vi.fn()} />);

    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente escena" }));
    }

    expect(screen.getByText("Exacto: no pierdes vida")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gane 1" }));
    expect(screen.getByText("Fallaste: pierdes una letra")).toBeInTheDocument();
  });
});
