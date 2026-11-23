import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDSASession extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  profileId: string; // 'you' | 'girlfriend'
  topicId: string; // e.g. 'two-pointers'
  completedProblemNumbers: number[]; // e.g. [125, 167]
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DSASessionSchema = new Schema<IDSASession>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    date: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    topicId: { type: String, required: true, default: 'two-pointers' },
    completedProblemNumbers: { type: [Number], default: [] },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

DSASessionSchema.index({ planId: 1, date: 1, profileId: 1 }, { unique: true });

export const DSASession = mongoose.model<IDSASession>('DSASession', DSASessionSchema);
