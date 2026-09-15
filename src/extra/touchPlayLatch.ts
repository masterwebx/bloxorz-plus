/** Arrow codes Coolmath only consumes while held through an idle world tick. */
const ARROW_CODES = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

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
};

export function beginTouchPlayLatch(code: string): TouchPlayLatch | null {
  if (!isTouchPlayArrow(code)) return null;
  return { code, fingerDown: true, armed: true };
}

/** Mark the press consumed once the block is no longer idle. */
export function noteTouchPlayMotion(latch: TouchPlayLatch | null, idle: boolean): TouchPlayLatch | null {
  if (!latch || idle) return latch;
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

/**
 * After a latched tap starts rolling, release so only one step fires.
 * While the finger is still down, keep holding for repeat.
 */
export function tickTouchPlayLatch(latch: TouchPlayLatch | null, idle: boolean): {
  latch: TouchPlayLatch | null;
  releaseCode: string | null;
} {
  const next = noteTouchPlayMotion(latch, idle);
  if (!next) return { latch: null, releaseCode: null };
  if (!next.fingerDown && !next.armed) {
    return { latch: null, releaseCode: next.code };
  }
  return { latch: next, releaseCode: null };
}
