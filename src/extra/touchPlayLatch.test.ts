import { describe, expect, it } from "vitest";
import {
  beginTouchPlayLatch,
  isTouchPlayArrow,
  releaseTouchPlayLatch,
  tickTouchPlayLatch,
} from "./touchPlayLatch";

describe("touch play Coolmath latch", () => {
  it("only latches arrow codes", () => {
    expect(isTouchPlayArrow("ArrowRight")).toBe(true);
    expect(isTouchPlayArrow("Space")).toBe(false);
    expect(beginTouchPlayLatch("Space")).toBeNull();
  });

  it("keeps a short tap held until the block leaves idle", () => {
    let latch = beginTouchPlayLatch("ArrowRight");
    expect(latch).toEqual({ code: "ArrowRight", fingerDown: true, armed: true });

    // Finger up before Coolmath tick — still idle → latch, do not release.
    const up = releaseTouchPlayLatch(latch, "ArrowRight", true);
    expect(up.releaseNow).toBe(false);
    latch = up.latch;
    expect(latch?.fingerDown).toBe(false);
    expect(latch?.armed).toBe(true);

    // Still idle — keep holding.
    let tick = tickTouchPlayLatch(latch, true);
    expect(tick.releaseCode).toBeNull();
    expect(tick.latch?.armed).toBe(true);

    // Roll starts → release so only one step fires.
    tick = tickTouchPlayLatch(tick.latch, false);
    expect(tick.releaseCode).toBe("ArrowRight");
    expect(tick.latch).toBeNull();
  });

  it("releases immediately after a consumed hold so repeat stops", () => {
    let latch = beginTouchPlayLatch("ArrowDown");
    latch = tickTouchPlayLatch(latch, false).latch; // roll started while held
    expect(latch?.armed).toBe(false);
    expect(latch?.fingerDown).toBe(true);

    const up = releaseTouchPlayLatch(latch, "ArrowDown", true);
    expect(up.releaseNow).toBe(true);
    expect(up.latch).toBeNull();
  });

  it("releases immediately when finger lifts mid-roll", () => {
    let latch = beginTouchPlayLatch("ArrowLeft");
    latch = tickTouchPlayLatch(latch, false).latch;
    const up = releaseTouchPlayLatch(latch, "ArrowLeft", false);
    expect(up.releaseNow).toBe(true);
    expect(up.latch).toBeNull();
  });
});
