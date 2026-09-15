import { describe, expect, it } from "vitest";
import {
  beginTouchPlayLatch,
  isTouchPlayArrow,
  releaseTouchPlayLatch,
  tickTouchPlayLatch,
  TOUCH_PLAY_LATCH_MAX_ARMED_TICKS,
} from "./touchPlayLatch";

describe("touch play Coolmath latch", () => {
  it("only latches arrow codes", () => {
    expect(isTouchPlayArrow("ArrowRight")).toBe(true);
    expect(isTouchPlayArrow("Space")).toBe(false);
    expect(beginTouchPlayLatch("Space")).toBeNull();
  });

  it("keeps a short tap held until the block leaves idle", () => {
    let latch = beginTouchPlayLatch("ArrowRight");
    expect(latch).toEqual({
      code: "ArrowRight",
      fingerDown: true,
      armed: true,
      armedTicks: 0,
    });

    // Finger up before Coolmath tick — still idle → latch, do not release.
    const up = releaseTouchPlayLatch(latch, "ArrowRight", true);
    expect(up.releaseNow).toBe(false);
    latch = up.latch;
    expect(latch?.fingerDown).toBe(false);
    expect(latch?.armed).toBe(true);

    // Still idle — keep holding and re-assert so incidental keyups cannot clear it.
    let tick = tickTouchPlayLatch(latch, true);
    expect(tick.releaseCode).toBeNull();
    expect(tick.reassertCode).toBe("ArrowRight");
    expect(tick.latch?.armed).toBe(true);
    expect(tick.latch?.armedTicks).toBe(1);

    // Roll starts → release so only one step fires.
    tick = tickTouchPlayLatch(tick.latch, false);
    expect(tick.releaseCode).toBe("ArrowRight");
    expect(tick.reassertCode).toBeNull();
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

  it("times out an armed finger-up tap that never starts a roll", () => {
    let latch = beginTouchPlayLatch("ArrowUp");
    const up = releaseTouchPlayLatch(latch, "ArrowUp", true);
    latch = up.latch;
    expect(up.releaseNow).toBe(false);

    for (let i = 0; i < TOUCH_PLAY_LATCH_MAX_ARMED_TICKS; i++) {
      const tick = tickTouchPlayLatch(latch, true);
      expect(tick.releaseCode).toBeNull();
      expect(tick.reassertCode).toBe("ArrowUp");
      latch = tick.latch;
    }

    const timedOut = tickTouchPlayLatch(latch, true);
    expect(timedOut.releaseCode).toBe("ArrowUp");
    expect(timedOut.latch).toBeNull();
    expect(timedOut.reassertCode).toBeNull();
  });

  it("does not time out while the finger is still held", () => {
    let latch = beginTouchPlayLatch("ArrowRight");
    for (let i = 0; i < TOUCH_PLAY_LATCH_MAX_ARMED_TICKS + 5; i++) {
      const tick = tickTouchPlayLatch(latch, true);
      expect(tick.releaseCode).toBeNull();
      expect(tick.reassertCode).toBeNull();
      latch = tick.latch;
      expect(latch?.fingerDown).toBe(true);
      expect(latch?.armed).toBe(true);
    }
  });
});
