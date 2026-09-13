import { describe, expect, it } from "vitest";
import {
  classicCongratsVisible,
  classicInstructionBitmapsVisible,
  wantsClassicCampaignMoveHelp,
  wantsClassicStage1MoveHint,
} from "./attract";
import {
  COLOR_PREVIEW_CHARS,
  COLOR_PREVIEW_DEF,
  COLOR_PREVIEW_SPAWN,
} from "./colorCustom";
import {
  ATTRACT_ARCHETYPES,
  DIFFICULTIES,
  GAUNTLET_QUALITY,
  HARD_BFS,
  assessPuzzle,
  gauntletRemixBand,
  generateRun,
  isStrictHard,
  runArchetypeForSeed,
  tryArchetypePuzzle,
} from "./generate";
import { solveLevel } from "./solve";

describe("gauntlet strict GAUNTLET_QUALITY", () => {
  it("maps remix bands like pre-N (insane/hard → end)", () => {
    expect(gauntletRemixBand("easy")).toBe("mid");
    expect(gauntletRemixBand("medium")).toBe("late");
    expect(gauntletRemixBand("hard")).toBe("end");
    expect(gauntletRemixBand("insane")).toBe("end");
  });

  it("strict tryArchetypePuzzle rejects soft accepts (returns null on miss)", () => {
    // Ribbon often produces short ungated tapes; strict must not return best-of-weak.
    const soft = tryArchetypePuzzle("polish-o-ribbon-soft", "ribbon", "insane", GAUNTLET_QUALITY.insane, 3);
    const strict = tryArchetypePuzzle("polish-o-ribbon-soft", "ribbon", "insane", GAUNTLET_QUALITY.insane, 3, {
      strictQuality: true,
    });
    if (soft) {
      const assess = assessPuzzle(soft.def, HARD_BFS);
      if (!isStrictHard(assess, GAUNTLET_QUALITY.insane) || soft.usedObstacles < GAUNTLET_QUALITY.insane.minUsed) {
        expect(strict).toBeNull();
      }
    } else {
      expect(strict).toBeNull();
    }
  });

  it("generateRun is layout-only remix (no quality BFS on the start path)", () => {
    for (const diff of DIFFICULTIES) {
      const t0 = performance.now();
      const run = generateRun(`polish-o-${diff}`, diff, 2);
      expect(performance.now() - t0).toBeLessThan(50);
      expect(run).toHaveLength(2);
      for (const floor of run) {
        expect(floor.difficulty).toBe(diff);
        expect(floor.def.tiles.some((row) => row.includes("e"))).toBe(true);
        expect(floor.solution).toBeUndefined();
      }
    }
  });

  it("insane generateRun stays on end-band campaign flips without sync quality solves", () => {
    const t0 = performance.now();
    const run = generateRun("test", "insane", 5);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(run).toHaveLength(5);
    const keys = new Set(run.map((p) => p.def.tiles.join("")));
    expect(keys.size).toBe(5);
    for (const floor of run) {
      expect(floor.def.tiles.some((row) => row.includes("e"))).toBe(true);
      expect(floor.difficulty).toBe("insane");
    }
  });

  it("still rotates run archetypes by seed/index", () => {
    const seen = new Set(ATTRACT_ARCHETYPES.map((_, i) => runArchetypeForSeed("polish-o-rot", i)));
    for (let i = 0; i < 48; i++) seen.add(runArchetypeForSeed(`polish-o-probe-${i % 7}`, i));
    expect(seen.size).toBe(ATTRACT_ARCHETYPES.length);
  });
});

describe("classic stage-01 move hint", () => {
  const classic = { classicRun: true, kind: "campaign" as const };
  const daily = { classicRun: false, kind: "custom" as const };

  it("shows only on classic campaign stage 1", () => {
    expect(wantsClassicStage1MoveHint({ ...classic, stageNo: 1 })).toBe(true);
    expect(wantsClassicStage1MoveHint({ ...classic, stageNo: 2 })).toBe(false);
    expect(wantsClassicCampaignMoveHelp({ ...classic, stageNo: 5 })).toBe(true);
  });

  it("suppresses daily / seeded / gauntlet / custom / attract / replay", () => {
    expect(wantsClassicStage1MoveHint({ ...daily, stageNo: 1 })).toBe(false);
    expect(wantsClassicCampaignMoveHelp({ ...daily, stageNo: 1 })).toBe(false);
    expect(wantsClassicStage1MoveHint({ ...classic, stageNo: 1, attract: true })).toBe(false);
    expect(wantsClassicStage1MoveHint({ ...classic, stageNo: 1, replay: true })).toBe(false);
    expect(
      wantsClassicStage1MoveHint({ classicRun: false, kind: "campaign", stageNo: 1 }),
    ).toBe(false);
  });
});

describe("attract classic bitmap suppress", () => {
  it("hides instruction bitmaps while attracting or off instructions", () => {
    expect(
      classicInstructionBitmapsVisible({ hdType: false, attracting: true, label: "game" }),
    ).toBe(false);
    expect(
      classicInstructionBitmapsVisible({ hdType: false, attracting: true, label: "instructions" }),
    ).toBe(false);
    expect(
      classicInstructionBitmapsVisible({ hdType: false, attracting: false, label: "game" }),
    ).toBe(false);
    expect(
      classicInstructionBitmapsVisible({ hdType: false, attracting: false, label: "instructions" }),
    ).toBe(true);
    expect(
      classicInstructionBitmapsVisible({ hdType: true, attracting: false, label: "instructions" }),
    ).toBe(false);
  });

  it("hides classic congrats while attracting", () => {
    expect(classicCongratsVisible({ hdType: false, attracting: true, onFinish: true })).toBe(false);
    expect(classicCongratsVisible({ hdType: false, attracting: false, onFinish: true })).toBe(true);
    expect(classicCongratsVisible({ hdType: true, attracting: false, onFinish: true })).toBe(false);
    expect(classicCongratsVisible({ hdType: false, attracting: false, onFinish: false })).toBe(false);
  });
});

describe("customize colors preview puzzle", () => {
  it("is solvable and shows every tile color slot + spawn", () => {
    const chars = new Set(COLOR_PREVIEW_DEF.tiles.join("").replace(/ /g, "").split(""));
    for (const ch of COLOR_PREVIEW_CHARS) expect(chars.has(ch)).toBe(true);
    expect(COLOR_PREVIEW_SPAWN).toEqual(COLOR_PREVIEW_DEF.spawn);
    const solved = solveLevel(COLOR_PREVIEW_DEF, 80_000);
    expect(solved.ok).toBe(true);
    expect(solved.cmds.length).toBeGreaterThan(0);
  });
});

describe("settings spinning block removed", () => {
  it("ExtraHud no longer exposes makePreview for settings spinna", async () => {
    const { ExtraHud } = await import("./hud");
    expect("makePreview" in ExtraHud.prototype).toBe(false);
    const proto = ExtraHud.prototype as { placePreview?: unknown };
    expect(proto.placePreview).toBeUndefined();
  });
});
