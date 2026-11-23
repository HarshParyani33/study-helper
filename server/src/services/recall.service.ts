import { Question, IQuestion } from '../models/Question.js';
import { Concept } from '../models/Concept.js';
import { Review } from '../models/Review.js';
import { FSRSService } from './fsrs.service.js';
import { LLMService, AnswerEvaluation } from './llm.service.js';
import { AppError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export class RecallService {
  /**
   * Fetch questions currently due for review.
   */
  static async getDueQuestions(subjectId?: string, limit = 20) {
    const filter: any = {
      nextReviewAt: { $lte: new Date() },
    };

    if (subjectId && mongoose.isValidObjectId(subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const questions = await Question.find(filter)
      .populate('conceptId', 'title slug importance difficulty explanation practicalExample commonMistakes')
      .populate('subjectId', 'name')
      .sort({ nextReviewAt: 1 })
      .limit(limit)
      .lean();

    return questions;
  }

  /**
   * Core Journey E: Surprise Recall across all subjects.
   * Selects concepts across all subjects, favouring forgotten, long-unseen, foundational concepts.
   */
  static async getSurpriseRecall(limit = 10) {
    // 1. Get questions from high-importance concepts or with lapses
    const highPriorityQuestions = await Question.find({
      $or: [
        { 'fsrsCard.lapses': { $gt: 0 } },
        { 'fsrsCard.reps': { $gt: 0 } },
      ],
    })
      .populate('conceptId', 'title slug importance difficulty explanation')
      .populate('subjectId', 'name')
      .sort({ 'fsrsCard.stability': 1, nextReviewAt: 1 })
      .limit(Math.floor(limit * 0.6))
      .lean();

    // 2. Sample additional questions across different subjects for diversity
    const sampledQuestions = await Question.aggregate([
      { $sample: { size: limit } },
      {
        $lookup: {
          from: 'concepts',
          localField: 'conceptId',
          foreignField: '_id',
          as: 'concept',
        },
      },
      { $unwind: '$concept' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
    ]);

    // Format aggregate output to match populated schema
    const formattedSampled = sampledQuestions.map(q => ({
      ...q,
      conceptId: q.concept,
      subjectId: q.subject,
    }));

    // Combine and deduplicate
    const map = new Map<string, any>();
    [...highPriorityQuestions, ...formattedSampled].forEach(item => {
      const id = item._id.toString();
      if (!map.has(id)) {
        map.set(id, item);
      }
    });

    const combined = Array.from(map.values());
    // Shuffle slightly for surprise feel
    return combined.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  /**
   * Submit an active recall review with FSRS update.
   */
  static async submitReview(
    questionId: string,
    rating: number,
    userAnswer = '',
    evaluation = '',
    elapsedMs = 0
  ) {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new AppError('Question not found', 404);
    }

    const { updatedCard, nextReviewAt, fsrsLog } = FSRSService.schedule(
      question.fsrsCard as any,
      rating,
      new Date()
    );

    // Update question card state & review date
    question.fsrsCard = updatedCard as any;
    question.nextReviewAt = nextReviewAt;
    question.lastReviewedAt = new Date();
    await question.save();

    // Create immutable audit log in Review collection
    const review = await Review.create({
      questionId: question._id,
      conceptId: question.conceptId,
      subjectId: question.subjectId,
      rating,
      userAnswer,
      evaluation,
      reviewedAt: new Date(),
      nextReviewAt,
      fsrsState: fsrsLog,
      elapsedMs,
    });

    return {
      success: true,
      reviewId: review._id.toString(),
      nextReviewAt,
      scheduledDays: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
    };
  }

  /**
   * Evaluate a free-text answer using the LLM service.
   */
  static async evaluateAnswer(questionId: string, userAnswer: string): Promise<AnswerEvaluation> {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new AppError('Question not found', 404);
    }

    return await LLMService.evaluateAnswer(
      question.front,
      question.back,
      question.evaluationCriteria || [],
      userAnswer
    );
  }
}

