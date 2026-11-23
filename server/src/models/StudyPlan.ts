import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStudyPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'active' | 'completed' | 'archived';
  defaultStartTime: '10:30' | '11:00';
  totalDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudyPlanSchema = new Schema<IStudyPlan>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    defaultStartTime: {
      type: String,
      enum: ['10:30', '11:00'],
      default: '10:30',
    },
    totalDays: { type: Number, default: 10 },
  },
  {
    timestamps: true,
  }
);

StudyPlanSchema.index({ status: 1, startDate: 1 });

export const StudyPlan = mongoose.model<IStudyPlan>('StudyPlan', StudyPlanSchema);
