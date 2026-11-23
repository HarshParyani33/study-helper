import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { IngestionService } from '../server/src/services/ingestion.service.js';

async function main() {
  const args = process.argv.slice(2);
  let filePath = '';
  let subjectName = 'System Design';
  let sourceTitle = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[++i];
    } else if (args[i] === '--subject' && args[i + 1]) {
      subjectName = args[++i];
    } else if (args[i] === '--title' && args[i + 1]) {
      sourceTitle = args[++i];
    }
  }

  if (!filePath && args[0] && !args[0].startsWith('--')) {
    filePath = args[0];
  }

  if (!filePath) {
    console.error('Usage: tsx scripts/import-knowledge.ts --file <path-to-file> [--subject <subject>] [--title <title>]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  if (!sourceTitle) {
    sourceTitle = path.basename(resolvedPath, path.extname(resolvedPath));
  }

  console.log(`[Import] Connecting to database...`);
  await connectDB();

  console.log(`[Import] Ingesting "${sourceTitle}" into subject "${subjectName}"...`);
  const report = await IngestionService.ingest({
    subjectName,
    sourceTitle,
    sourceType: resolvedPath.endsWith('.md') ? 'notes' : 'notes',
    content,
    fileReference: resolvedPath,
  });

  console.log(`\n======================================================`);
  console.log(`📋 INGESTION REPORT`);
  console.log(`======================================================`);
  console.log(`Subject:             ${report.subject.name} (${report.subject.id})`);
  console.log(`Source:              ${report.source.title} (${report.source.type})`);
  console.log(`Content Hash:        ${report.source.contentHash.substring(0, 16)}...`);
  console.log(`Duplicate Source:    ${report.isDuplicateSource}`);
  console.log(`Concepts Created:    ${report.summary.conceptsCreated}`);
  console.log(`Concepts Enriched:   ${report.summary.conceptsEnriched}`);
  console.log(`Questions Created:   ${report.summary.questionsCreated}`);
  console.log(`Total Concepts:      ${report.summary.totalConceptsInSubject}`);
  if (report.details.newConcepts.length) {
    console.log(`New Concepts:        ${report.details.newConcepts.join(', ')}`);
  }
  if (report.details.enrichedConcepts.length) {
    console.log(`Enriched Concepts:   ${report.details.enrichedConcepts.join(', ')}`);
  }
  console.log(`======================================================\n`);

  await disconnectDB();
}

main().catch(err => {
  console.error('[Import Error]:', err);
  process.exit(1);
});

