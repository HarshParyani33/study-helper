import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

