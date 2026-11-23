import { connectDB, disconnectDB } from '../server/src/config/db.js';
import mongoose from '../server/node_modules/mongoose/index.js';

export async function setupTestDB() {
  await connectDB();
}

export async function teardownTestDB() {
  await disconnectDB();
}

export async function clearTestDB() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}
