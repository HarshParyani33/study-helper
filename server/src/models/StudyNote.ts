import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudyNote extends Document {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  profileId: string; // 'you' | 'girlfriend'
  activityType: 'react' | 'dsa' | 'system-design' | 'project-learning' | 'job-search' | 'reflection';
  title: string;
  content: string;
  approach?: string;
  keyObservation?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  commonMistakes?: string;
  relatedConceptId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudyNoteSchema = new Schema<IStudyNote>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    date: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    activityType: {
      type: String,
      enum: ['react', 'dsa', 'system-design', 'project-learning', 'job-search', 'reflection'],
      default: 'reflection',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    approach: { type: String, default: '' },
    keyObservation: { type: String, default: '' },
    timeComplexity: { type: String, default: '' },
    spaceComplexity: { type: String, default: '' },
    commonMistakes: { type: String, default: '' },
    relatedConceptId: { type: Schema.Types.ObjectId, ref: 'Concept' },
  },
  {
    timestamps: true,
  }
);

StudyNoteSchema.index({ planId: 1, date: 1, profileId: 1 });
StudyNoteSchema.index({ profileId: 1, date: 1 });

export const StudyNote = mongoose.model<IStudyNote>('StudyNote', StudyNoteSchema);
