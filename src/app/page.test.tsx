import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next/font/google", () => ({
  Press_Start_2P: () => ({ className: "mock-pixel-font" }),
}));

import HomePage from "./page";

describe("HomePage", () => {
  it("keeps the pixel BURU logo accessible as the page heading", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "BURU" })).toBeInTheDocument();
    expect(screen.getByText("Aplasta a tus enemigos, no tengas piedad")).toBeInTheDocument();
  });

  it("opens and closes the visual rules tutorial", async () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "Reglas del juego" }));

    expect(screen.getByRole("dialog", { name: "Tutorial visual de BURU" })).toBeInTheDocument();
    expect(screen.getByText("Baraja francesa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar tutorial" }));

    expect(screen.queryByRole("dialog", { name: "Tutorial visual de BURU" })).not.toBeInTheDocument();
  });
});
