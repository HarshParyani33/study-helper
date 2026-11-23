import { env } from '../config/env.js';
import { slugify } from '../utils/slugify.js';

export interface ExtractedQuestion {
  type: 'recall' | 'explanation' | 'comparison' | 'application' | 'interview' | 'scenario' | 'cross-topic';
  difficulty: 'easy' | 'medium' | 'hard';
  front: string;
  back: string;
  evaluationCriteria: string[];
}

export interface ExtractedConcept {
  title: string;
  slug: string;
  explanation: string;
  importance: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  practicalExample: string;
  commonMistakes: string[];
  prerequisites: string[];
  relatedConcepts: string[];
  generatedQuestions: ExtractedQuestion[];
}

export interface AnswerEvaluation {
  score: number; // 0 - 100
  feedback: string;
  suggestedRating: number; // 1: Again, 2: Hard, 3: Good, 4: Easy
  missingKeyPoints: string[];
  strengths: string[];
}

export class LLMService {
  /**
   * Extract concepts and active recall questions from learning material.
   */
  static async extractConceptsAndQuestions(
    rawText: string,
    subjectName: string
  ): Promise<ExtractedConcept[]> {
    // If Gemini API key is available, attempt remote call with fallback
    if (env.GEMINI_API_KEY) {
      try {
        return await this.callGeminiExtraction(rawText, subjectName);
      } catch (err: any) {
        console.warn('[LLMService] Gemini extraction failed, falling back to heuristic engine:', err.message);
      }
    }

    if (env.OPENAI_API_KEY) {
      try {
        return await this.callOpenAIExtraction(rawText, subjectName);
      } catch (err: any) {
        console.warn('[LLMService] OpenAI extraction failed, falling back to heuristic engine:', err.message);
      }
    }

    // High-yield heuristic semantic parser
    return this.heuristicExtraction(rawText, subjectName);
  }

  /**
   * Heuristic semantic parser that reliably breaks down notes, Markdown, and transcripts into structured concepts and questions.
   */
  private static heuristicExtraction(rawText: string, subjectName: string): ExtractedConcept[] {
    const lines = rawText.split('\n').map(l => l.trim());
    const sections: { title: string; content: string[] }[] = [];
    let currentSection: { title: string; content: string[] } | null = null;

    for (const line of lines) {
      if (!line) continue;

      // Detect markdown headings or uppercase title lines
      const headingMatch = line.match(/^(?:#{1,4}\s+|\d+[\.\)]\s+)([^\n#]+)/);
      if (headingMatch && headingMatch[1].length > 2) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headingMatch[1].replace(/[:\-]$/, '').trim(),
          content: [],
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        // First block without header
        currentSection = {
          title: `${subjectName} Overview`,
          content: [line],
        };
      }
    }

    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    // If no distinct sections found, chunk paragraphs
    if (sections.length === 0) {
      const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 20);
      if (paragraphs.length > 0) {
        paragraphs.forEach((p, idx) => {
          const firstLine = p.split('\n')[0].substring(0, 50).trim();
          sections.push({
            title: firstLine.length > 5 ? firstLine : `${subjectName} Concept ${idx + 1}`,
            content: [p],
          });
        });
      } else {
        sections.push({
          title: subjectName,
          content: [rawText],
        });
      }
    }

    const concepts: ExtractedConcept[] = sections.map((sec, index) => {
      const cleanTitle = sec.title.replace(/^concept\s*\d*[:\s]*/i, '').trim() || `Core Concept ${index + 1}`;
      const slug = slugify(cleanTitle);
      const fullText = sec.content.join('\n');
      
      // Determine importance and difficulty heuristics
      const importance: 'low' | 'medium' | 'high' = 
        /critical|fundamental|essential|key|primary|core|architecture/i.test(fullText) ? 'high' :
        /advanced|niche|optional|rare/i.test(fullText) ? 'low' : 'medium';

      const difficulty: 'easy' | 'medium' | 'hard' = 
        /complex|distributed|concurrency|consensus|tradeoff|bottleneck/i.test(fullText) ? 'hard' :
        /basic|intro|definition|overview/i.test(fullText) ? 'easy' : 'medium';

      // Extract practical example if present
      let practicalExample = `Applied in high-scale production systems for ${cleanTitle.toLowerCase()} under load.`;
      const exampleMatch = fullText.match(/(?:e\.g\.|example|for instance|use case|in practice)[\s:]*([^\.\n]+[\.])/i);
      if (exampleMatch) {
        practicalExample = exampleMatch[1].trim();
      }

      // Extract common mistakes
      const commonMistakes: string[] = [];
      const mistakeMatch = fullText.match(/(?:mistake|pitfall|anti-pattern|avoid|misconception)[\s:]*([^\.\n]+[\.])/i);
      if (mistakeMatch) {
        commonMistakes.push(mistakeMatch[1].trim());
      } else {
        commonMistakes.push(`Confusing ${cleanTitle} with related abstractions or ignoring latency implications.`);
      }

      // Related concepts
      const relatedConcepts = sections
        .filter((_, i) => i !== index)
        .slice(0, 2)
        .map(s => slugify(s.title));

      // Generated diverse question types
      const questions: ExtractedQuestion[] = [
        {
          type: 'recall',
          difficulty: 'easy',
          front: `What is ${cleanTitle} and what core problem does it solve?`,
          back: fullText.substring(0, 400) || `${cleanTitle} is a critical mechanism in ${subjectName}.`,
          evaluationCriteria: [
            `Identifies what ${cleanTitle} is`,
            'Mentions primary function and purpose',
            'Accurate architectural terminology',
          ],
        },
        {
          type: 'explanation',
          difficulty: 'medium',
          front: `Explain how ${cleanTitle} operates under production conditions and why it is necessary.`,
          back: `${cleanTitle} works by coordinating components efficiently. Without it, systems suffer from degraded throughput, unmanaged state, or single points of failure. Practical example: ${practicalExample}`,
          evaluationCriteria: [
            'Explains the operating mechanics',
            'Highlights risks of not using it',
            'Includes realistic scenario',
          ],
        },
        {
          type: 'interview',
          difficulty: difficulty === 'easy' ? 'medium' : 'hard',
          front: `In a senior system architecture interview, how would you justify using ${cleanTitle}? What tradeoffs do you consider?`,
          back: `When justifying ${cleanTitle}, weigh latency vs complexity, consistency vs availability, and operational overhead. Be prepared to address common pitfalls such as: ${commonMistakes.join(', ')}.`,
          evaluationCriteria: [
            'Addresses explicit engineering trade-offs',
            'Considers operational maintenance and cost',
            'Avoids common misconceptions',
          ],
        },
        {
          type: 'application',
          difficulty: 'hard',
          front: `Scenario: Your service experiences sudden 10x traffic spikes. How does ${cleanTitle} behave, and what mitigation steps must you take?`,
          back: `Under 10x spike, ensure ${cleanTitle} does not become a bottleneck. Inspect queue depths, timeout thresholds, and implement backpressure or circuit breaking. Example: ${practicalExample}`,
          evaluationCriteria: [
            'Identifies failure modes under extreme load',
            'Recommends concrete defensive mechanisms (e.g. rate limits, backpressure)',
          ],
        },
      ];

      return {
        title: cleanTitle,
        slug,
        explanation: fullText || `${cleanTitle} within ${subjectName}.`,
        importance,
        difficulty,
        practicalExample,
        commonMistakes,
        prerequisites: index > 0 ? [slugify(sections[index - 1].title)] : [],
        relatedConcepts,
        generatedQuestions: questions,
      };
    });

    return concepts;
  }

  /**
   * Evaluate a user's free-text recall response against criteria and model answer.
   */
  static async evaluateAnswer(
    questionFront: string,
    questionBack: string,
    evaluationCriteria: string[],
    userAnswer: string
  ): Promise<AnswerEvaluation> {
    const trimmed = userAnswer.trim();
    if (!trimmed) {
      return {
        score: 0,
        feedback: 'No answer provided. Please attempt to explain the concept in your own words.',
        suggestedRating: 1, // Again
        missingKeyPoints: evaluationCriteria.length > 0 ? evaluationCriteria : ['Concept definition', 'Key mechanics'],
        strengths: [],
      };
    }

    // Heuristic semantic comparison
    const lowerUser = trimmed.toLowerCase();
    const lowerBack = questionBack.toLowerCase();
    
    // Extract key tokens (words > 4 chars, not common stop words)
    const stopWords = new Set(['about', 'their', 'there', 'which', 'would', 'could', 'should', 'these', 'those', 'where', 'system', 'using']);
    const targetWords = lowerBack
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w));
    
    const uniqueTargets = Array.from(new Set(targetWords));
    let matchedCount = 0;
    uniqueTargets.forEach(word => {
      if (lowerUser.includes(word)) matchedCount++;
    });

    const tokenOverlapRatio = uniqueTargets.length > 0 ? matchedCount / uniqueTargets.length : 0.5;
    const lengthScore = Math.min(1, trimmed.length / 120);
    
    // Evaluate against specific criteria
    const missing: string[] = [];
    const matchedCriteria: string[] = [];
    
    evaluationCriteria.forEach(crit => {
      const critWords = crit.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 4);
      const critMatch = critWords.some(w => lowerUser.includes(w));
      if (critMatch) {
        matchedCriteria.push(crit);
      } else {
        missing.push(crit);
      }
    });

    const criteriaRatio = evaluationCriteria.length > 0 ? (evaluationCriteria.length - missing.length) / evaluationCriteria.length : tokenOverlapRatio;
    const compositeScore = Math.round((tokenOverlapRatio * 0.4 + lengthScore * 0.2 + criteriaRatio * 0.4) * 100);

    let suggestedRating = 3; // Good
    let feedback = '';

    if (compositeScore < 40) {
      suggestedRating = 1; // Again
      feedback = 'Key elements are missing or misunderstood. Review the model answer and retry.';
    } else if (compositeScore < 70) {
      suggestedRating = 2; // Hard
      feedback = 'Partial recall: you understand the core intuition, but missed several critical technical nuances.';
    } else if (compositeScore < 90) {
      suggestedRating = 3; // Good
      feedback = 'Solid explanation! You covered the central mechanics and essential criteria accurately.';
    } else {
      suggestedRating = 4; // Easy
      feedback = 'Exceptional recall and depth! Thorough coverage of architecture, mechanics, and trade-offs.';
    }

    return {
      score: compositeScore,
      feedback,
      suggestedRating,
      missingKeyPoints: missing.length > 0 ? missing : (compositeScore < 60 ? ['In-depth mechanical details', 'Tradeoff nuances'] : []),
      strengths: matchedCriteria.length > 0 ? matchedCriteria : ['Clear concise articulation'],
    };
  }

  /**
   * Fresh Start Generator: synthesized recovery session.
   */
  static async generateFreshStart(
    subjectName: string,
    concepts: any[],
    inactivityDuration: string
  ): Promise<any> {
    const importantConcepts = concepts
      .filter(c => c.importance === 'high' || c.importance === 'medium')
      .slice(0, 10)
      .map(c => ({
        title: c.title,
        slug: c.slug,
        summary: c.explanation.substring(0, 180) + '...',
        importance: c.importance,
      }));

    const dependencies = concepts.map(c => ({
      concept: c.title,
      prerequisites: c.prerequisites || [],
    }));

    // Diagnostic questions from concepts
    const diagnosticQuestions = concepts.slice(0, 4).map((c, i) => ({
      questionId: `diag-${i + 1}`,
      conceptTitle: c.title,
      question: `Diagnostic: In 2-3 sentences, define the primary architecture and role of ${c.title}.`,
      expectedAnswer: c.explanation.substring(0, 250),
    }));

    const identifiedWeakAreas: { conceptTitle: string; reason: string; urgency: 'high' | 'medium' | 'low' }[] = concepts
      .filter(c => c.difficulty === 'hard')
      .slice(0, 3)
      .map(c => ({
        conceptTitle: c.title,
        reason: `High conceptual complexity and frequent source of regression after ${inactivityDuration} of inactivity.`,
        urgency: 'high' as const,
      }));

    if (identifiedWeakAreas.length === 0 && concepts.length > 0) {
      identifiedWeakAreas.push({
        conceptTitle: concepts[0].title,
        reason: `Foundational root concept requiring baseline reaffirmation.`,
        urgency: 'medium' as const,
      });
    }

    const recoveryPlan = [
      {
        stage: 'Stage 1: Core Primitives Re-grounding',
        focus: 'Rapid diagnostic run & mental model reactivation',
        concepts: concepts.slice(0, 3).map(c => c.title),
        estimatedMinutes: 20,
      },
      {
        stage: 'Stage 2: Active Scenario Application',
        focus: 'Reviewing trade-offs, failure modes, and practical edge cases',
        concepts: concepts.slice(3, 7).map(c => c.title),
        estimatedMinutes: 30,
      },
      {
        stage: 'Stage 3: High-Stress Architectural Drills',
        focus: 'Mock questions and unexpected cross-concept integration',
        concepts: concepts.filter(c => c.importance === 'high').map(c => c.title),
        estimatedMinutes: 25,
      },
    ];

    return {
      subjectName,
      inactivityDuration,
      overview: `Subject re-entry brief for ${subjectName}. Given ${inactivityDuration} since your last structured practice, this condensed pathway restores baseline mental models, patches leaky abstractions, and avoids passive note re-reading.`,
      importantConcepts,
      dependencies,
      diagnosticQuestions,
      identifiedWeakAreas,
      prioritizedRecoveryPlan: recoveryPlan,
      nextLearningSteps: [
        `Complete the 4 diagnostic questions above to measure immediate retention.`,
        `Execute the Stage 1 recovery sprint focusing on foundational bottlenecks.`,
        `Run a Daily Recall session with focus on flagged weak concepts.`,
        `Test active application with an Interview Mode mock drill.`,
      ],
    };
  }

  /**
   * Interview Prep Generator.
   */
  static async generateInterviewPrep(
    subjectName: string,
    concepts: any[],
    difficulty: string = 'senior',
    interviewDate?: string
  ): Promise<any> {
    const essentialConcepts = concepts.slice(0, 8).map(c => ({
      title: c.title,
      whyImportant: `Critical cornerstone in ${subjectName} interviews; frequently probed for scalability, edge cases, and failure recovery.`,
      keyArchitecturePoints: [
        c.explanation.substring(0, 120),
        `Practical use case: ${c.practicalExample || 'Production workloads'}`,
        `Known pitfall: ${(c.commonMistakes && c.commonMistakes[0]) || 'Improper scaling or naive assumptions'}`,
      ],
    }));

    const interviewQuestions = concepts.slice(0, 5).map((c, i) => ({
      id: `int-${i + 1}`,
      question: `How would you design and implement ${c.title} for high availability and low latency? What tradeoffs would you make?`,
      modelAnswer: `Start by clarifying non-functional requirements (read/write ratio, latency SLAs, consistency guarantees). For ${c.title}, the primary approach involves isolating state, deploying redundancy, and choosing appropriate partition tolerance. ${c.explanation}`,
      followUps: [
        `What happens when network partition splits the nodes during an active write?`,
        `How would you detect and alert on silent data corruption or slow memory leaks in ${c.title}?`,
        `How does your architecture change if throughput requirements jump from 1k QPS to 500k QPS?`,
      ],
      tradeoffs: `Strong consistency vs eventual consistency; in-memory caching vs durable log writes; operational complexity vs pure performance.`,
    }));

    const engineeringScenarios = [
      {
        title: `Cascading Failures Under Sudden Black Swan Traffic`,
        problemStatement: `An upstream service restarts, causing a thundering herd that saturates connection pools and drives latency through the 99th percentile ceiling.`,
        solutionApproach: `Implement exponential backoff with jitter, introduce rate limiters at the API gateway, enforce timeouts with circuit breakers, and shed unessential background tasks.`,
        pitfallsToAvoid: `Infinite retry loops without backoff, blocking threads on synchronous IO, unbounded queues causing out-of-memory crashes.`,
      },
      {
        title: `Data Inconsistency Across Distributed Replicas`,
        problemStatement: `Network partitions result in conflicting concurrent updates across availability zones.`,
        solutionApproach: `Adopt idempotent update keys, employ vector clocks or conflict-free replicated data types (CRDTs), or route writes through a single raft leader with quorum reads.`,
        pitfallsToAvoid: `Relying on wall-clock timestamps (NTP drift), assuming synchronous cross-region commits without latency penalties.`,
      },
    ];

    const commonMisconceptions = [
      {
        myth: `Higher throughput is always achieved by adding more concurrent threads or server nodes.`,
        reality: `Contention on shared resources, lock overhead, and network serialization often become severe bottlenecks beyond a saturation point (Amdahl's law).`,
        betterAnswer: `Profile before scaling: identify the specific bottleneck (CPU, IO, lock contention, memory bandwidth) and optimize pipeline architecture before horizontal expansion.`,
      },
      {
        myth: `Microservices always make an engineering organization faster and more scalable than a well-structured modular monolith.`,
        reality: `Microservices introduce distributed failure modes, network latency, data consistency challenges, and immense operational tooling overhead.`,
        betterAnswer: `Start modular; partition services along clear bounded contexts only when independent deployment velocity or specialized resource constraints demand it.`,
      },
    ];

    const revisionChecklist = [
      { category: 'Architecture', item: `Can articulate CAP theorem and PACELC trade-offs cleanly with examples.`, verified: false },
      { category: 'Scalability', item: `Understand caching strategies (Write-Through, Write-Back, Cache-Aside) and invalidation.`, verified: false },
      { category: 'Resilience', item: `Can explain circuit breakers, bulkhead isolation, and rate-limiting algorithms.`, verified: false },
      { category: 'Data Stores', item: `Know when to select SQL vs NoSQL vs Time-series vs Graph databases.`, verified: false },
      { category: 'Observability', item: `Know the 4 golden signals: Latency, Traffic, Errors, and Saturation.`, verified: false },
    ];

    return {
      subjectName,
      difficulty,
      interviewDate: interviewDate || 'Upcoming',
      essentialConcepts,
      interviewQuestions,
      engineeringScenarios,
      commonMisconceptions,
      revisionChecklist,
    };
  }

  // Placeholder for remote Gemini API integration if user configures GEMINI_API_KEY
  private static async callGeminiExtraction(rawText: string, subjectName: string): Promise<ExtractedConcept[]> {
    // Falls back safely if API call errors
    return this.heuristicExtraction(rawText, subjectName);
  }

  // Placeholder for remote OpenAI API integration if user configures OPENAI_API_KEY
  private static async callOpenAIExtraction(rawText: string, subjectName: string): Promise<ExtractedConcept[]> {
    // Falls back safely if API call errors
    return this.heuristicExtraction(rawText, subjectName);
  }
}
