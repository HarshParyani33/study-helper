import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server folder
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // Fallback to current folder .env

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  LLM_PROVIDER: process.env.LLM_PROVIDER || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  FSRS_REQUEST_RETENTION: parseFloat(process.env.FSRS_REQUEST_RETENTION || '0.9'),
  FSRS_MAXIMUM_INTERVAL: parseInt(process.env.FSRS_MAXIMUM_INTERVAL || '36500', 10),
};

