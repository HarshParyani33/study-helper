import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudyScheduleItem extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  dayNumber: number; // 1..totalDays
  date?: string; // YYYY-MM-DD
  order: number;
  activityId: string; // 'react' | 'lunch' | 'transition-1' | 'dsa' | 'transition-2' | 'afternoon' | 'job-search' | 'bigg-boss' | 'valorant' | custom string
  name: string;
  activityType: 'react' | 'break' | 'transition' | 'dsa' | 'afternoon' | 'system-design' | 'project-learning' | 'job-search' | 'personal' | 'custom';
  targetProfile: 'both' | 'you' | 'girlfriend';
  videoUrl?: string;
  videoRuntimeMinutes?: number;
  extraBufferMinutes?: number;
  durationMinutes: number; // calculated or manual
  isFlexible: boolean; // e.g. job-search
  isScored: boolean;
  maxPoints: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudyScheduleItemSchema = new Schema<IStudyScheduleItem>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    dayNumber: { type: Number, required: true, index: true },
    date: { type: String, index: true },
    order: { type: Number, required: true, default: 0 },
    activityId: { type: String, required: true },
    name: { type: String, required: true },
    activityType: {
      type: String,
      enum: ['react', 'break', 'transition', 'dsa', 'afternoon', 'system-design', 'project-learning', 'job-search', 'personal', 'custom'],
      default: 'custom',
    },
    targetProfile: {
      type: String,
      enum: ['both', 'you', 'girlfriend'],
      default: 'both',
    },
    videoUrl: { type: String, default: '' },
    videoRuntimeMinutes: { type: Number, default: 0 },
    extraBufferMinutes: { type: Number, default: 0 },
    durationMinutes: { type: Number, required: true, default: 60 },
    isFlexible: { type: Boolean, default: false },
    isScored: { type: Boolean, default: false },
    maxPoints: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

StudyScheduleItemSchema.index({ planId: 1, dayNumber: 1, order: 1 });

export const StudyScheduleItem = mongoose.model<IStudyScheduleItem>(
  'StudyScheduleItem',
  StudyScheduleItemSchema
);
