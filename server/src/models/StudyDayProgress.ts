import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudyDayProgress extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  profileId: string; // 'you' | 'girlfriend'
  reactCompleted: boolean;
  dsaCompleted: boolean;
  afternoonCompleted: boolean;
  jobSearchCompleted: boolean;
  jobSearchDetails: {
    role: string;
    company: string;
    activity: string;
    note: string;
  };
  score: number; // 0..10
  scoreBreakdown: {
    react: number;
    dsa: number;
    afternoon: number;
    jobSearch: number;
    notes: number;
  };
  startTime: '10:30' | '11:00';
  createdAt: Date;
  updatedAt: Date;
}

const StudyDayProgressSchema = new Schema<IStudyDayProgress>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    date: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    reactCompleted: { type: Boolean, default: false },
    dsaCompleted: { type: Boolean, default: false },
    afternoonCompleted: { type: Boolean, default: false },
    jobSearchCompleted: { type: Boolean, default: false },
    jobSearchDetails: {
      role: { type: String, default: '' },
      company: { type: String, default: '' },
      activity: { type: String, default: '' },
      note: { type: String, default: '' },
    },
    score: { type: Number, default: 0, min: 0, max: 10 },
    scoreBreakdown: {
      react: { type: Number, default: 0 },
      dsa: { type: Number, default: 0 },
      afternoon: { type: Number, default: 0 },
      jobSearch: { type: Number, default: 0 },
      notes: { type: Number, default: 0 },
    },
    startTime: { type: String, enum: ['10:30', '11:00'], default: '10:30' },
  },
  {
    timestamps: true,
  }
);

StudyDayProgressSchema.index({ planId: 1, date: 1, profileId: 1 }, { unique: true });
StudyDayProgressSchema.index({ date: 1, profileId: 1 });

export const StudyDayProgress = mongoose.model<IStudyDayProgress>('StudyDayProgress', StudyDayProgressSchema);
