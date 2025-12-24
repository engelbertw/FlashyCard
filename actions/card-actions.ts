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
import { normalizeCardText } from '@/lib/text-utils';

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

