import { describe, expect, it } from "vitest";
import { classicContinueLevel, classicSaveLevel, CLASSIC_STAGE_COUNT } from "./classicProgress";

describe("classic continue progress", () => {
  it("maps post-campaign saves (34+) to stage 01", () => {
    expect(classicSaveLevel(34)).toBe(1);
    expect(classicSaveLevel(99)).toBe(1);
    expect(classicContinueLevel(34)).toBe(1);
    expect(classicContinueLevel(CLASSIC_STAGE_COUNT + 1)).toBe(1);
  });

  it("keeps in-progress stages 1–33", () => {
    expect(classicSaveLevel(1)).toBe(1);
    expect(classicSaveLevel(33)).toBe(33);
    expect(classicContinueLevel(1)).toBe(1);
    expect(classicContinueLevel(17)).toBe(17);
    expect(classicContinueLevel(33)).toBe(33);
  });

  it("treats missing or invalid saves as no continue", () => {
    expect(classicContinueLevel(0)).toBe(0);
    expect(classicContinueLevel(-1)).toBe(0);
    expect(classicContinueLevel(Number.NaN)).toBe(0);
  });
});
