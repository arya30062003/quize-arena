"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scoringService_1 = require("../services/scoringService");
function runTests() {
    console.log('--- Running QuizArena Scoring Service Unit Tests ---');
    let passed = 0;
    let failed = 0;
    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        }
        else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    }
    // Test 1: Immediate correct answer (0ms) on 20s limit -> 150 points (100 base + 50 speed)
    const t1 = scoringService_1.ScoringService.calculateScore(true, 20, 0);
    assert(t1.totalPoints === 150, `Immediate correct answer gives 150 points (got ${t1.totalPoints})`);
    assert(t1.basePoints === 100, `Base points is 100 (got ${t1.basePoints})`);
    assert(t1.speedBonus === 50, `Speed bonus is 50 (got ${t1.speedBonus})`);
    // Test 2: Half-time correct answer (10s = 10000ms) on 20s limit -> 125 points
    const t2 = scoringService_1.ScoringService.calculateScore(true, 20, 10000);
    assert(t2.totalPoints === 125, `Half-time answer gives 125 points (got ${t2.totalPoints})`);
    assert(t2.speedBonus === 25, `Half-time speed bonus is 25 (got ${t2.speedBonus})`);
    // Test 3: Last-second correct answer (20s) on 20s limit -> 100 points
    const t3 = scoringService_1.ScoringService.calculateScore(true, 20, 20000);
    assert(t3.totalPoints === 100, `Last-second answer gives 100 points (got ${t3.totalPoints})`);
    assert(t3.speedBonus === 0, `Last-second speed bonus is 0 (got ${t3.speedBonus})`);
    // Test 4: Incorrect answer regardless of speed -> 0 points
    const t4 = scoringService_1.ScoringService.calculateScore(false, 20, 1500);
    assert(t4.totalPoints === 0, `Incorrect fast answer gives 0 points (got ${t4.totalPoints})`);
    assert(!t4.isCorrect, `isCorrect flag is false`);
    // Test 5: Overtime clamp (25s on 20s limit) -> 100 points (speed bonus clamped to 0)
    const t5 = scoringService_1.ScoringService.calculateScore(true, 20, 25000);
    assert(t5.totalPoints === 100, `Overtime correct answer clamps speed bonus to 0, gives 100 points (got ${t5.totalPoints})`);
    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}
runTests();
