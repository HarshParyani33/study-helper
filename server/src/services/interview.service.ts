import { Subject } from '../models/Subject.js';
import { Concept } from '../models/Concept.js';
import { LLMService } from './llm.service.js';
import { AppError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export class InterviewService {
  static async generate(subjectId: string, difficulty = 'senior', interviewDate?: string) {
    let subject;
    if (mongoose.isValidObjectId(subjectId)) {
      subject = await Subject.findById(subjectId);
    } else {
      subject = await Subject.findOne({ name: subjectId });
    }

    if (!subject) {
      throw new AppError('Subject not found for Interview Mode', 404);
    }

    const concepts = await Concept.find({ subjectId: subject._id }).lean();
    if (concepts.length === 0) {
      throw new AppError(`No concepts found for subject "${subject.name}". Ingest notes first.`, 400);
    }

    return await LLMService.generateInterviewPrep(
      subject.name,
      concepts,
      difficulty,
      interviewDate
    );
  }
}

