import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISource extends Document {
  _id: Types.ObjectId;
  subjectId: Types.ObjectId;
  title: string;
  type: 'notes' | 'pdf' | 'transcript' | 'article' | 'screenshot' | 'code';
  contentHash: string;
  fileReference?: string;
  rawContent?: string;
  createdAt: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['notes', 'pdf', 'transcript', 'article', 'screenshot', 'code'],
      default: 'notes',
    },
    contentHash: { type: String, required: true, index: true },
    fileReference: { type: String, default: '' },
    rawContent: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SourceSchema.index({ subjectId: 1, contentHash: 1 }, { unique: true });

export const Source = mongoose.model<ISource>('Source', SourceSchema);

