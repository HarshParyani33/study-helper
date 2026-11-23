import { Request, Response, NextFunction } from 'express';
import { Subject } from '../models/Subject.js';
import { Concept } from '../models/Concept.js';
import { Question } from '../models/Question.js';
import { Review } from '../models/Review.js';

export class StatsController {
  static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const totalSubjects = await Subject.countDocuments();
      const totalConcepts = await Concept.countDocuments();
      const totalQuestions = await Question.countDocuments();
      const totalReviews = await Review.countDocuments();

      const dueQuestions = await Question.countDocuments({
        nextReviewAt: { $lte: new Date() },
      });

      // Reviews in last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentReviews = await Review.aggregate([
        { $match: { reviewedAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Rating distribution
      const ratingDistribution = await Review.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Overall retention estimate: percentage of reviews where rating >= 3 (Good or Easy)
      const successfulReviews = await Review.countDocuments({ rating: { $gte: 3 } });
      const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

      // Subject breakdown
      const subjects = await Subject.find().lean();
      const subjectBreakdown = await Promise.all(
        subjects.map(async s => {
          const cCount = await Concept.countDocuments({ subjectId: s._id });
          const qCount = await Question.countDocuments({ subjectId: s._id });
          const dCount = await Question.countDocuments({
            subjectId: s._id,
            nextReviewAt: { $lte: new Date() },
          });
          return {
            id: s._id,
            name: s.name,
            concepts: cCount,
            questions: qCount,
            due: dCount,
          };
        })
      );

      res.json({
        success: true,
        data: {
          metrics: {
            totalSubjects,
            totalConcepts,
            totalQuestions,
            totalReviews,
            dueQuestions,
            retentionRate,
          },
          recentReviews,
          ratingDistribution,
          subjectBreakdown,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getKnowledgeGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId } = req.query;
      const filter: any = {};
      if (subjectId) filter.subjectId = subjectId;

      const concepts = await Concept.find(filter).populate('subjectId', 'name').lean();
      const questions = await Question.find(filter ? { subjectId: filter.subjectId || { $exists: true } } : {}).lean();

      // Build question map for status
      const conceptQuestionMap = new Map<string, { total: number; due: number; avgStability: number }>();
      questions.forEach(q => {
        const cId = q.conceptId.toString();
        const existing = conceptQuestionMap.get(cId) || { total: 0, due: 0, avgStability: 0 };
        existing.total += 1;
        if (new Date(q.nextReviewAt) <= new Date()) {
          existing.due += 1;
        }
        if (q.fsrsCard?.stability) {
          existing.avgStability += q.fsrsCard.stability;
        }
        conceptQuestionMap.set(cId, existing);
      });

      const nodes = concepts.map((c, idx) => {
        const qStats = conceptQuestionMap.get(c._id.toString()) || { total: 0, due: 0, avgStability: 0 };
        const status = qStats.due > 0 ? 'due' : qStats.total > 0 ? 'learning' : 'new';
        
        return {
          id: c._id.toString(),
          slug: c.slug,
          data: {
            label: c.title,
            subject: (c.subjectId as any)?.name || 'General',
            importance: c.importance,
            difficulty: c.difficulty,
            status,
            totalQuestions: qStats.total,
            dueQuestions: qStats.due,
            explanation: c.explanation.substring(0, 140) + '...',
          },
          // Basic grid layout coordinates
          position: {
            x: 100 + (idx % 4) * 260,
            y: 100 + Math.floor(idx / 4) * 160,
          },
        };
      });

      // Build slug-to-ID lookup
      const slugMap = new Map<string, string>();
      concepts.forEach(c => slugMap.set(c.slug, c._id.toString()));

      const edges: any[] = [];
      let edgeCounter = 1;

      concepts.forEach(c => {
        const currentId = c._id.toString();

        // Prerequisites edges (directional: prerequisite -> this concept)
        (c.prerequisites || []).forEach(preSlug => {
          const targetId = slugMap.get(preSlug);
          if (targetId && targetId !== currentId) {
            edges.push({
              id: `edge-prereq-${edgeCounter++}`,
              source: targetId,
              target: currentId,
              animated: true,
              label: 'prerequisite',
              style: { stroke: '#6366f1', strokeWidth: 2 },
            });
          }
        });

        // Related concepts edges
        (c.relatedConcepts || []).forEach(relSlug => {
          const targetId = slugMap.get(relSlug);
          if (targetId && targetId !== currentId) {
            // Avoid adding double edges
            const exists = edges.some(
              e => (e.source === currentId && e.target === targetId) || (e.source === targetId && e.target === currentId)
            );
            if (!exists) {
              edges.push({
                id: `edge-rel-${edgeCounter++}`,
                source: currentId,
                target: targetId,
                label: 'related',
                style: { stroke: '#10b981', strokeDasharray: '4,4' },
              });
            }
          }
        });
      });

      res.json({
        success: true,
        data: { nodes, edges },
      });
    } catch (err) {
      next(err);
    }
  }
}

