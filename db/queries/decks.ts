import { db } from '@/db';
import { decksTable, cardsTable } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
 * Get recent decks for template suggestions
 */
export async function getRecentDecksForTemplates(userId: string, limit = 5) {
  return await db
    .select({
      id: decksTable.id,
      name: decksTable.name,
      description: decksTable.description,
      createdAt: decksTable.createdAt,
    })
    .from(decksTable)
    .where(
      and(
        eq(decksTable.userId, userId),
        sql`${decksTable.description} IS NOT NULL AND ${decksTable.description} != ''`
      )
    )
    .orderBy(desc(decksTable.createdAt))
    .limit(limit);
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

/**
 * Create multiple cards for a deck
 */
export async function createCards(
  deckId: number,
  cards: Array<{ front: string; back: string }>
) {
  const cardsToInsert = cards.map(card => ({
    deckId,
    front: card.front,
    back: card.back,
  }));

  const insertedCards = await db
    .insert(cardsTable)
    .values(cardsToInsert)
    .returning();

  return insertedCards;
}

/**
 * Create a single card for a deck
 */
export async function createCard(
  deckId: number,
  front: string,
  back: string
) {
  const [newCard] = await db
    .insert(cardsTable)
    .values({
      deckId,
      front,
      back,
    })
    .returning();

  return newCard;
}

/**
 * Get a single card by ID with ownership verification
 */
export async function getCard(userId: string, cardId: number) {
  const [card] = await db
    .select({
      id: cardsTable.id,
      deckId: cardsTable.deckId,
      front: cardsTable.front,
      back: cardsTable.back,
      createdAt: cardsTable.createdAt,
      updatedAt: cardsTable.updatedAt,
    })
    .from(cardsTable)
    .innerJoin(decksTable, eq(cardsTable.deckId, decksTable.id))
    .where(
      and(
        eq(cardsTable.id, cardId),
        eq(decksTable.userId, userId)
      )
    );
  
  return card ?? null;
}

/**
 * Update a card (with ownership verification)
 */
export async function updateCard(
  userId: string,
  cardId: number,
  data: { front: string; back: string }
) {
  // First verify ownership through the deck
  const card = await getCard(userId, cardId);
  
  if (!card) {
    return null;
  }
  
  const [updated] = await db
    .update(cardsTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(cardsTable.id, cardId))
    .returning();
  
  return updated ?? null;
}

/**
 * Delete a card (with ownership verification)
 */
export async function deleteCard(userId: string, cardId: number) {
  // First verify ownership through the deck
  const card = await getCard(userId, cardId);
  
  if (!card) {
    return null;
  }
  
  const [deleted] = await db
    .delete(cardsTable)
    .where(eq(cardsTable.id, cardId))
    .returning();
  
  return deleted ?? null;
}

