'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  createStudySession,
  saveStudyResults,
  getUserRankForDeck,
} from '@/db/queries/study-sessions';
import { getUserDeck } from '@/db/queries/decks';

interface CardResult {
  cardId: number;
  isCorrect: boolean;
}

interface SaveStudySessionInput {
  deckId: number;
  mode: 'flip' | 'test';
  totalCards: number;
  correctAnswers: number;
  cardResults: CardResult[];
}

/**
 * Save a completed study session with results
 */
export async function saveStudySessionAction(input: SaveStudySessionInput) {
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    // Verify user owns the deck
    const deck = await getUserDeck(userId, input.deckId);
    if (!deck) {
      return { success: false, error: 'Deck not found or unauthorized' };
    }
    
    // Validate input
    if (input.totalCards < 1 || input.correctAnswers < 0) {
      return { success: false, error: 'Invalid session data' };
    }
    
    if (input.correctAnswers > input.totalCards) {
      return { success: false, error: 'Correct answers cannot exceed total cards' };
    }
    
    // Create the session
    const session = await createStudySession(
      userId,
      input.deckId,
      input.mode,
      input.totalCards,
      input.correctAnswers
    );
    
    // Save individual card results if provided
    if (input.cardResults && input.cardResults.length > 0) {
      await saveStudyResults(session.id, input.cardResults);
    }
    
    // Get user's rank for leaderboard (only for test mode)
    let rank = null;
    if (input.mode === 'test') {
      rank = await getUserRankForDeck(userId, input.deckId);
    }
    
    // Revalidate the deck page to show updated stats
    revalidatePath(`/decks/${input.deckId}`);
    
    return { 
      success: true, 
      data: {
        sessionId: session.id,
        message: 'Study session saved successfully',
        rank,
      }
    };
  } catch (error) {
    console.error('Save study session error:', error);
    return { success: false, error: 'Failed to save study session' };
  }
}

