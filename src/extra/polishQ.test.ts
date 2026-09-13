import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  GAUNTLET_QUALITY,
  HARD_BFS,
  THINKING,
  assessPuzzle,
  generateAttract,
  generateRun,
  hasOffOrToggle,
  hasStartingOnBridges,
  isObviousIslandChain,
  isStrictHard,
  mechanismScore,
  meetsThinking,
  meetsThinkingDesign,
  sharedBridgeCount,
} from "./generate";

describe("isObviousIslandChain", () => {
  it("flags plain ON-only sequential gates and accepts shared/toggle layouts", () => {
    const linear = {
      id: "chain",
      code: "000000",
      tiles: [
        "               ",
        "  bbb bbb bbbe ",
        "  bbblbbblbbb  ",
        "  s     s      ",
        "               ",
        "               ",
        "               ",
        "               ",
        "               ",
        "               ",
      ],
      spawn: [2, 1] as [number, number],
      switches: [
        { x: 2, y: 3, bridges: [{ x: 5, y: 2, mode: "on" as const }] },
        { x: 8, y: 3, bridges: [{ x: 9, y: 2, mode: "on" as const }] },
      ],
      splits: [],
    };
    expect(isObviousIslandChain(linear)).toBe(true);
    expect(mechanismScore(linear)).toBeLessThan(THINKING.insane.minNovelty);

    const shared = {
      ...linear,
      switches: [
        {
          x: 2,
          y: 3,
          bridges: [
            { x: 5, y: 2, mode: "on" as const },
            { x: 9, y: 2, mode: "onoff" as const },
          ],
        },
        { x: 8, y: 3, bridges: [{ x: 9, y: 2, mode: "on" as const }] },
      ],
    };
    expect(isObviousIslandChain(shared)).toBe(false);
    expect(mechanismScore(shared)).toBeGreaterThanOrEqual(3);
  });
});

describe("attract thinking showcase", () => {
  it("ships gated non-chain puzzles with mechanism novelty", () => {
    const q = GAUNTLET_QUALITY.insane;
    for (const seed of ["BLOX", "attract-q", "soft-chain", "demo"]) {
      const p = generateAttract(seed);
      expect(p.difficulty).toBe("insane");
      const assess = assessPuzzle(p.def, Math.min(q.bfs, HARD_BFS));
      expect(assess.solvable, seed).toBe(true);
      expect(assess.gated, seed).toBe(true);
      expect(isObviousIslandChain(p.def), seed).toBe(false);
      expect(meetsThinkingDesign(p.def, "insane") || meetsThinking(p, assess, "insane"), seed).toBe(true);
      expect(mechanismScore(p.def), seed).toBeGreaterThanOrEqual(THINKING.insane.minNovelty);
      const novel =
        sharedBridgeCount(p.def) >= 1 ||
        hasStartingOnBridges(p.def) ||
        hasOffOrToggle(p.def) ||
        (p.def.splits ?? []).length > 0;
      expect(novel, seed).toBe(true);
    }
  }, 300_000);
});

describe("gauntlet thinking at all difficulties", () => {
  it("generateRun stays layout-only and exit-bearing across difficulties", () => {
    for (const diff of DIFFICULTIES) {
      const t0 = performance.now();
      const run = generateRun(`think-${diff}`, diff, 3);
      expect(performance.now() - t0).toBeLessThan(50);
      expect(run).toHaveLength(3);
      for (const floor of run) {
        expect(floor.def.tiles.some((row) => row.includes("e")), floor.seed).toBe(true);
        expect(floor.solution, floor.seed).toBeUndefined();
      }
    }
  });

  it("easy and insane runs share the same cheap remix path", () => {
    const easy = generateRun("fair-easy", "easy", 2);
    for (const floor of easy) {
      expect(floor.def.tiles.some((row) => row.includes("e"))).toBe(true);
      expect(floor.difficulty).toBe("easy");
    }
    const insane = generateRun("deep-insane", "insane", 2);
    for (const floor of insane) {
      expect(floor.def.tiles.some((row) => row.includes("e"))).toBe(true);
      expect(floor.difficulty).toBe("insane");
      expect(floor.solution).toBeUndefined();
    }
  });
});
