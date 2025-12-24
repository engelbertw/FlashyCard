'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  createCardSchema,
  updateCardSchema,
  deleteCardSchema,
  type CreateCardInput,
  type UpdateCardInput,
  type DeleteCardInput,
} from '@/lib/validations';
import {
  createCard,
  updateCard,
  deleteCard,
  getUserDeck,
} from '@/db/queries/decks';
import { normalizeCardText, parseAndNormalizeFlashcards } from '@/lib/text-utils';

/**
 * Parse cards text preserving original capitalization (for language learning)
 * Handles formats like:
 * - "1 | french | english" (standard format with two pipes)
 * - "1 | french. english" (period separator)
 * - "1 | french ? english" (question mark separator)
 * - "1 | french english" (no punctuation, space separator)
 * - "french | english" (no numbering)
 */
function parseCardsTextPreservingCase(text: string): Array<{ front: string; back: string }> {
  const cards: Array<{ front: string; back: string }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Remove numbering at the start (e.g., "1 |", "1.", "1)")
    let cleaned = trimmed.replace(/^\d+[\.)]?\s*/, '').trim();

    // Try to split on | separator
    if (cleaned.includes('|')) {
      const parts = cleaned.split('|').map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length === 1) {
        // Format: "1 | french english" - number removed, only one part after |
        // This part contains both French and English
        const combined = parts[0];
        
        // Try to split on punctuation (period, question mark, exclamation) followed by space
        const punctuationMatch = combined.match(/^(.+?[\.?!])\s+(.+)$/);
        if (punctuationMatch) {
          // Format: "french. english" or "french ? english" - split on punctuation
          const front = punctuationMatch[1].trim();
          const back = punctuationMatch[2].trim();
          if (front && back && front !== back) {
            cards.push({ front, back });
            continue;
          }
        } else {
          // No punctuation - try to find where English likely starts
          // Look for common English words that indicate the start of translation
          const englishStartPattern = /\s+(hello|hi|how|what|where|when|why|i\s|you|we|they|it\s|this|that|a\s|an\s|the\s|do\s|does|did|can\s|could|will|would|is\s|are\s|was|were|i'll|i'm|i've)\s+/i;
          const match = combined.match(englishStartPattern);
          if (match && match.index && match.index > 5) {
            // Split at the English word
            const front = combined.substring(0, match.index).trim();
            const back = combined.substring(match.index).trim();
            if (front && back && front !== back) {
              cards.push({ front, back });
              continue;
            }
          }
        }
      } else if (parts.length === 2) {
        // Format: "french | english" or "french | french. english"
        const beforePipe = parts[0];
        const afterPipe = parts[1];
        
        // Try to split on punctuation first (in case it's "french | french. english")
        const punctuationMatch = afterPipe.match(/^(.+?[\.?!])\s+(.+)$/);
        if (punctuationMatch) {
          // Format: "french. english" or "french ? english" - split on punctuation
          const front = punctuationMatch[1].trim();
          const back = punctuationMatch[2].trim();
          if (front && back && front !== back) {
            cards.push({ front, back });
            continue;
          }
        } else {
          // Standard format: "french | english"
          const front = beforePipe;
          const back = afterPipe;
          if (front && back && front !== back) {
            cards.push({ front, back });
            continue;
          }
        }
      } else if (parts.length >= 3) {
        // Format: "french | english | extra" - use first two parts
        const front = parts[0];
        const back = parts[1];
        if (front && back && front !== back) {
          cards.push({ front, back });
          continue;
        }
      }
    }

    // If no | separator, try to split on punctuation (for format like "french. english")
    if (cleaned.match(/[\.?!]/) && !cleaned.includes('|')) {
      const punctuationMatch = cleaned.match(/^(.+?[\.?!])\s+(.+)$/);
      if (punctuationMatch && punctuationMatch[1] && punctuationMatch[2]) {
        const front = punctuationMatch[1].trim();
        const back = punctuationMatch[2].trim();
        if (front.length > 3 && back.length > 3 && front !== back) {
          cards.push({ front, back });
          continue;
        }
      }
    }
  }

  return cards;
}

/**
 * Create multiple cards in a deck at once
 */
export async function createBulkCardsAction(
  deckId: number,
  cardsText: string
) {
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate inputs
  if (!cardsText || cardsText.trim().length < 3) {
    return { success: false, error: 'Cards text must be provided' };
  }

  try {
    // Verify user owns the deck
    const deck = await getUserDeck(userId, deckId);
    if (!deck) {
      return { success: false, error: 'Deck not found or unauthorized' };
    }

    // Parse the cards text preserving capitalization (for language learning)
    const parsedCards = parseCardsTextPreservingCase(cardsText);

    if (parsedCards.length === 0) {
      return {
        success: false,
        error: 'No valid cards could be parsed from the text. Expected format: "front | back" on separate lines.',
      };
    }

    // Create all cards at once (without normalization to preserve capitalization)
    const createdCards = await createCards(deckId, parsedCards);

    // Revalidate the deck page
    revalidatePath(`/decks/${deckId}`);

    return {
      success: true,
      data: createdCards,
      count: createdCards.length,
    };
  } catch (error) {
    console.error('Bulk create cards error:', error);
    return { success: false, error: 'Failed to create cards' };
  }
}

/**
 * Create a new card in a deck
 */
export async function createCardAction(input: CreateCardInput) {
  // Validate input
  const validated = createCardSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
    };
  }
  
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    // Verify user owns the deck
    const deck = await getUserDeck(userId, validated.data.deckId);
    if (!deck) {
      return { success: false, error: 'Deck not found or unauthorized' };
    }
    
    // Normalize text (lowercase, remove strange characters)
    const normalizedFront = normalizeCardText(validated.data.front);
    const normalizedBack = normalizeCardText(validated.data.back);
    
    // Validate normalized text is not empty
    if (!normalizedFront || !normalizedBack) {
      return { 
        success: false, 
        error: 'Card text cannot be empty after normalization' 
      };
    }
    
    // Create the card
    const newCard = await createCard(
      validated.data.deckId,
      normalizedFront,
      normalizedBack
    );
    
    // Revalidate the deck page
    revalidatePath(`/decks/${validated.data.deckId}`);
    
    return { success: true, data: newCard };
  } catch (error) {
    console.error('Create card error:', error);
    return { success: false, error: 'Failed to create card' };
  }
}

/**
 * Update an existing card
 */
export async function updateCardAction(input: UpdateCardInput) {
  // Validate input
  const validated = updateCardSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
    };
  }
  
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    // Normalize text (lowercase, remove strange characters)
    const normalizedFront = normalizeCardText(validated.data.front);
    const normalizedBack = normalizeCardText(validated.data.back);
    
    // Validate normalized text is not empty
    if (!normalizedFront || !normalizedBack) {
      return { 
        success: false, 
        error: 'Card text cannot be empty after normalization' 
      };
    }
    
    // Update the card (ownership verification is done in the query helper)
    const updated = await updateCard(userId, validated.data.id, {
      front: normalizedFront,
      back: normalizedBack,
    });
    
    if (!updated) {
      return { success: false, error: 'Card not found or unauthorized' };
    }
    
    // Revalidate the deck page
    revalidatePath(`/decks/${validated.data.deckId}`);
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('Update card error:', error);
    return { success: false, error: 'Failed to update card' };
  }
}

/**
 * Delete a card
 */
export async function deleteCardAction(input: DeleteCardInput) {
  // Validate input
  const validated = deleteCardSchema.safeParse(input);
  
  if (!validated.success) {
    return { success: false, error: 'Invalid input' };
  }
  
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    // Delete the card (ownership verification is done in the query helper)
    const deleted = await deleteCard(userId, validated.data.id);
    
    if (!deleted) {
      return { success: false, error: 'Card not found or unauthorized' };
    }
    
    // Revalidate the deck page
    revalidatePath(`/decks/${validated.data.deckId}`);
    
    return { success: true, data: deleted };
  } catch (error) {
    console.error('Delete card error:', error);
    return { success: false, error: 'Failed to delete card' };
  }
}

