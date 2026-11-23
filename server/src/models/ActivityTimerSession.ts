import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActivityTimerSession extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  profileId: 'you' | 'girlfriend';
  activityId: string; // 'react' | 'dsa' | 'afternoon' | 'job-search' | custom string
  activityName: string;
  status: 'idle' | 'running' | 'paused' | 'completed';
  startedAt?: Date;
  pausedAt?: Date;
  totalPausedMs: number;
  finishedAt?: Date;
  actualDurationSeconds: number;
  actualDurationFormatted: string; // e.g. "1h 33m"
  createdAt: Date;
  updatedAt: Date;
}

const ActivityTimerSessionSchema = new Schema<IActivityTimerSession>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    date: { type: String, required: true, index: true },
    profileId: { type: String, enum: ['you', 'girlfriend'], required: true, index: true },
    activityId: { type: String, required: true, index: true },
    activityName: { type: String, required: true },
    status: {
      type: String,
      enum: ['idle', 'running', 'paused', 'completed'],
      default: 'idle',
      index: true,
    },
    startedAt: { type: Date },
    pausedAt: { type: Date },
    totalPausedMs: { type: Number, default: 0 },
    finishedAt: { type: Date },
    actualDurationSeconds: { type: Number, default: 0 },
    actualDurationFormatted: { type: String, default: '—' },
  },
  {
    timestamps: true,
  }
);

ActivityTimerSessionSchema.index({ planId: 1, date: 1, profileId: 1, activityId: 1 }, { unique: true });
ActivityTimerSessionSchema.index({ profileId: 1, status: 1 });

export const ActivityTimerSession = mongoose.model<IActivityTimerSession>(
  'ActivityTimerSession',
  ActivityTimerSessionSchema
);
