import { render, screen } from "@testing-library/react";
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
});
