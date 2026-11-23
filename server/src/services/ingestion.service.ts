import { Subject, ISubject } from '../models/Subject.js';
import { Source, ISource } from '../models/Source.js';
import { Concept, IConcept } from '../models/Concept.js';
import { Question, IQuestion } from '../models/Question.js';
import { createContentHash } from '../utils/hash.js';
import { slugify } from '../utils/slugify.js';
import { LLMService, ExtractedConcept } from './llm.service.js';
import { FSRSService } from './fsrs.service.js';
import { Types } from 'mongoose';

export interface IngestionInput {
  subjectName: string;
  sourceTitle: string;
  sourceType: 'notes' | 'pdf' | 'transcript' | 'article' | 'screenshot' | 'code';
  content: string;
  fileReference?: string;
}

export interface IngestionReport {
  isDuplicateSource: boolean;
  subject: {
    id: string;
    name: string;
  };
  source: {
    id: string;
    title: string;
    contentHash: string;
    type: string;
  };
  summary: {
    conceptsCreated: number;
    conceptsEnriched: number;
    questionsCreated: number;
    totalConceptsInSubject: number;
  };
  details: {
    newConcepts: string[];
    enrichedConcepts: string[];
    questionsGenerated: { concept: string; question: string; type: string }[];
  };
}

export class IngestionService {
  /**
   * Complete idempotent ingestion pipeline.
   */
  static async ingest(input: IngestionInput): Promise<IngestionReport> {
    const { subjectName, sourceTitle, sourceType, content, fileReference } = input;
    const contentHash = createContentHash(content.trim());

    // Step 1: Ensure Subject exists
    let subject = await Subject.findOne({ name: subjectName.trim() });
    if (!subject) {
      subject = await Subject.create({
        name: subjectName.trim(),
        description: `Knowledge repository for ${subjectName.trim()}`,
      });
    }

    // Step 2: Check Source idempotency via contentHash
    let existingSource = await Source.findOne({
      subjectId: subject._id,
      contentHash,
    });

    if (existingSource) {
      // Return idempotency report - identical material already ingested
      const totalConcepts = await Concept.countDocuments({ subjectId: subject._id });
      return {
        isDuplicateSource: true,
        subject: { id: subject._id.toString(), name: subject.name },
        source: {
          id: existingSource._id.toString(),
          title: existingSource.title,
          contentHash: existingSource.contentHash,
          type: existingSource.type,
        },
        summary: {
          conceptsCreated: 0,
          conceptsEnriched: 0,
          questionsCreated: 0,
          totalConceptsInSubject: totalConcepts,
        },
        details: {
          newConcepts: [],
          enrichedConcepts: [],
          questionsGenerated: [],
        },
      };
    }

    // Create new Source record
    const source = await Source.create({
      subjectId: subject._id,
      title: sourceTitle.trim(),
      type: sourceType,
      contentHash,
      fileReference: fileReference || '',
      rawContent: content,
    });

    // Step 3: Extract structured concepts and questions
    const extractedConcepts: ExtractedConcept[] = await LLMService.extractConceptsAndQuestions(
      content,
      subject.name
    );

    const reportDetails = {
      newConcepts: [] as string[],
      enrichedConcepts: [] as string[],
      questionsGenerated: [] as { concept: string; question: string; type: string }[],
    };

    let conceptsCreatedCount = 0;
    let conceptsEnrichedCount = 0;
    let questionsCreatedCount = 0;

    // Step 4: Process each concept with deduplication & enrichment
    for (const rawConcept of extractedConcepts) {
      const cleanSlug = rawConcept.slug || slugify(rawConcept.title);
      let concept = await Concept.findOne({
        subjectId: subject._id,
        slug: cleanSlug,
      });

      if (concept) {
        // ENRICH EXISTING CONCEPT
        // Enrich explanation if new one is more comprehensive or brings new context
        if (
          rawConcept.explanation &&
          !concept.explanation.includes(rawConcept.explanation.substring(0, 40))
        ) {
          concept.explanation = `${concept.explanation}\n\nEnrichment from ${source.title}:\n${rawConcept.explanation}`;
        }

        // Merge practical example
        if (rawConcept.practicalExample && !concept.practicalExample?.includes(rawConcept.practicalExample)) {
          concept.practicalExample = concept.practicalExample
            ? `${concept.practicalExample}\n- ${rawConcept.practicalExample}`
            : rawConcept.practicalExample;
        }

        // Union common mistakes without duplicates
        const existingMistakes = new Set(concept.commonMistakes || []);
        (rawConcept.commonMistakes || []).forEach(m => existingMistakes.add(m));
        concept.commonMistakes = Array.from(existingMistakes);

        // Union prerequisites
        const existingPrereqs = new Set(concept.prerequisites || []);
        (rawConcept.prerequisites || []).forEach(p => existingPrereqs.add(p));
        concept.prerequisites = Array.from(existingPrereqs);

        // Union relatedConcepts
        const existingRelated = new Set(concept.relatedConcepts || []);
        (rawConcept.relatedConcepts || []).forEach(r => existingRelated.add(r));
        concept.relatedConcepts = Array.from(existingRelated);

        // Link Source ID
        if (!concept.sourceIds.some(id => id.toString() === source._id.toString())) {
          concept.sourceIds.push(source._id as any);
        }

        await concept.save();
        conceptsEnrichedCount++;
        reportDetails.enrichedConcepts.push(concept.title);
      } else {
        // CREATE NEW CONCEPT
        concept = await Concept.create({
          subjectId: subject._id,
          title: rawConcept.title,
          slug: cleanSlug,
          explanation: rawConcept.explanation,
          importance: rawConcept.importance || 'medium',
          difficulty: rawConcept.difficulty || 'medium',
          practicalExample: rawConcept.practicalExample || '',
          commonMistakes: rawConcept.commonMistakes || [],
          prerequisites: rawConcept.prerequisites || [],
          relatedConcepts: rawConcept.relatedConcepts || [],
          sourceIds: [source._id],
        });

        conceptsCreatedCount++;
        reportDetails.newConcepts.push(concept.title);
      }

      // Step 5: Process and deduplicate questions for this concept
      for (const q of rawConcept.generatedQuestions || []) {
        // Check if question with same front already exists for this concept
        const existingQ = await Question.findOne({
          conceptId: concept._id,
          front: q.front.trim(),
        });

        if (!existingQ) {
          const initialCard = FSRSService.createInitialCard();
          await Question.create({
            conceptId: concept._id,
            subjectId: subject._id,
            type: q.type,
            difficulty: q.difficulty || concept.difficulty || 'medium',
            front: q.front.trim(),
            back: q.back.trim(),
            evaluationCriteria: q.evaluationCriteria || [],
            nextReviewAt: initialCard.due,
            fsrsCard: initialCard,
          });

          questionsCreatedCount++;
          reportDetails.questionsGenerated.push({
            concept: concept.title,
            question: q.front,
            type: q.type,
          });
        }
      }
    }

    const totalConcepts = await Concept.countDocuments({ subjectId: subject._id });

    return {
      isDuplicateSource: false,
      subject: { id: subject._id.toString(), name: subject.name },
      source: {
        id: source._id.toString(),
        title: source.title,
        contentHash: source.contentHash,
        type: source.type,
      },
      summary: {
        conceptsCreated: conceptsCreatedCount,
        conceptsEnriched: conceptsEnrichedCount,
        questionsCreated: questionsCreatedCount,
        totalConceptsInSubject: totalConcepts,
      },
      details: reportDetails,
    };
  }
}

