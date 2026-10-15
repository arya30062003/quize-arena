/**
 * Scoring Service for QuizArena
 *
 * Scoring Rule:
 * - Incorrect answer = 0 points.
 * - Correct answer = 100 base points + Speed Bonus.
 * - Speed bonus formula:
 *   score = 100 + Math.round(((maxTime - responseTime) / maxTime) * 50)
 *   Max total points = 150 points per question.
 */

export interface ScoreCalculationResult {
  isCorrect: boolean;
  basePoints: number;
  speedBonus: number;
  totalPoints: number;
  responseTimeSec: number;
}

export class ScoringService {
  /**
   * Calculates score for a submitted answer based on server timestamps.
   *
   * @param isCorrect Whether the chosen option is correct
   * @param maxTimeSec Total time allotted for the question in seconds
   * @param responseTimeMs Response time in milliseconds
   */
  public static calculateScore(
    isCorrect: boolean,
    maxTimeSec: number,
    responseTimeMs: number
  ): ScoreCalculationResult {
    if (!isCorrect) {
      return {
        isCorrect: false,
        basePoints: 0,
        speedBonus: 0,
        totalPoints: 0,
        responseTimeSec: Math.max(0, responseTimeMs / 1000)
      };
    }

    const responseTimeSec = Math.max(0, responseTimeMs / 1000);
    const validMaxTime = maxTimeSec > 0 ? maxTimeSec : 20;

    // Clamp response time to maxTime
    const clampedResponseTime = Math.min(responseTimeSec, validMaxTime);

    // Speed bonus formula: ((maxTime - responseTime) / maxTime) * 50
    const ratio = Math.max(0, (validMaxTime - clampedResponseTime) / validMaxTime);
    const speedBonus = Math.round(ratio * 50);
    const basePoints = 100;
    const totalPoints = basePoints + speedBonus;

    return {
      isCorrect: true,
      basePoints,
      speedBonus,
      totalPoints,
      responseTimeSec: parseFloat(responseTimeSec.toFixed(2))
    };
  }
}
