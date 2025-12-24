'use server';

import { auth } from '@clerk/nextjs/server';
import { parseAndNormalizeFlashcards, removeDuplicateCards } from '@/lib/text-utils';

/**
 * Generate flashcards using local Gemma3 AI via Ollama
 */
export async function generateCardsWithAI(
  description: string,
  cardCount: number = 20
) {
  // Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate inputs
  if (!description || description.trim().length < 3) {
    return { success: false, error: 'Description must be at least 3 characters' };
  }

  if (cardCount < 1 || cardCount > 100) {
    return { success: false, error: 'Card count must be between 1 and 100' };
  }

  try {
    // Request 30% more cards than needed to account for filtering/duplicates
    const requestCount = Math.ceil(cardCount * 1.3);
    
    // Build examples based on keywords in description
    const descLower = description.toLowerCase();
    
    let exampleCards: string[];
    
    // Check for specific language/topic keywords
    if (descLower.includes('dutch')) {
      exampleCards = [
        'stroopwafel | syrup waffle',
        'poffertjes | small pancakes', 
        'bitterballen | fried meatballs',
        'haring | herring',
        'kroket | croquette',
        'kaas | cheese',
        'brood | bread',
        'melk | milk',
        'drop | licorice',
        'oliebollen | fried dough balls'
      ];
    } else if (descLower.includes('spanish')) {
      exampleCards = [
        'hola | hello',
        'gracias | thank you',
        'adiós | goodbye',
        'por favor | please',
        'sí | yes',
        'no | no',
        'buenos días | good morning',
        'buenas noches | good night',
        'agua | water',
        'comida | food'
      ];
    } else if (descLower.includes('french')) {
      exampleCards = [
        'bonjour | hello',
        'merci | thank you',
        'au revoir | goodbye',
        's\'il vous plaît | please',
        'oui | yes',
        'non | no',
        'bonne journée | good day',
        'bonsoir | good evening',
        'eau | water',
        'pain | bread'
      ];
    } else if (descLower.includes('german')) {
      exampleCards = [
        'hallo | hello',
        'danke | thank you',
        'auf wiedersehen | goodbye',
        'bitte | please',
        'ja | yes',
        'nein | no',
        'guten morgen | good morning',
        'gute nacht | good night',
        'wasser | water',
        'brot | bread'
      ];
    } else if (descLower.includes('capital') || descLower.includes('cities')) {
      exampleCards = [
        'paris | france',
        'london | united kingdom',
        'berlin | germany',
        'madrid | spain',
        'rome | italy',
        'amsterdam | netherlands',
        'brussels | belgium',
        'vienna | austria',
        'lisbon | portugal',
        'athens | greece'
      ];
    } else if (descLower.includes('math')) {
      exampleCards = [
        'addition | combining numbers',
        'subtraction | taking away',
        'multiplication | repeated addition',
        'division | splitting into parts',
        'fraction | part of a whole',
        'decimal | base ten number',
        'percentage | parts per hundred',
        'equation | mathematical statement',
        'variable | unknown value',
        'constant | fixed value'
      ];
    } else if (descLower.includes('science')) {
      exampleCards = [
        'atom | smallest unit of matter',
        'molecule | group of atoms',
        'cell | basic unit of life',
        'photosynthesis | plants making food',
        'gravity | force of attraction',
        'energy | ability to do work',
        'matter | anything with mass',
        'element | pure substance',
        'compound | combined elements',
        'reaction | chemical change'
      ];
    } else {
      // Default examples for translations
      exampleCards = [
        'apple | appel',
        'water | water',
        'bread | brood',
        'cheese | kaas',
        'milk | melk',
        'house | huis',
        'dog | hond',
        'cat | kat',
        'book | boek',
        'table | tafel'
      ];
    }
    
    // Detect if user wants translations
    const wantsTranslations = descLower.includes('translation') || descLower.includes('english');
    const formatHint = wantsTranslations 
      ? 'Format: native_word | english_translation'
      : 'Format: term | definition';
    
    const prompt = `Create ${requestCount} flashcards about: ${description}

${formatHint}

Copy these ${exampleCards.length} examples EXACTLY:
${exampleCards.join('\n')}

CRITICAL:
- Each line = TWO parts separated by |
- NO numbers (1, 2, 3)
- NO labels (term:, translation:)
- NO explanations
- lowercase only
- ${requestCount} cards total

Generate now:`;


    // Call Ollama API running locally
    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    const modelName = 'gemma3:270m';
    const requestUrl = `${ollamaUrl}/api/generate`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600000); // 10 minute timeout (large model needs time)
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7, // Lower for more consistent formatting
          num_predict: Math.max(8000, requestCount * 120), // Even higher - safety margin
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.2, // Higher to avoid duplicate patterns
          frequency_penalty: 0.3, // Reduce repetitive structures
        },
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.response;

    if (!generatedText) {
      return { success: false, error: 'Gemma3 AI failed to generate cards' };
    }

    console.log('AI Response (first 500 chars):', generatedText.substring(0, 500));

    // Parse and normalize the generated cards
    let parsedCards = parseAndNormalizeFlashcards(generatedText);
    
    console.log('Parsed cards count:', parsedCards.length);
    
    // If parsing failed completely, try a more lenient approach
    if (parsedCards.length === 0) {
      console.log('Standard parsing failed, trying lenient parsing...');
      
      // Try splitting by any common separators and being very lenient
      const lines = generatedText.split('\n');
      for (const line of lines) {
        const cleaned = line.trim().toLowerCase();
        if (!cleaned || cleaned.length < 5) continue;
        
        // Try to find ANY separator
        for (const sep of ['|', ':', '-', '=', '\t']) {
          if (cleaned.includes(sep)) {
            const idx = cleaned.indexOf(sep);
            const front = cleaned.substring(0, idx).trim().replace(/^\d+[\.)]\s*/, '');
            const back = cleaned.substring(idx + 1).trim();
            
            if (front && back && front.length > 0 && back.length > 0) {
              parsedCards.push({ front, back });
              break;
            }
          }
        }
      }
      
      console.log('Lenient parsing result:', parsedCards.length, 'cards');
    }
    
    if (parsedCards.length === 0) {
      // Log the raw response for debugging
      console.error('Failed to parse any cards from AI response');
      console.error('First 1000 chars of response:', generatedText.substring(0, 1000));
      
      return { 
        success: false, 
        error: `No valid cards could be generated. The AI response could not be parsed. Please try with a simpler, more specific description (e.g., "Dutch food words" or "Spanish greetings"). Expected format: "front | back".`,
        debug: generatedText.substring(0, 500)
      };
    }

    // Remove duplicates
    let uniqueCards = removeDuplicateCards(parsedCards);

    // If we have more cards than requested, take only the requested amount
    if (uniqueCards.length > cardCount) {
      uniqueCards = uniqueCards.slice(0, cardCount);
    }

    // Calculate how close we are to the target
    const percentageGenerated = (uniqueCards.length / cardCount) * 100;
    
    // If we generated less than 40% of requested cards, still return them but with error/warning
    if (percentageGenerated < 40) {
      // Still return the cards we did get, but as a "partial success"
      return {
        success: true, // Changed to true so cards are shown
        data: {
          rawText: generatedText.trim(),
          cards: uniqueCards,
          count: uniqueCards.length,
          requestedCount: cardCount,
          warning: `⚠️ Only generated ${uniqueCards.length} out of ${cardCount} requested cards.

💡 Suggestions to get more cards:
• Try ${Math.floor(cardCount / 2)} cards instead of ${cardCount}
• Be more specific: "20 dutch dishes with english names"
• Generate multiple smaller batches
• The Gemma3 270M model is small - larger models work better for big requests

You can still create the deck with these ${uniqueCards.length} cards, or try generating again.`,
        }
      };
    }

    // Generate appropriate warning/success message
    let warning: string | undefined;
    if (uniqueCards.length === cardCount) {
      warning = `✓ Successfully generated exactly ${cardCount} cards!`;
    } else if (uniqueCards.length < cardCount) {
      const difference = cardCount - uniqueCards.length;
      warning = `Generated ${uniqueCards.length} cards instead of ${cardCount} (${difference} duplicates or invalid cards were removed). You can generate more if needed.`;
    }

    return { 
      success: true, 
      data: {
        rawText: generatedText.trim(),
        cards: uniqueCards,
        count: uniqueCards.length,
        requestedCount: cardCount,
        warning,
      }
    };
  } catch (error) {
    console.error('Gemma3 AI generation error:', error);
    
    if (error instanceof Error) {
      // Handle connection errors
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return { 
          success: false, 
          error: 'Could not connect to Ollama. Please make sure Ollama is running and Gemma3 model is installed. Run: ollama pull gemma3:270m' 
        };
      }
      if (error.message.includes('model') || error.message.includes('not found')) {
        return { 
          success: false, 
          error: 'Gemma3 model not found. Please install it by running: ollama pull gemma3:270m' 
        };
      }
      if (error.name === 'AbortError') {
        return { 
          success: false, 
          error: 'AI generation timed out. The model is taking too long to respond. Try reducing the number of cards or try again later.' 
        };
      }
      return { success: false, error: `Local AI generation failed: ${error.message}` };
    }
    
    return { success: false, error: 'Failed to generate cards with local Gemma3 AI' };
  }
}

