import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { BackupService } from '../server/src/services/backup.service.js';

async function main() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let clearExisting = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      inputPath = args[++i];
    } else if (args[i] === '--no-clear') {
      clearExisting = false;
    }
  }

  if (!inputPath && args[0] && !args[0].startsWith('--')) {
    inputPath = args[0];
  }

  if (!inputPath) {
    // Look for most recent file in data/
    const dataDir = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort().reverse();
      if (files.length > 0) {
        inputPath = path.join(dataDir, files[0]);
      }
    }
  }

  if (!inputPath) {
    console.error('Usage: tsx scripts/restore-backup.ts --file <path-to-backup.json> [--no-clear]');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: Backup file not found at ${resolved}`);
    process.exit(1);
  }

  console.log(`[Restore] Reading backup file from: ${resolved}`);
  const data = JSON.parse(fs.readFileSync(resolved, 'utf-8'));

  console.log('[Restore] Connecting to database...');
  await connectDB();

  console.log(`[Restore] Restoring data (clearExisting: ${clearExisting})...`);
  const result = await BackupService.restoreBackup(data, clearExisting);

  console.log(`\n======================================================`);
  console.log(`♻️ BACKUP RESTORE COMPLETE`);
  console.log(`======================================================`);
  console.log(`Restored At:  ${result.restoredAt}`);
  console.log(`Subjects:     ${result.counts.subjects}`);
  console.log(`Sources:      ${result.counts.sources}`);
  console.log(`Concepts:     ${result.counts.concepts}`);
  console.log(`Questions:    ${result.counts.questions}`);
  console.log(`Reviews:      ${result.counts.reviews}`);
  console.log(`======================================================\n`);

  await disconnectDB();
}

main().catch(err => {
  console.error('[Restore Error]:', err);
  process.exit(1);
});

