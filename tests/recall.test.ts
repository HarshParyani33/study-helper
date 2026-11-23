import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Subject } from '../server/src/models/Subject.js';
import { Concept } from '../server/src/models/Concept.js';
import { Question } from '../server/src/models/Question.js';
import { Review } from '../server/src/models/Review.js';
import { RecallService } from '../server/src/services/recall.service.js';
import { FSRSService } from '../server/src/services/fsrs.service.js';

describe('Daily Recall & FSRS Workflow', () => {
  let subject: any;
  let concept: any;
  let question: any;

  beforeAll(async () => {
    await setupTestDB();
    await clearTestDB();

    subject = await Subject.create({ name: 'Distributed Systems' });
    concept = await Concept.create({
      subjectId: subject._id,
      title: 'Raft Consensus',
      slug: 'raft-consensus',
      explanation: 'Leader election, log replication, and safety guarantees.',
      importance: 'high',
      difficulty: 'hard',
    });

    const card = FSRSService.createInitialCard();
    card.due = new Date(Date.now() - 10000); // Past due

    question = await Question.create({
      conceptId: concept._id,
      subjectId: subject._id,
      type: 'recall',
      difficulty: 'hard',
      front: 'How does Raft elect a new leader when a leader heartbeat times out?',
      back: 'Follower transitions to Candidate, increments term, votes for itself, and sends RequestVote RPCs.',
      evaluationCriteria: ['Candidate state transition', 'Term increment', 'RequestVote RPCs', 'Majority vote quorum'],
      nextReviewAt: card.due,
      fsrsCard: card,
    });
  }, 45000);

  afterAll(async () => {
    await clearTestDB();
  });

  it('should fetch questions currently due for review', async () => {
    const dueQuestions = await RecallService.getDueQuestions(subject._id.toString());
    expect(dueQuestions.length).toBeGreaterThanOrEqual(1);
    expect(dueQuestions[0]._id.toString()).toBe(question._id.toString());
  });

  it('should evaluate user free-text answer accurately', async () => {
    const evaluation = await RecallService.evaluateAnswer(
      question._id.toString(),
      'When the heartbeat times out, the node transitions to candidate, increments the current term, votes for itself, and broadcasts RequestVote RPCs.'
    );

    expect(evaluation.score).toBeGreaterThanOrEqual(60);
    expect(evaluation.suggestedRating).toBeGreaterThanOrEqual(3);
    expect(evaluation.feedback).toBeDefined();
  });

  it('should submit review, update FSRS schedule, and create audit log', async () => {
    const result = await RecallService.submitReview(
      question._id.toString(),
      3, // Good
      'Candidate votes for itself and requests votes from peers',
      'Solid intuition',
      4500
    );

    expect(result.success).toBe(true);
    expect(result.reps).toBe(1);
    expect(new Date(result.nextReviewAt).getTime()).toBeGreaterThan(Date.now());

    // Verify Review record in database
    const reviewRecord = await Review.findById(result.reviewId);
    expect(reviewRecord).toBeDefined();
    expect(reviewRecord?.rating).toBe(3);
    expect(reviewRecord?.elapsedMs).toBe(4500);

    // Verify Question nextReviewAt was updated in DB
    const updatedQ = await Question.findById(question._id);
    expect(new Date(updatedQ!.nextReviewAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('should provide Surprise Recall questions across subjects', async () => {
    const surprise = await RecallService.getSurpriseRecall(5);
    expect(Array.isArray(surprise)).toBe(true);
    expect(surprise.length).toBeGreaterThan(0);
  });
});
