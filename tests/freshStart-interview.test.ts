import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Subject } from '../server/src/models/Subject.js';
import { Concept } from '../server/src/models/Concept.js';
import { FreshStartService } from '../server/src/services/freshStart.service.js';
import { InterviewService } from '../server/src/services/interview.service.js';

describe('Fresh Start & Interview Mode Workflows', () => {
  let subject: any;

  beforeAll(async () => {
    await setupTestDB();
    await clearTestDB();

    subject = await Subject.create({
      name: 'Cloud Architecture',
      description: 'Distributed cloud infrastructure and microservices.',
    });

    await Concept.create({
      subjectId: subject._id,
      title: 'Circuit Breaker Pattern',
      slug: 'circuit-breaker-pattern',
      explanation: 'Prevents cascading failures by tripping open when error threshold is exceeded.',
      importance: 'high',
      difficulty: 'hard',
      practicalExample: 'Netflix Hystrix / Resilience4j wrapping remote API calls.',
      commonMistakes: ['Setting timeout too high or not resetting half-open state.'],
    });

    await Concept.create({
      subjectId: subject._id,
      title: 'Bulkhead Pattern',
      slug: 'bulkhead-pattern',
      explanation: 'Isolates elements of an application into distinct pools so that if one fails, the others continue.',
      importance: 'medium',
      difficulty: 'medium',
      prerequisites: ['circuit-breaker-pattern'],
    });
  }, 45000);

  afterAll(async () => {
    await clearTestDB();
  });

  it('should generate Fresh Start recovery plan with overview, diagnostics, and stages', async () => {
    const freshStart = await FreshStartService.generate(subject._id.toString(), '45 days');

    expect(freshStart.subjectName).toBe('Cloud Architecture');
    expect(freshStart.overview).toBeDefined();
    expect(freshStart.importantConcepts.length).toBeGreaterThan(0);
    expect(freshStart.diagnosticQuestions.length).toBeGreaterThan(0);
    expect(freshStart.prioritizedRecoveryPlan.length).toBe(3);
    expect(freshStart.nextLearningSteps.length).toBeGreaterThan(0);
  });

  it('should generate Interview Mode package with questions, scenarios, and checklist', async () => {
    const interviewPrep = await InterviewService.generate(subject._id.toString(), 'senior');

    expect(interviewPrep.subjectName).toBe('Cloud Architecture');
    expect(interviewPrep.difficulty).toBe('senior');
    expect(interviewPrep.essentialConcepts.length).toBeGreaterThan(0);
    expect(interviewPrep.interviewQuestions.length).toBeGreaterThan(0);
    expect(interviewPrep.engineeringScenarios.length).toBeGreaterThan(0);
    expect(interviewPrep.commonMisconceptions.length).toBeGreaterThan(0);
    expect(interviewPrep.revisionChecklist.length).toBeGreaterThan(0);
  });
});
