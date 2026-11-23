import { fsrs, Rating, Card, createEmptyCard, State, RecordLogItem } from 'ts-fsrs';
import { env } from '../config/env.js';

const f = fsrs({
  request_retention: env.FSRS_REQUEST_RETENTION,
  maximum_interval: env.FSRS_MAXIMUM_INTERVAL,
});

export { Rating, State };

export interface FSRSCardData {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: Date;
}

export class FSRSService {
  static createInitialCard(): FSRSCardData {
    const card = createEmptyCard();
    return {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review,
    };
  }

  static schedule(cardData: FSRSCardData | undefined, rating: number, reviewDate: Date = new Date()): {
    updatedCard: FSRSCardData;
    nextReviewAt: Date;
    fsrsLog: Record<string, any>;
  } {
    // Map number (1..4) to FSRS Rating
    let fsrsRating: Rating;
    switch (rating) {
      case 1:
        fsrsRating = Rating.Again;
        break;
      case 2:
        fsrsRating = Rating.Hard;
        break;
      case 3:
        fsrsRating = Rating.Good;
        break;
      case 4:
        fsrsRating = Rating.Easy;
        break;
      default:
        fsrsRating = Rating.Good;
    }

    const currentCard: Card = cardData
      ? {
          due: new Date(cardData.due),
          stability: cardData.stability,
          difficulty: cardData.difficulty,
          elapsed_days: cardData.elapsed_days,
          scheduled_days: cardData.scheduled_days,
          reps: cardData.reps,
          lapses: cardData.lapses,
          state: cardData.state as State,
          last_review: cardData.last_review ? new Date(cardData.last_review) : undefined,
        }
      : createEmptyCard(reviewDate);

    const recordLog = f.repeat(currentCard, reviewDate);
    const item: RecordLogItem = recordLog[fsrsRating];

    const updatedCard: FSRSCardData = {
      due: item.card.due,
      stability: item.card.stability,
      difficulty: item.card.difficulty,
      elapsed_days: item.card.elapsed_days,
      scheduled_days: item.card.scheduled_days,
      reps: item.card.reps,
      lapses: item.card.lapses,
      state: item.card.state,
      last_review: item.card.last_review,
    };

    return {
      updatedCard,
      nextReviewAt: item.card.due,
      fsrsLog: {
        rating,
        state: item.card.state,
        stability: item.card.stability,
        difficulty: item.card.difficulty,
        scheduled_days: item.card.scheduled_days,
        review: item.log.review,
      },
    };
  }
}

