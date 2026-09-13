import { describe, expect, it } from "vitest";
import { LEVELS } from "./engine";
import {
  GAUNTLET_QUALITY,
  HARD_BFS,
  INSANE_THINKING,
  assessPuzzle,
  generateAttract,
  generateRun,
  hasOffOrToggle,
  hasStartingOnBridges,
  isStrictHard,
  mechanismScore,
  meetsInsaneDesign,
  meetsInsaneThinking,
  sharedBridgeCount,
  tryArchetypePuzzle,
} from "./generate";

describe("mechanismScore / insane design", () => {
  it("scores official end-campaign floors as highly novel", () => {
    for (let i = 28; i <= 32; i++) {
      const score = mechanismScore(LEVELS[i]!);
      expect(score, `level ${i}`).toBeGreaterThanOrEqual(4);
      expect(meetsInsaneDesign(LEVELS[i]!)).toBe(true);
    }
  });

  it("scores a plain ON-only one-gate corridor below the insane bar", () => {
    const def = {
      id: "linear",
      code: "000000",
      tiles: [
        "               ",
        "  bbbb bbbbe   ",
        "  bbbblbbbb    ",
        "  s            ",
        "               ",
        "               ",
        "               ",
        "               ",
        "               ",
        "               ",
      ],
      spawn: [2, 1] as [number, number],
      switches: [{ x: 2, y: 3, bridges: [{ x: 6, y: 2, mode: "on" as const }] }],
      splits: [],
    };
    expect(mechanismScore(def)).toBeLessThan(4);
    expect(meetsInsaneDesign(def)).toBe(false);
  });
});

describe("insane attract novelty", () => {
  it("ships thinking or full-quality insane puzzles for showcase seeds", () => {
    const q = GAUNTLET_QUALITY.insane;
    for (const seed of ["BLOX", "attract-a", "polish-n-attract-1", "soft", "demo"]) {
      const p = generateAttract(seed);
      expect(p.difficulty).toBe("insane");
      const assess = assessPuzzle(p.def, Math.min(q.bfs, HARD_BFS));
      expect(assess.solvable, seed).toBe(true);
      expect(assess.gated, seed).toBe(true);
      expect(assess.requiredCount, seed).toBeGreaterThanOrEqual(q.minRequired);
      expect(assess.requiredCount, seed).toBe(assess.switchCount);
      expect(
        isStrictHard(assess, q) || meetsInsaneThinking(p, assess),
        `${seed} len=${assess.solutionLen} novelty=${mechanismScore(p.def)}`,
      ).toBe(true);
      expect(meetsInsaneDesign(p.def), seed).toBe(true);
      expect(mechanismScore(p.def), seed).toBeGreaterThanOrEqual(INSANE_THINKING.minNovelty);
      expect(assess.solutionLen, seed).toBeGreaterThanOrEqual(INSANE_THINKING.minMoves);
    }
  }, 300_000);

  it("strict archetype tries honor minNovelty (ribbon soft stays null when strict)", () => {
    const strict = tryArchetypePuzzle("polish-p-ribbon", "ribbon", "insane", GAUNTLET_QUALITY.insane, 3, {
      strictQuality: true,
      minNovelty: 4,
    });
    if (strict) {
      expect(meetsInsaneDesign(strict.def)).toBe(true);
      const assess = assessPuzzle(strict.def, HARD_BFS);
      expect(isStrictHard(assess, GAUNTLET_QUALITY.insane) || meetsInsaneThinking(strict, assess)).toBe(true);
    } else {
      expect(strict).toBeNull();
    }
  });
});

describe("insane gauntlet novelty", () => {
  it("generateRun floors stay unique under the end-band flip ceiling", () => {
    for (const seed of ["test", "gauntlet", "20260911"]) {
      const run = generateRun(seed, "insane", 5);
      expect(run).toHaveLength(5);
      const keys = new Set(run.map((p) => p.def.tiles.join("")));
      expect(keys.size, seed).toBe(5);
      for (const floor of run) {
        expect(floor.def.tiles.some((row) => row.includes("e")), floor.seed).toBe(true);
        expect(floor.solution, floor.seed).toBeUndefined();
      }
    }
  });

  it("33-stage insane run finishes fast even past the 20-layout ceiling", () => {
    const t0 = performance.now();
    const run = generateRun("variety-probe", "insane", 33);
    expect(performance.now() - t0).toBeLessThan(100);
    expect(run).toHaveLength(33);
    const keys = new Set(run.map((p) => p.def.tiles.join("")));
    // End band = 5 donors × 4 flips = 20 unique max; duplicates allowed after saturation.
    expect(keys.size).toBeLessThanOrEqual(20);
    expect(keys.size).toBeGreaterThanOrEqual(10);
  });
});
