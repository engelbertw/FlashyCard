/**
 * Test script to verify flashcard parsing works correctly
 */

import { parseAndNormalizeFlashcards, normalizeCardText } from '../lib/text-utils';

const testCases = [
  {
    name: 'Standard pipe format',
    input: `apple | appel
bread | brood
cheese | kaas`,
    expectedCount: 3,
  },
  {
    name: 'With numbering (should be removed)',
    input: `1. apple | appel
2. bread | brood
3. cheese | kaas`,
    expectedCount: 3,
  },
  {
    name: 'With markdown formatting',
    input: `**apple** | appel
_bread_ | brood
~~cheese~~ | kaas`,
    expectedCount: 3,
  },
  {
    name: 'Colon separator',
    input: `apple: appel
bread: brood
cheese: kaas`,
    expectedCount: 3,
  },
  {
    name: 'Mixed case (should normalize to lowercase)',
    input: `APPLE | APPEL
Bread | Brood
ChEeSe | KaAs`,
    expectedCount: 3,
  },
  {
    name: 'With extra whitespace',
    input: `  apple   |   appel  
  bread   |   brood  
  cheese  |   kaas  `,
    expectedCount: 3,
  },
  {
    name: 'With header text (should skip)',
    input: `Here are your flashcards:
apple | appel
bread | brood
cheese | kaas`,
    expectedCount: 3,
  },
  {
    name: 'Dash separator',
    input: `apple - appel
bread - brood
cheese - kaas`,
    expectedCount: 3,
  },
  {
    name: 'With meta labels (should skip labels)',
    input: `term | stroopwafel
translation | dutch waffle
no numbering | 1, 2, 3
stroopwafel | syrup waffle
poffertjes | small pancakes
bitterballen | fried meat balls`,
    expectedCount: 3, // Should only parse the 3 actual cards
  },
  {
    name: 'With just numbers line (should skip)',
    input: `1, 2, 3, 4, 5, 6, 7, 8, 9, 10
apple | appel
bread | brood`,
    expectedCount: 2,
  },
  {
    name: 'With explanation labels (should skip)',
    input: `translation | bread with butter
explanation | this is a classic dutch dish
translation | pancakes
explanation | quick and easy to make
stroopwafel | syrup waffle
poffertjes | small pancakes`,
    expectedCount: 2, // Only the valid cards
  },
];

console.log('🧪 Testing Flashcard Parsing\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  console.log(`Testing: ${test.name}`);
  const result = parseAndNormalizeFlashcards(test.input);
  
  if (result.length === test.expectedCount) {
    console.log(`✅ PASS - Got ${result.length} cards`);
    console.log('   Sample:', result[0] ? `"${result[0].front}" → "${result[0].back}"` : 'none');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected ${test.expectedCount} cards, got ${result.length}`);
    console.log('   Parsed cards:', result);
    failed++;
  }
  console.log('');
}

console.log('\n📊 Results:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
} else {
  console.log('\n⚠️  Some tests failed. Check the parsing logic.');
}

// Test normalization
console.log('\n🧪 Testing Text Normalization\n');

const normTests = [
  { input: 'HELLO', expected: 'hello' },
  { input: '  spaced  ', expected: 'spaced' },
  { input: '1. numbered', expected: '1. numbered' },
  { input: 'special!!!', expected: 'special' },
];

for (const test of normTests) {
  const result = normalizeCardText(test.input);
  if (result === test.expected) {
    console.log(`✅ "${test.input}" → "${result}"`);
  } else {
    console.log(`❌ "${test.input}" → "${result}" (expected "${test.expected}")`);
  }
}

