import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { env } from './env.js';

let mongod: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log(`[DB] Attempting connection to configured MongoDB URI...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`[DB] Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err: any) {
      console.warn(`[DB] Failed to connect to ${uri}: ${err.message}. Initializing embedded MongoDB server fallback...`);
    }
  }

  // Automatic embedded MongoDB instance with persistent on-disk storage (WiredTiger)
  console.log('[DB] Starting embedded MongoDB instance with persistent on-disk storage...');
  const dbPath = path.resolve(process.cwd(), 'data/embedded-db');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  const memoryUri = mongod.getUri();
  const conn = await mongoose.connect(memoryUri);
  console.log(`[DB] Connected to persistent embedded MongoDB at: ${memoryUri}`);
  return conn;
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
    console.log('[DB] Disconnected from database.');
  } catch (err: any) {
    console.error('[DB] Error during disconnection:', err.message);
  }
}

