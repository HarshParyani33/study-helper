import crypto from 'crypto';

export function createContentHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

