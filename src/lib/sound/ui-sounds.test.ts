import { describe, expect, it } from "vitest";
import { getUiSoundPattern, playUiSound } from "./ui-sounds";

describe("ui sounds", () => {
  it("defines short minimal patterns for UI interactions", () => {
    expect(getUiSoundPattern("tap")).toEqual([
      { frequency: 420, duration: 0.045, delay: 0, type: "triangle" },
    ]);
    expect(getUiSoundPattern("confirm").length).toBeGreaterThan(1);
    expect(getUiSoundPattern("card")[0].frequency).toBeGreaterThan(getUiSoundPattern("tap")[0].frequency);
  });

  it("returns copies so callers cannot mutate the shared patterns", () => {
    const first = getUiSoundPattern("tap");
    first[0].frequency = 1;

    expect(getUiSoundPattern("tap")[0].frequency).toBe(420);
  });

  it("does not throw when Web Audio is unavailable", () => {
    expect(() => playUiSound("tap")).not.toThrow();
  });
});
