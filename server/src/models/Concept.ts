import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConcept extends Document {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  title: string;
  slug: string;
  explanation: string;
  importance: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  practicalExample?: string;
  commonMistakes: string[];
  prerequisites: string[];
  relatedConcepts: string[];
  sourceIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConceptSchema = new Schema<IConcept>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    explanation: { type: String, required: true },
    importance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    practicalExample: { type: String, default: '' },
    commonMistakes: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    relatedConcepts: { type: [String], default: [] },
    sourceIds: [{ type: Schema.Types.ObjectId, ref: 'Source' }],
  },
  {
    timestamps: true,
  }
);

ConceptSchema.index({ subjectId: 1, slug: 1 }, { unique: true });
ConceptSchema.index({ subjectId: 1, importance: 1 });

export const Concept = mongoose.model<IConcept>('Concept', ConceptSchema);

