import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { Subject } from '../server/src/models/Subject.js';
import { Source } from '../server/src/models/Source.js';
import { Concept } from '../server/src/models/Concept.js';
import { Question } from '../server/src/models/Question.js';
import { Review } from '../server/src/models/Review.js';
import { createContentHash } from '../server/src/utils/hash.js';
import { FSRSService } from '../server/src/services/fsrs.service.js';

async function seed() {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  console.log('[Seed] Clearing existing demo data...');
  await Review.deleteMany({});
  await Question.deleteMany({});
  await Concept.deleteMany({});
  await Source.deleteMany({});
  await Subject.deleteMany({});

  console.log('[Seed] Creating Subjects...');
  const sysDesign = await Subject.create({
    name: 'System Design',
    description: 'Distributed systems, high availability, database scaling, and consensus algorithms.',
  });

  const nodePerf = await Subject.create({
    name: 'Node.js & Concurrency',
    description: 'Event loop mechanics, asynchronous I/O, backpressure, and worker threads.',
  });

  console.log('[Seed] Creating Sources...');
  const src1Content = `# System Design Primitives
A comprehensive breakdown of load balancing, consistent hashing, caching, CAP theorem, and sharding.`;
  const src1 = await Source.create({
    subjectId: sysDesign._id,
    title: 'Foundations of Distributed Systems',
    type: 'notes',
    contentHash: createContentHash(src1Content),
    rawContent: src1Content,
    fileReference: 'notes/sys-design-foundations.md',
  });

  const src2Content = `# Concurrency in Node.js
Deep dive into libuv, thread pools, and stream backpressure.`;
  const src2 = await Source.create({
    subjectId: nodePerf._id,
    title: 'Node.js Internals Guide',
    type: 'notes',
    contentHash: createContentHash(src2Content),
    rawContent: src2Content,
    fileReference: 'notes/nodejs-internals.md',
  });

  console.log('[Seed] Creating Concepts for System Design...');
  const cLoadBalancing = await Concept.create({
    subjectId: sysDesign._id,
    title: 'Load Balancing',
    slug: 'load-balancing',
    explanation: 'Distributes incoming network or application traffic across multiple backend servers to prevent overload, maximize throughput, and eliminate single points of failure.',
    importance: 'high',
    difficulty: 'medium',
    practicalExample: 'Using NGINX or AWS ALB to distribute HTTP requests across auto-scaled ECS containers with health checks.',
    commonMistakes: ['Ignoring session persistence (sticky sessions) when state is stored locally on nodes.'],
    prerequisites: [],
    relatedConcepts: ['consistent-hashing', 'reverse-proxy'],
    sourceIds: [src1._id],
  });

  const cConsistentHashing = await Concept.create({
    subjectId: sysDesign._id,
    title: 'Consistent Hashing',
    slug: 'consistent-hashing',
    explanation: 'A hashing technique that maps keys and nodes to a circular hash ring, ensuring only K/N keys must be remapped when a node joins or leaves.',
    importance: 'high',
    difficulty: 'hard',
    practicalExample: 'Used in DynamoDB and Apache Cassandra partition rings to dynamically scale cluster storage without massive reshuffling.',
    commonMistakes: ['Not using virtual nodes (vnodes), causing non-uniform key distribution (hot spots).'],
    prerequisites: ['load-balancing'],
    relatedConcepts: ['database-sharding', 'distributed-caching'],
    sourceIds: [src1._id],
  });

  const cDistributedCaching = await Concept.create({
    subjectId: sysDesign._id,
    title: 'Distributed Caching',
    slug: 'distributed-caching',
    explanation: 'An in-memory data store shared across multiple server processes to serve read-heavy workloads with sub-millisecond latencies.',
    importance: 'high',
    difficulty: 'medium',
    practicalExample: 'Redis cluster deployed in front of PostgreSQL to cache serialized session profiles with a 15-minute TTL.',
    commonMistakes: ['Forgetting cache invalidation (dogpiling / thundering herd) when keys expire.'],
    prerequisites: ['load-balancing'],
    relatedConcepts: ['consistent-hashing', 'cap-theorem'],
    sourceIds: [src1._id],
  });

  const cCapTheorem = await Concept.create({
    subjectId: sysDesign._id,
    title: 'CAP Theorem',
    slug: 'cap-theorem',
    explanation: 'States that any distributed data store can only simultaneously guarantee at most two out of Consistency, Availability, and Partition Tolerance.',
    importance: 'high',
    difficulty: 'hard',
    practicalExample: 'Choosing between Spanner (CP with TrueTime) vs Dynamo (AP with eventual consistency) during network splits.',
    commonMistakes: ['Assuming Partition Tolerance is optional in modern networks; networks partition inevitably.'],
    prerequisites: ['consistent-hashing'],
    relatedConcepts: ['database-sharding'],
    sourceIds: [src1._id],
  });

  const cSharding = await Concept.create({
    subjectId: sysDesign._id,
    title: 'Database Sharding',
    slug: 'database-sharding',
    explanation: 'Horizontal partitioning of a database table across distinct database servers or physical disks based on a shard key.',
    importance: 'high',
    difficulty: 'hard',
    practicalExample: 'Partitioning user accounts by tenant_id across 16 Postgres instances to support 50M enterprise users.',
    commonMistakes: ['Choosing a shard key with low cardinality or temporal bias, leading to unbalanced hot partitions.'],
    prerequisites: ['consistent-hashing', 'cap-theorem'],
    relatedConcepts: ['distributed-caching'],
    sourceIds: [src1._id],
  });

  console.log('[Seed] Creating Concepts for Node.js...');
  const cEventLoop = await Concept.create({
    subjectId: nodePerf._id,
    title: 'Node.js Event Loop',
    slug: 'nodejs-event-loop',
    explanation: 'A single-threaded execution model orchestrating phases (timers, pending callbacks, idle/prepare, poll, check, close) powered by libuv.',
    importance: 'high',
    difficulty: 'medium',
    practicalExample: 'Using process.nextTick() vs setImmediate() to schedule microtasks before the poll phase.',
    commonMistakes: ['Running synchronous CPU-heavy algorithms (e.g. JSON.parse on 100MB files) blocking all concurrent I/O.'],
    prerequisites: [],
    relatedConcepts: ['backpressure', 'worker-threads'],
    sourceIds: [src2._id],
  });

  const cBackpressure = await Concept.create({
    subjectId: nodePerf._id,
    title: 'Stream Backpressure',
    slug: 'stream-backpressure',
    explanation: 'A flow-control mechanism signaling a fast data producer to pause when a slow consumer buffer is full, preventing memory exhaustion.',
    importance: 'medium',
    difficulty: 'hard',
    practicalExample: 'Piping a 5GB file read stream to an HTTP response using stream.pipe() to maintain constant 20MB RAM usage.',
    commonMistakes: ['Ignoring the boolean return of stream.write() and not listening for the "drain" event.'],
    prerequisites: ['nodejs-event-loop'],
    relatedConcepts: ['nodejs-event-loop'],
    sourceIds: [src2._id],
  });

  console.log('[Seed] Creating Questions & FSRS Schedules...');
  const concepts = [
    { c: cLoadBalancing, s: sysDesign },
    { c: cConsistentHashing, s: sysDesign },
    { c: cDistributedCaching, s: sysDesign },
    { c: cCapTheorem, s: sysDesign },
    { c: cSharding, s: sysDesign },
    { c: cEventLoop, s: nodePerf },
    { c: cBackpressure, s: nodePerf },
  ];

  const now = new Date();
  let questionCount = 0;
  let reviewCount = 0;

  for (const { c, s } of concepts) {
    // Question 1: Recall
    const card1 = FSRSService.createInitialCard();
    // Make some questions due today, some tomorrow
    const isDue = Math.random() > 0.4;
    const dueTime = new Date(now);
    if (!isDue) {
      dueTime.setDate(dueTime.getDate() + 3);
    } else {
      dueTime.setHours(dueTime.getHours() - 2);
    }
    card1.due = dueTime;

    const q1 = await Question.create({
      conceptId: c._id,
      subjectId: s._id,
      type: 'recall',
      difficulty: c.difficulty,
      front: `What is ${c.title} and what architectural problem does it solve?`,
      back: c.explanation,
      evaluationCriteria: [`Clear definition of ${c.title}`, 'Core benefit/tradeoff', 'Underlying mechanics'],
      nextReviewAt: dueTime,
      fsrsCard: card1,
    });
    questionCount++;

    // Question 2: Interview / Scenario
    const card2 = FSRSService.createInitialCard();
    card2.due = new Date(now.getTime() - 1000 * 60 * 30); // Due now
    const q2 = await Question.create({
      conceptId: c._id,
      subjectId: s._id,
      type: 'interview',
      difficulty: 'hard',
      front: `Interview Question: How does ${c.title} fail in high-scale production systems, and how do you mitigate it?`,
      back: `Failure modes involve hot spots, latency spikes, or consistency partitions. Mitigation: ${(c.commonMistakes && c.commonMistakes[0]) || 'defensive rate limiting'}. Practical reference: ${c.practicalExample}`,
      evaluationCriteria: ['Identifies real failure scenarios', 'Actionable mitigation strategies', 'Realistic architecture considerations'],
      nextReviewAt: card2.due,
      fsrsCard: card2,
    });
    questionCount++;

    // Seed some reviews
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 2);
    await Review.create({
      questionId: q1._id,
      conceptId: c._id,
      subjectId: s._id,
      rating: 3,
      userAnswer: `${c.title} manages workload stability in production environments.`,
      evaluation: 'Good grasp of high-level intuition.',
      reviewedAt: prevDate,
      nextReviewAt: dueTime,
      fsrsState: { reps: 1, stability: 2.5, difficulty: 4.8 },
      elapsedMs: 8400,
    });
    reviewCount++;
  }

  console.log(`\n======================================================`);
  console.log(`🌱 SEEDING COMPLETE`);
  console.log(`======================================================`);
  console.log(`Subjects:   ${await Subject.countDocuments()}`);
  console.log(`Sources:    ${await Source.countDocuments()}`);
  console.log(`Concepts:   ${await Concept.countDocuments()}`);
  console.log(`Questions:  ${questionCount}`);
  console.log(`Reviews:    ${reviewCount}`);
  console.log(`======================================================\n`);

  await disconnectDB();
}

seed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});

