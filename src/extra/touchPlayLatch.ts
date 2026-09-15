/** Arrow codes Coolmath only consumes while held through an idle world tick. */
const ARROW_CODES = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Max CreateJS ticks an armed finger-up tap may wait for a roll to start.
 * Beyond this, release so a missed consume cannot leave keys.code stuck and
 * fight every idle `keys.tick` (felt as continuous rolls / rumble / lag).
 * ~8 frames ≈ 220ms at the authored 36fps TIMEOUT ticker.
 */
export const TOUCH_PLAY_LATCH_MAX_ARMED_TICKS = 8;

export function isTouchPlayArrow(code: string): boolean {
  return ARROW_CODES.has(code);
}

/**
 * Touch/gamepad play latch for Coolmath keys.
 * A short tap must keep the arrow held until the block leaves idle (one roll),
 * while a held finger still supports continuous move-repeat.
 */
export type TouchPlayLatch = {
  code: string;
  /** Finger still on the pad button. */
  fingerDown: boolean;
  /** True until Coolmath has started a roll for this press. */
  armed: boolean;
  /** Overlay ticks spent armed while waiting for a roll (finger-up taps). */
  armedTicks: number;
};

export function beginTouchPlayLatch(code: string): TouchPlayLatch | null {
  if (!isTouchPlayArrow(code)) return null;
  return { code, fingerDown: true, armed: true, armedTicks: 0 };
}

/** Mark the press consumed once the block is no longer idle. */
export function noteTouchPlayMotion(latch: TouchPlayLatch | null, idle: boolean): TouchPlayLatch | null {
  if (!latch || idle) return latch;
  if (!latch.armed) return latch;
  return { ...latch, armed: false };
}

export type TouchPlayUpResult = {
  latch: TouchPlayLatch | null;
  /** Fire triggerKeyUp now (finger up after a consumed press, or non-arrow). */
  releaseNow: boolean;
};

/**
 * On pad button release: keep holding a still-armed idle tap so Coolmath can
 * consume it; otherwise clear immediately (stop hold-repeat).
 */
export function releaseTouchPlayLatch(
  latch: TouchPlayLatch | null,
  code: string,
  idle: boolean,
): TouchPlayUpResult {
  if (!latch || latch.code !== code) {
    return { latch: null, releaseNow: true };
  }
  if (latch.armed && idle) {
    return { latch: { ...latch, fingerDown: false }, releaseNow: false };
  }
  return { latch: null, releaseNow: true };
}

export type TouchPlayTickResult = {
  latch: TouchPlayLatch | null;
  releaseCode: string | null;
  /** Re-assert triggerKeyDown so incidental keyups cannot clear an armed tap. */
  reassertCode: string | null;
};

/**
 * After a latched tap starts rolling, release so only one step fires.
 * While the finger is still down, keep holding for repeat.
 * Armed finger-up taps time out so keys cannot stick across idle ticks.
 */
export function tickTouchPlayLatch(
  latch: TouchPlayLatch | null,
  idle: boolean,
  maxArmedTicks = TOUCH_PLAY_LATCH_MAX_ARMED_TICKS,
): TouchPlayTickResult {
  if (!latch) return { latch: null, releaseCode: null, reassertCode: null };

  if (latch.armed) {
    const armedTicks = latch.armedTicks + 1;
    if (!idle) {
      const next: TouchPlayLatch = { ...latch, armed: false, armedTicks };
      if (!next.fingerDown) {
        return { latch: null, releaseCode: next.code, reassertCode: null };
      }
      return { latch: next, releaseCode: null, reassertCode: null };
    }
    if (!latch.fingerDown && armedTicks > maxArmedTicks) {
      return { latch: null, releaseCode: latch.code, reassertCode: null };
    }
    const next: TouchPlayLatch = { ...latch, armedTicks };
    return {
      latch: next,
      releaseCode: null,
      reassertCode: next.fingerDown ? null : next.code,
    };
  }

  if (!latch.fingerDown) {
    return { latch: null, releaseCode: latch.code, reassertCode: null };
  }
  return { latch, releaseCode: null, reassertCode: null };
}
