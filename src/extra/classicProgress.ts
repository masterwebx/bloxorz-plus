/** Classic campaign has stages 01–33. */
export const CLASSIC_STAGE_COUNT = 33;

/**
 * Normalize a stored Continue stage.
 * After beating 33 Coolmath saves 34 — map that (and anything past the campaign)
 * back to stage 01 so Continue starts a fresh run instead of sticking on 33/34.
 */
export function classicContinueLevel(saved: number): number {
  if (!Number.isFinite(saved) || saved < 1) return 0;
  const n = Math.floor(saved);
  if (n > CLASSIC_STAGE_COUNT) return 1;
  return n;
}

/** Value to persist when Coolmath calls localSave.save(num). */
export function classicSaveLevel(num: number): number {
  if (!Number.isFinite(num)) return 1;
  const n = Math.floor(num);
  if (n > CLASSIC_STAGE_COUNT) return 1;
  if (n < 1) return 1;
  return n;
}
