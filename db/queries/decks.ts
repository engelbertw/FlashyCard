import { db } from '@/db';
import { decksTable, cardsTable } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get all decks for a specific user
 */
export async function getUserDecks(userId: string) {
  return await db
    .select()
    .from(decksTable)
    .where(eq(decksTable.userId, userId))
    .orderBy(desc(decksTable.createdAt));
}

/**
 * Get a single deck by ID for a specific user (with ownership verification)
 */
export async function getUserDeck(userId: string, deckId: number) {
  const [deck] = await db
    .select()
    .from(decksTable)
    .where(
      and(
        eq(decksTable.id, deckId),
        eq(decksTable.userId, userId)
      )
    );
  
  return deck ?? null;
}

/**
 * Get all cards for a specific deck (with ownership verification)
 */
export async function getDeckCards(userId: string, deckId: number) {
  // First verify the user owns the deck
  const deck = await getUserDeck(userId, deckId);
  
  if (!deck) {
    return null;
  }
  
  // Then get the cards
  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.deckId, deckId))
    .orderBy(desc(cardsTable.createdAt));
  
  return cards;
}

/**
 * Get a deck with its cards (with ownership verification)
 */
export async function getUserDeckWithCards(userId: string, deckId: number) {
  const deck = await getUserDeck(userId, deckId);
  
  if (!deck) {
    return null;
  }
  
  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.deckId, deckId))
    .orderBy(desc(cardsTable.createdAt));
  
  return { ...deck, cards };
}

/**
 * Create a new deck for a user
 */
export async function createDeck(userId: string, name: string, description?: string) {
  const [newDeck] = await db
    .insert(decksTable)
    .values({
      userId,
      name,
      description,
    })
    .returning();
  
  return newDeck;
}

/**
 * Update a deck (with ownership verification)
 */
export async function updateDeck(
  userId: string,
  deckId: number,
  data: { name: string; description?: string }
) {
  const [updated] = await db
    .update(decksTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(decksTable.id, deckId),
        eq(decksTable.userId, userId)
      )
    )
    .returning();
  
  return updated ?? null;
}

/**
 * Delete a deck (with ownership verification)
 */
export async function deleteDeck(userId: string, deckId: number) {
  const [deleted] = await db
    .delete(decksTable)
    .where(
      and(
        eq(decksTable.id, deckId),
        eq(decksTable.userId, userId)
      )
    )
    .returning();
  
  return deleted ?? null;
}

