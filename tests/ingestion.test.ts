import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { IngestionService } from '../server/src/services/ingestion.service.js';
import { Concept } from '../server/src/models/Concept.js';
import { Question } from '../server/src/models/Question.js';
import { Review } from '../server/src/models/Review.js';

beforeAll(async () => {
  await setupTestDB();
  await clearTestDB();
}, 45000);

afterAll(async () => {
  await clearTestDB();
});

describe('Knowledge Ingestion Engine', () => {
  const initialNote = `# Load Balancing
Load balancing distributes incoming traffic across a pool of backend servers to prevent overload and ensure high availability.
Example: NGINX distributing traffic.
Pitfall: Ignoring session persistence on stateful servers.`;

  it('should ingest initial notes and create subject, source, concepts, and questions', async () => {
    const report = await IngestionService.ingest({
      subjectName: 'System Design',
      sourceTitle: 'Intro to Load Balancing',
      sourceType: 'notes',
      content: initialNote,
    });

    expect(report.isDuplicateSource).toBe(false);
    expect(report.summary.conceptsCreated).toBeGreaterThanOrEqual(1);
    expect(report.summary.questionsCreated).toBeGreaterThanOrEqual(1);

    const concept = await Concept.findOne({ slug: 'load-balancing' });
    expect(concept).toBeDefined();
    expect(concept?.title).toBe('Load Balancing');
  });

  it('should be strictly IDEMPOTENT: ingesting identical material creates zero duplicates', async () => {
    const conceptCountBefore = await Concept.countDocuments();
    const questionCountBefore = await Question.countDocuments();

    const report = await IngestionService.ingest({
      subjectName: 'System Design',
      sourceTitle: 'Intro to Load Balancing',
      sourceType: 'notes',
      content: initialNote, // Exact same content
    });

    expect(report.isDuplicateSource).toBe(true);
    expect(report.summary.conceptsCreated).toBe(0);
    expect(report.summary.questionsCreated).toBe(0);

    const conceptCountAfter = await Concept.countDocuments();
    const questionCountAfter = await Question.countDocuments();

    expect(conceptCountAfter).toBe(conceptCountBefore);
    expect(questionCountAfter).toBe(questionCountBefore);
  });

  it('should ENRICH existing concepts when overlapping notes are ingested', async () => {
    const overlappingNote = `# Load Balancing
Load balancing can operate at Layer 4 (transport level, TCP/UDP) or Layer 7 (application level, HTTP/gRPC).
Example: AWS Application Load Balancer (ALB) performing path-based routing.
Pitfall: SSL termination bottleneck if hardware crypto acceleration is lacking.`;

    const report = await IngestionService.ingest({
      subjectName: 'System Design',
      sourceTitle: 'Advanced Load Balancing Patterns',
      sourceType: 'notes',
      content: overlappingNote,
    });

    expect(report.isDuplicateSource).toBe(false);
    expect(report.summary.conceptsEnriched).toBe(1);

    const enrichedConcept = await Concept.findOne({ slug: 'load-balancing' });
    expect(enrichedConcept?.explanation).toContain('Layer 4');
    expect(enrichedConcept?.commonMistakes.length).toBeGreaterThanOrEqual(2);
    expect(enrichedConcept?.sourceIds.length).toBe(2);
  });

  it('should PRESERVE existing review history during note updates', async () => {
    const concept = await Concept.findOne({ slug: 'load-balancing' });
    const question = await Question.findOne({ conceptId: concept?._id });

    // Simulate an existing review
    const review = await Review.create({
      questionId: question?._id,
      conceptId: concept?._id,
      subjectId: concept?.subjectId,
      rating: 4,
      userAnswer: 'Distributes traffic evenly',
      reviewedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 86400000),
      fsrsState: { reps: 1, stability: 3.2 },
    });

    // Ingest another update
    await IngestionService.ingest({
      subjectName: 'System Design',
      sourceTitle: 'Load Balancing Health Checks',
      sourceType: 'notes',
      content: `# Load Balancing
Active health checks periodically poll backend endpoints to detect failed nodes.`,
    });

    // Verify review still exists and is untouched
    const reviewAfter = await Review.findById(review._id);
    expect(reviewAfter).toBeDefined();
    expect(reviewAfter?.rating).toBe(4);
  });
});
