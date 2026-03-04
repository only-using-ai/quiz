const MAX_POINTS = 1000;
const MIN_POINTS = 100;

/**
 * Calculate points based on how quickly the player answered.
 * @param elapsed   ms since question was shown
 * @param timeLimit ms allowed (default 30s)
 */
export function calculatePoints(elapsed: number, timeLimit = 30_000): number {
  if (elapsed >= timeLimit) return MIN_POINTS;
  const ratio = 1 - elapsed / timeLimit;
  return Math.round(MIN_POINTS + ratio * (MAX_POINTS - MIN_POINTS));
}
