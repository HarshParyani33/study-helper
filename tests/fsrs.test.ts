import { describe, it, expect } from 'vitest';
import { FSRSService, Rating, State } from '../server/src/services/fsrs.service.js';

describe('FSRS 4.5 Algorithm Engine', () => {
  it('should initialize a new empty card with default parameters', () => {
    const card = FSRSService.createInitialCard();
    expect(card).toBeDefined();
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.state).toBe(State.New); // 0: New
    expect(card.due).toBeInstanceOf(Date);
  });

  it('should calculate next review date for Rating.Good (3)', () => {
    const card = FSRSService.createInitialCard();
    const result = FSRSService.schedule(card, 3, new Date());

    expect(result.updatedCard.reps).toBe(1);
    expect(result.updatedCard.stability).toBeGreaterThan(0);
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(result.fsrsLog.rating).toBe(3);
  });

  it('should handle Rating.Again (1) for learned cards by incrementing lapses', () => {
    const card = FSRSService.createInitialCard();
    // Simulate a card already in Review state
    card.state = State.Review;
    card.stability = 10;
    card.difficulty = 5;
    card.reps = 3;

    const result = FSRSService.schedule(card, 1, new Date());

    expect(result.updatedCard.lapses).toBeGreaterThanOrEqual(1);
    expect(result.fsrsLog.rating).toBe(1);
  });

  it('should give higher stability for Rating.Easy (4) compared to Rating.Hard (2)', () => {
    const card = FSRSService.createInitialCard();
    const hardResult = FSRSService.schedule(card, 2, new Date());
    const easyResult = FSRSService.schedule(card, 4, new Date());

    expect(easyResult.updatedCard.stability).toBeGreaterThan(hardResult.updatedCard.stability);
  });
});
