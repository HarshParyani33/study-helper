import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudyProfile extends Document {
  _id: Types.ObjectId;
  profileId: string; // 'you' | 'girlfriend'
  displayName: string;
  color: string;     // 'blue' | 'pink'
  createdAt: Date;
  updatedAt: Date;
}

const StudyProfileSchema = new Schema<IStudyProfile>(
  {
    profileId: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

export const StudyProfile = mongoose.model<IStudyProfile>('StudyProfile', StudyProfileSchema);
