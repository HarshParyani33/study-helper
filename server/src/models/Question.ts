import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  conceptId: Types.ObjectId;
  subjectId: Types.ObjectId;
  type: 'recall' | 'explanation' | 'comparison' | 'application' | 'interview' | 'scenario' | 'cross-topic';
  difficulty: 'easy' | 'medium' | 'hard';
  front: string;
  back: string;
  evaluationCriteria: string[];
  nextReviewAt: Date;
  lastReviewedAt?: Date;
  fsrsCard?: {
    due: Date;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    conceptId: { type: Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    type: {
      type: String,
      enum: ['recall', 'explanation', 'comparison', 'application', 'interview', 'scenario', 'cross-topic'],
      default: 'recall',
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    front: { type: String, required: true },
    back: { type: String, required: true },
    evaluationCriteria: { type: [String], default: [] },
    nextReviewAt: { type: Date, default: () => new Date(), index: true },
    lastReviewedAt: { type: Date },
    fsrsCard: {
      type: Schema.Types.Mixed,
      default: () => ({
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0, // 0: New, 1: Learning, 2: Review, 3: Relearning
      }),
    },
  },
  {
    timestamps: true,
  }
);

QuestionSchema.index({ subjectId: 1, nextReviewAt: 1 });
QuestionSchema.index({ conceptId: 1, type: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

