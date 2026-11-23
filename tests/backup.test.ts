import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Subject } from '../server/src/models/Subject.js';
import { Concept } from '../server/src/models/Concept.js';
import { Question } from '../server/src/models/Question.js';
import { Review } from '../server/src/models/Review.js';
import { BackupService } from '../server/src/services/backup.service.js';

describe('Database Backup & Restore', () => {
  beforeAll(async () => {
    await setupTestDB();
    await clearTestDB();
  }, 45000);

  afterAll(async () => {
    await clearTestDB();
  });

  it('should export complete database snapshot', async () => {
    const s = await Subject.create({ name: 'Backup Test Subject' });
    const c = await Concept.create({
      subjectId: s._id,
      title: 'Backup Concept',
      slug: 'backup-concept',
      explanation: 'Verifying export completeness.',
    });
    const q = await Question.create({
      conceptId: c._id,
      subjectId: s._id,
      front: 'Backup Q?',
      back: 'Backup A.',
    });
    await Review.create({
      questionId: q._id,
      conceptId: c._id,
      subjectId: s._id,
      rating: 3,
      nextReviewAt: new Date(),
      fsrsState: { reps: 1 },
    });

    const backup = await BackupService.exportBackup();
    expect(backup.version).toBe('1.0.0');
    expect(backup.counts.subjects).toBeGreaterThanOrEqual(1);
    expect(backup.counts.concepts).toBeGreaterThanOrEqual(1);
    expect(backup.counts.questions).toBeGreaterThanOrEqual(1);
    expect(backup.counts.reviews).toBeGreaterThanOrEqual(1);
  });

  it('should restore into database and match original record counts', async () => {
    const backup = await BackupService.exportBackup();

    // Clear all collections
    await Review.deleteMany({});
    await Question.deleteMany({});
    await Concept.deleteMany({});
    await Subject.deleteMany({});

    expect(await Subject.countDocuments()).toBe(0);
    expect(await Concept.countDocuments()).toBe(0);

    // Restore from backup
    const result = await BackupService.restoreBackup(backup, true);
    expect(result.counts.subjects).toBe(backup.counts.subjects);
    expect(result.counts.concepts).toBe(backup.counts.concepts);
    expect(result.counts.questions).toBe(backup.counts.questions);
    expect(result.counts.reviews).toBe(backup.counts.reviews);

    // Verify restored records can be queried
    const restoredConcept = await Concept.findOne({ slug: 'backup-concept' });
    expect(restoredConcept).toBeDefined();
    expect(restoredConcept?.title).toBe('Backup Concept');
  });
});
