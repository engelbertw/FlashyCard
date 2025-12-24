/**
 * Script to test cascade deletion
 * This script will:
 * 1. Create a test deck
 * 2. Add some cards to it
 * 3. Delete the deck
 * 4. Verify all cards are automatically deleted
 */

import 'dotenv/config';
import { db } from '../db';
import { decksTable, cardsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testCascadeDelete() {
  console.log('🧪 Testing CASCADE DELETE functionality...\n');

  try {
    // 1. Create a test deck
    console.log('1. Creating test deck...');
    const [testDeck] = await db
      .insert(decksTable)
      .values({
        userId: 'test-user-cascade',
        name: 'Test Cascade Deck',
        description: 'This deck will be deleted to test cascade',
      })
      .returning();
    console.log(`✅ Created deck with ID: ${testDeck.id}`);

    // 2. Add some test cards
    console.log('\n2. Adding test cards...');
    const testCards = await db
      .insert(cardsTable)
      .values([
        { deckId: testDeck.id, front: 'Test Card 1', back: 'Answer 1' },
        { deckId: testDeck.id, front: 'Test Card 2', back: 'Answer 2' },
        { deckId: testDeck.id, front: 'Test Card 3', back: 'Answer 3' },
      ])
      .returning();
    console.log(`✅ Created ${testCards.length} cards`);

    // 3. Verify cards exist
    const cardsBefore = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.deckId, testDeck.id));
    console.log(`\n3. Before deletion: ${cardsBefore.length} cards found`);

    // 4. Delete the deck
    console.log('\n4. Deleting deck...');
    await db.delete(decksTable).where(eq(decksTable.id, testDeck.id));
    console.log('✅ Deck deleted');

    // 5. Check if cards were automatically deleted
    const cardsAfter = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.deckId, testDeck.id));
    console.log(`\n5. After deletion: ${cardsAfter.length} cards found`);

    // 6. Result
    if (cardsAfter.length === 0) {
      console.log('\n🎉 SUCCESS! CASCADE DELETE is working correctly!');
      console.log('✅ All cards were automatically deleted when the deck was deleted.');
    } else {
      console.log('\n❌ FAILURE! Cascade delete is NOT working!');
      console.log(`⚠️  ${cardsAfter.length} orphaned cards still exist.`);
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testCascadeDelete();

