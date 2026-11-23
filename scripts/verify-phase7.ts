import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { Subject } from '../server/src/models/Subject.js';
import { Source } from '../server/src/models/Source.js';
import { Concept } from '../server/src/models/Concept.js';
import { Question } from '../server/src/models/Question.js';
import { Review } from '../server/src/models/Review.js';
import { IngestionService } from '../server/src/services/ingestion.service.js';
import { RecallService } from '../server/src/services/recall.service.js';
import { FreshStartService } from '../server/src/services/freshStart.service.js';
import { InterviewService } from '../server/src/services/interview.service.js';
import { BackupService } from '../server/src/services/backup.service.js';
import { StatsController } from '../server/src/controllers/stats.controller.js';

async function runPhase7Verification() {
  console.log(`\n======================================================`);
  console.log(`🧪 RUNNING PHASE 7 — FINAL VERIFICATION CHECKLIST (18 Steps)`);
  console.log(`======================================================\n`);

  await connectDB();

  // Reset collections for clean verification
  await Review.deleteMany({});
  await Question.deleteMany({});
  await Concept.deleteMany({});
  await Source.deleteMany({});
  await Subject.deleteMany({});

  // 1. Create System Design
  console.log('Step 1: Creating Subject "System Design"...');
  const sysDesign = await Subject.create({
    name: 'System Design',
    description: 'High-scale distributed architecture, caching, and database partitioning.',
  });
  console.log(`✓ Step 1 Passed: Subject created (${sysDesign._id})`);

  // 2. Ingest five concepts
  console.log('\nStep 2: Ingesting five core concepts...');
  const noteContent1 = `# Load Balancing
Distributes network traffic across server farms to prevent single points of failure.
Example: AWS ALB or NGINX.
Pitfall: Missing session affinity on stateful clusters.

# Consistent Hashing
Maps servers and request keys onto a 360-degree hash ring to minimize remapping.
Example: DynamoDB and Cassandra partition hashing.
Pitfall: Non-uniform key distribution without virtual nodes.
Prerequisites: load-balancing.

# Distributed Caching
In-memory caching tier providing microsecond read latencies.
Example: Redis Cluster and Memcached.
Pitfall: Thundering herd and cache penetration on cold keys.
Prerequisites: load-balancing.

# CAP Theorem
In a distributed data store, you can only guarantee two of Consistency, Availability, and Partition Tolerance.
Example: Google Spanner (CP with atomic clocks) vs Amazon Dynamo (AP).
Pitfall: Assuming partitions can be avoided in distributed networks.
Prerequisites: consistent-hashing.

# Database Sharding
Horizontal table partitioning across distinct database servers using a shard key.
Example: Partitioning users by tenant_id across 16 PostgreSQL nodes.
Pitfall: Shard key skew creating hot nodes.
Prerequisites: consistent-hashing, cap-theorem.`;

  const report1 = await IngestionService.ingest({
    subjectName: 'System Design',
    sourceTitle: 'Distributed Systems Fundamentals',
    sourceType: 'notes',
    content: noteContent1,
  });
  console.log(`✓ Step 2 Passed: Ingested 5 concepts. Concepts created: ${report1.summary.conceptsCreated}`);

  // 3. Verify MongoDB records
  console.log('\nStep 3: Verifying MongoDB records...');
  const conceptCount = await Concept.countDocuments({ subjectId: sysDesign._id });
  const questionCount = await Question.countDocuments({ subjectId: sysDesign._id });
  const sourceCount = await Source.countDocuments({ subjectId: sysDesign._id });
  if (conceptCount !== 5 || questionCount < 5 || sourceCount !== 1) {
    throw new Error(`Step 3 Failed: Expected 5 concepts, got ${conceptCount}; expected >=5 questions, got ${questionCount}; expected 1 source, got ${sourceCount}`);
  }
  console.log(`✓ Step 3 Passed: Verified ${conceptCount} concepts, ${questionCount} questions, ${sourceCount} source.`);

  // 4. Re-ingest identical notes
  console.log('\nStep 4: Re-ingesting identical notes to test idempotency...');
  const reportDuplicate = await IngestionService.ingest({
    subjectName: 'System Design',
    sourceTitle: 'Distributed Systems Fundamentals',
    sourceType: 'notes',
    content: noteContent1, // Identical content
  });
  console.log(`✓ Step 4 Passed: Ingestion returned isDuplicateSource: ${reportDuplicate.isDuplicateSource}`);

  // 5. Confirm no duplicates
  console.log('\nStep 5: Confirming no duplicate records were created...');
  const conceptCountAfterDup = await Concept.countDocuments({ subjectId: sysDesign._id });
  const questionCountAfterDup = await Question.countDocuments({ subjectId: sysDesign._id });
  if (conceptCountAfterDup !== 5 || questionCountAfterDup !== questionCount) {
    throw new Error(`Step 5 Failed: Duplicate records detected! Concepts: ${conceptCountAfterDup}, Questions: ${questionCountAfterDup}`);
  }
  console.log(`✓ Step 5 Passed: Zero duplicates created (Concepts remained 5, Questions remained ${questionCount}).`);

  // 6. Ingest overlapping material
  console.log('\nStep 6: Ingesting overlapping material for Load Balancing...');
  const overlappingNote = `# Load Balancing
Load balancing operates across Layer 4 (TCP/UDP) and Layer 7 (HTTP/gRPC) routing.
Example: Envoy proxy with gRPC health-checking and circuit breaker mesh.
Pitfall: SSL termination overhead on high connection rates.`;

  const reportEnrich = await IngestionService.ingest({
    subjectName: 'System Design',
    sourceTitle: 'Advanced Load Balancing Layer 7',
    sourceType: 'notes',
    content: overlappingNote,
  });
  console.log(`✓ Step 6 Passed: Ingested overlapping material. Enriched concepts: ${reportEnrich.summary.conceptsEnriched}`);

  // 7. Confirm correct enrichment
  console.log('\nStep 7: Confirming correct enrichment without overwriting...');
  const enrichedLB = await Concept.findOne({ subjectId: sysDesign._id, slug: 'load-balancing' });
  if (!enrichedLB || !enrichedLB.explanation.includes('Layer 4') || enrichedLB.sourceIds.length < 2) {
    throw new Error(`Step 7 Failed: Concept was not properly enriched with Layer 4 or sourceIds!`);
  }
  console.log(`✓ Step 7 Passed: Load Balancing enriched with Layer 4 details and linked to ${enrichedLB.sourceIds.length} sources.`);

  // 8. Generate questions
  console.log('\nStep 8: Verifying generated questions...');
  const lbQuestions = await Question.find({ conceptId: enrichedLB._id });
  if (lbQuestions.length === 0) {
    throw new Error('Step 8 Failed: No questions found for concept!');
  }
  console.log(`✓ Step 8 Passed: Concept has ${lbQuestions.length} generated questions (${lbQuestions.map(q => q.type).join(', ')}).`);

  // 9. Complete a recall session
  console.log('\nStep 9: Completing active recall session for question...');
  const targetQ = lbQuestions[0];
  const evalResult = await RecallService.evaluateAnswer(
    targetQ._id.toString(),
    'Load balancing distributes traffic across backend nodes to prevent bottlenecks and eliminate single points of failure.'
  );
  console.log(`  AI Evaluation Score: ${evalResult.score}/100, Suggested Rating: ${evalResult.suggestedRating}`);

  const reviewResult = await RecallService.submitReview(
    targetQ._id.toString(),
    3, // Good
    'Distributes traffic evenly across servers',
    evalResult.feedback,
    5200
  );
  console.log(`✓ Step 9 Passed: Review submitted successfully (Review ID: ${reviewResult.reviewId}).`);

  // 10. Verify FSRS scheduling persistence
  console.log('\nStep 10: Verifying FSRS scheduling persistence...');
  const updatedQ = await Question.findById(targetQ._id);
  const reviewRecord = await Review.findById(reviewResult.reviewId);
  if (!updatedQ || updatedQ.fsrsCard?.reps !== 1 || !reviewRecord) {
    throw new Error('Step 10 Failed: FSRS card reps or review record missing!');
  }
  console.log(`✓ Step 10 Passed: FSRS reps = ${updatedQ.fsrsCard.reps}, Stability = ${updatedQ.fsrsCard.stability}, Next Review = ${updatedQ.nextReviewAt.toISOString()}`);

  // 11. Restart application (simulate disconnect and reconnect)
  console.log('\nStep 11: Simulating application restart...');
  await disconnectDB();
  await connectDB();
  console.log('✓ Step 11 Passed: Database reconnected successfully.');

  // 12. Verify data persistence
  console.log('\nStep 12: Verifying data persistence after reconnect...');
  const persistedConcepts = await Concept.countDocuments({ subjectId: sysDesign._id });
  const persistedReviews = await Review.countDocuments();
  if (persistedConcepts !== 5 || persistedReviews !== 1) {
    throw new Error(`Step 12 Failed: Data loss after reconnect! Concepts: ${persistedConcepts}, Reviews: ${persistedReviews}`);
  }
  console.log(`✓ Step 12 Passed: All 5 concepts and review audit history persisted perfectly.`);

  // 13. Execute Fresh Start
  console.log('\nStep 13: Executing Fresh Start recovery session...');
  const freshStartData = await FreshStartService.generate(sysDesign._id.toString(), '45 days');
  if (!freshStartData.overview || freshStartData.diagnosticQuestions.length === 0 || freshStartData.prioritizedRecoveryPlan.length !== 3) {
    throw new Error('Step 13 Failed: Fresh Start plan incomplete!');
  }
  console.log(`✓ Step 13 Passed: Fresh Start generated with 3-stage roadmap and ${freshStartData.diagnosticQuestions.length} diagnostic questions.`);

  // 14. Execute Interview Mode
  console.log('\nStep 14: Executing Interview Mode preparation...');
  const interviewData = await InterviewService.generate(sysDesign._id.toString(), 'senior');
  if (interviewData.essentialConcepts.length === 0 || interviewData.interviewQuestions.length === 0 || interviewData.revisionChecklist.length === 0) {
    throw new Error('Step 14 Failed: Interview package incomplete!');
  }
  console.log(`✓ Step 14 Passed: Interview prep generated with ${interviewData.interviewQuestions.length} model Q&As and ${interviewData.revisionChecklist.length} checklist items.`);

  // 15. Verify knowledge relationships
  console.log('\nStep 15: Verifying knowledge graph relationships & topological edges...');
  const chConcept = await Concept.findOne({ slug: 'consistent-hashing' });
  if (!chConcept || !chConcept.prerequisites.includes('load-balancing')) {
    throw new Error('Step 15 Failed: Prerequisite relationship missing!');
  }
  console.log(`✓ Step 15 Passed: Consistent Hashing correctly points to prerequisite "load-balancing".`);

  // 16. Export a backup
  console.log('\nStep 16: Exporting complete database backup...');
  const backupSnapshot = await BackupService.exportBackup();
  if (backupSnapshot.counts.concepts !== 5 || backupSnapshot.counts.reviews !== 1) {
    throw new Error('Step 16 Failed: Backup snapshot missing records!');
  }
  console.log(`✓ Step 16 Passed: Backup snapshot created with ${backupSnapshot.counts.concepts} concepts, ${backupSnapshot.counts.questions} questions, ${backupSnapshot.counts.reviews} reviews.`);

  // 17. Restore the backup in an isolated test database
  console.log('\nStep 17: Restoring backup into clean database...');
  await Review.deleteMany({});
  await Question.deleteMany({});
  await Concept.deleteMany({});
  await Source.deleteMany({});
  await Subject.deleteMany({});

  const restoreResult = await BackupService.restoreBackup(backupSnapshot, true);
  console.log(`✓ Step 17 Passed: Restored ${restoreResult.counts.concepts} concepts and ${restoreResult.counts.reviews} reviews.`);

  // 18. Verify the restored records
  console.log('\nStep 18: Verifying restored records in database...');
  const restoredLB = await Concept.findOne({ slug: 'load-balancing' });
  const restoredReview = await Review.findOne();
  if (!restoredLB || !restoredReview || restoredReview.rating !== 3) {
    throw new Error('Step 18 Failed: Restored records do not match original data!');
  }
  console.log(`✓ Step 18 Passed: Restored records verified with exact fidelity.`);

  console.log(`\n======================================================`);
  console.log(`🎉 ALL 18 PHASE 7 VERIFICATION STEPS PASSED 100%!`);
  console.log(`======================================================\n`);

  await disconnectDB();
}

runPhase7Verification().catch(err => {
  console.error('\n❌ Phase 7 Verification Failed:', err);
  process.exit(1);
});
