'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createDeckSchema,
  updateDeckSchema,
  deleteDeckSchema,
  type CreateDeckInput,
  type UpdateDeckInput,
  type DeleteDeckInput,
} from '@/lib/validations';
import {
  createDeck,
  updateDeck,
  deleteDeck,
  createCards,
  getUserDecks,
} from '@/db/queries/decks';

/**
 * Create a new deck
 */
export async function createDeckAction(input: CreateDeckInput) {
  // Validate input
  const validated = createDeckSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
    };
  }
  
  // Authenticate
  const { userId, has } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  // Check deck limit for free users
  const hasUnlimitedDecks = has({ feature: 'unlimited_decks' });
  
  if (!hasUnlimitedDecks) {
    // Free users have 3_deck_limit feature
    const userDecks = await getUserDecks(userId);
    if (userDecks.length >= 3) {
      return {
        success: false,
        error: 'Deck limit reached. You can create up to 3 decks on the free plan. Upgrade to premium for unlimited decks.',
      };
    }
  }
  
  try {
    // Create the deck
    const newDeck = await createDeck(
      userId,
      validated.data.name,
      validated.data.description
    );
    
    // Create cards if provided
    if (validated.data.cards && validated.data.cards.length > 0) {
      await createCards(newDeck.id, validated.data.cards);
    }
    
    // Revalidate pages
    revalidatePath('/decks');
    revalidatePath('/dashboard');
    revalidatePath(`/decks/${newDeck.id}`);
    
    return { success: true, data: newDeck };
  } catch (error) {
    console.error('Create deck error:', error);
    return { success: false, error: 'Failed to create deck' };
  }
}

/**
 * Update an existing deck
 */
export async function updateDeckAction(input: UpdateDeckInput) {
  // Validate input
  const validated = updateDeckSchema.safeParse(input);
  
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
    // Update the deck
    const updated = await updateDeck(userId, validated.data.id, {
      name: validated.data.name,
      description: validated.data.description,
    });
    
    if (!updated) {
      return { success: false, error: 'Deck not found or unauthorized' };
    }
    
    // Revalidate pages
    revalidatePath('/decks');
    revalidatePath('/dashboard');
    revalidatePath(`/decks/${updated.id}`);
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('Update deck error:', error);
    return { success: false, error: 'Failed to update deck' };
  }
}

/**
 * Delete a deck
 */
export async function deleteDeckAction(input: DeleteDeckInput) {
  // Validate input
  const validated = deleteDeckSchema.safeParse(input);
  
  if (!validated.success) {
    return { success: false, error: 'Invalid input' };
  }
  
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    // Delete the deck
    const deleted = await deleteDeck(userId, validated.data.id);
    
    if (!deleted) {
      return { success: false, error: 'Deck not found or unauthorized' };
    }
    
    // Revalidate pages
    revalidatePath('/decks');
    revalidatePath('/dashboard');
    
    return { success: true, data: deleted };
  } catch (error) {
    console.error('Delete deck error:', error);
    return { success: false, error: 'Failed to delete deck' };
  }
}

