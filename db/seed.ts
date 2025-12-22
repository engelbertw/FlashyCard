// Load environment variables via side-effect import
import 'dotenv/config';
import { db } from './index';
import { decksTable, cardsTable } from './schema';

async function seed() {
  try {
    // Get userId from command line argument or use a default
    const userId = process.argv[2] || 'demo_user';
    
    console.log(`Seeding database with example decks for user: ${userId}...`);

    // Deck 1: JavaScript Fundamentals
    const [jsDeck] = await db.insert(decksTable).values({
      userId,
      name: 'JavaScript Fundamentals',
      description: 'Essential JavaScript concepts for web development',
    }).returning();

    console.log(`Created deck: ${jsDeck.name}`);

    // JavaScript cards
    const jsCards = [
      {
        front: 'What is a closure in JavaScript?',
        back: 'A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.',
      },
      {
        front: 'What is the difference between let, const, and var?',
        back: 'var is function-scoped and can be redeclared; let is block-scoped and can be reassigned; const is block-scoped and cannot be reassigned.',
      },
      {
        front: 'What is event bubbling?',
        back: 'Event bubbling is when an event starts from the innermost element and propagates up through its ancestors in the DOM tree.',
      },
      {
        front: 'What is the purpose of async/await?',
        back: 'async/await provides a cleaner way to work with promises, making asynchronous code look and behave more like synchronous code.',
      },
      {
        front: 'What is hoisting?',
        back: 'Hoisting is JavaScript\'s default behavior of moving declarations to the top of the current scope before code execution.',
      },
      {
        front: 'What is the difference between == and ===?',
        back: '== performs type coercion before comparison, while === (strict equality) compares both value and type without coercion.',
      },
      {
        front: 'What is a Promise?',
        back: 'A Promise is an object representing the eventual completion or failure of an asynchronous operation and its resulting value.',
      },
      {
        front: 'What is the spread operator?',
        back: 'The spread operator (...) expands an iterable (like an array) into individual elements, useful for copying and merging arrays or objects.',
      },
      {
        front: 'What is destructuring?',
        back: 'Destructuring is a syntax that allows unpacking values from arrays or properties from objects into distinct variables.',
      },
      {
        front: 'What is the purpose of the "this" keyword?',
        back: '"this" refers to the object that is executing the current function. Its value depends on how the function is called.',
      },
      {
        front: 'What is an arrow function?',
        back: 'An arrow function is a shorter syntax for writing functions. It does not have its own "this" binding and cannot be used as constructors.',
      },
      {
        front: 'What is event delegation?',
        back: 'Event delegation is a technique where you attach a single event listener to a parent element to handle events for multiple child elements.',
      },
      {
        front: 'What is the difference between null and undefined?',
        back: 'undefined means a variable has been declared but not assigned a value; null is an assignment value representing intentional absence of any object value.',
      },
      {
        front: 'What is a callback function?',
        back: 'A callback is a function passed as an argument to another function, which is then invoked inside the outer function.',
      },
      {
        front: 'What is the DOM?',
        back: 'The Document Object Model (DOM) is a programming interface for HTML and XML documents, representing the page as a tree of objects.',
      },
    ];

    await db.insert(cardsTable).values(
      jsCards.map(card => ({
        ...card,
        deckId: jsDeck.id,
      }))
    );

    console.log(`Added ${jsCards.length} cards to ${jsDeck.name}`);

    // Deck 2: World Geography
    const [geoDeck] = await db.insert(decksTable).values({
      userId,
      name: 'World Geography',
      description: 'Fascinating facts about countries, capitals, and landmarks around the globe',
    }).returning();

    console.log(`Created deck: ${geoDeck.name}`);

    // Geography cards
    const geoCards = [
      {
        front: 'What is the capital of France?',
        back: 'Paris',
      },
      {
        front: 'Which is the largest ocean on Earth?',
        back: 'The Pacific Ocean, covering approximately 63 million square miles.',
      },
      {
        front: 'What is the longest river in the world?',
        back: 'The Nile River in Africa, stretching about 4,135 miles (6,650 km).',
      },
      {
        front: 'Which country has the largest population?',
        back: 'India (as of 2023), with over 1.4 billion people.',
      },
      {
        front: 'What is the smallest country in the world?',
        back: 'Vatican City, with an area of only 0.17 square miles (0.44 km²).',
      },
      {
        front: 'Which mountain is the tallest in the world?',
        back: 'Mount Everest, standing at 29,032 feet (8,849 meters) above sea level.',
      },
      {
        front: 'What is the capital of Japan?',
        back: 'Tokyo',
      },
      {
        front: 'Which desert is the largest hot desert in the world?',
        back: 'The Sahara Desert in Africa, covering approximately 3.6 million square miles.',
      },
      {
        front: 'What is the capital of Australia?',
        back: 'Canberra (not Sydney or Melbourne)',
      },
      {
        front: 'Which country is known as the "Land of the Rising Sun"?',
        back: 'Japan',
      },
      {
        front: 'What is the deepest point in the ocean?',
        back: 'The Mariana Trench, reaching depths of about 36,000 feet (11,000 meters).',
      },
      {
        front: 'Which continent has the most countries?',
        back: 'Africa, with 54 recognized countries.',
      },
      {
        front: 'What is the capital of Canada?',
        back: 'Ottawa',
      },
      {
        front: 'Which waterfall is the tallest in the world?',
        back: 'Angel Falls in Venezuela, with a height of 3,212 feet (979 meters).',
      },
      {
        front: 'What are the seven continents?',
        back: 'Africa, Antarctica, Asia, Europe, North America, Australia (Oceania), and South America.',
      },
    ];

    await db.insert(cardsTable).values(
      geoCards.map(card => ({
        ...card,
        deckId: geoDeck.id,
      }))
    );

    console.log(`Added ${geoCards.length} cards to ${geoDeck.name}`);
    console.log('\n✅ Seeding completed successfully!');
    console.log(`Total decks created: 2`);
    console.log(`Total cards created: ${jsCards.length + geoCards.length}`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

