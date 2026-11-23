import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  conceptId: Types.ObjectId;
  subjectId: Types.ObjectId;
  rating: number; // 1: Again, 2: Hard, 3: Good, 4: Easy
  userAnswer?: string;
  evaluation?: string;
  reviewedAt: Date;
  nextReviewAt: Date;
  fsrsState: Record<string, any>;
  elapsedMs?: number;
}

const ReviewSchema = new Schema<IReview>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    conceptId: { type: Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 4 },
    userAnswer: { type: String, default: '' },
    evaluation: { type: String, default: '' },
    reviewedAt: { type: Date, default: () => new Date(), index: true },
    nextReviewAt: { type: Date, required: true },
    fsrsState: { type: Schema.Types.Mixed, required: true },
    elapsedMs: { type: Number, default: 0 },
  },
  {
    timestamps: false,
  }
);

ReviewSchema.index({ subjectId: 1, reviewedAt: -1 });
ReviewSchema.index({ questionId: 1, reviewedAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);

