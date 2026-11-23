import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { BackupService } from '../server/src/services/backup.service.js';

async function main() {
  const args = process.argv.slice(2);
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  if (!outputPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    outputPath = path.resolve(process.cwd(), 'data', `backup-${timestamp}.json`);
  } else {
    outputPath = path.resolve(process.cwd(), outputPath);
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('[Backup] Connecting to database...');
  await connectDB();

  console.log('[Backup] Exporting collections...');
  const backup = await BackupService.exportBackup();

  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf-8');

  console.log(`\n======================================================`);
  console.log(`💾 BACKUP EXPORT COMPLETE`);
  console.log(`======================================================`);
  console.log(`File:       ${outputPath}`);
  console.log(`Subjects:   ${backup.counts.subjects}`);
  console.log(`Sources:    ${backup.counts.sources}`);
  console.log(`Concepts:   ${backup.counts.concepts}`);
  console.log(`Questions:  ${backup.counts.questions}`);
  console.log(`Reviews:    ${backup.counts.reviews}`);
  console.log(`======================================================\n`);

  await disconnectDB();
}

main().catch(err => {
  console.error('[Backup Error]:', err);
  process.exit(1);
});

