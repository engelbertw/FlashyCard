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
    // Request 100% more cards (2x) to account for filtering/duplicates/meta-words
    const requestCount = Math.ceil(cardCount * 2.0);
    
    // Build examples based on keywords in description
    const descLower = description.toLowerCase();
    
    let exampleCards: string[];
    
    // Check for specific language/topic keywords
    if (descLower.includes('dutch')) {
      exampleCards = [
        'appel | apple',
        'kaas | cheese',
        'brood | bread',
        'melk | milk',
        'water | water',
        'huis | house',
        'auto | car',
        'boek | book',
        'tafel | table',
        'stoel | chair',
        'deur | door',
        'raam | window',
        'kat | cat',
        'hond | dog',
        'fiets | bicycle',
        'boom | tree',
        'bloem | flower',
        'kind | child',
        'man | man',
        'vrouw | woman',
        'dag | day',
        'nacht | night',
        'zon | sun',
        'maan | moon',
        'blauw | blue',
        'rood | red',
        'groen | green',
        'groot | big',
        'klein | small',
        'eten | food'
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
    const isDutchToEnglish = descLower.includes('dutch') && descLower.includes('english');
    
    let prompt;
    
    if (isDutchToEnglish) {
      // Special prompt for Dutch to English translations - SIMPLE and example-focused
      prompt = `Study these Dutch-English flashcard examples:
${exampleCards.join('\n')}

Generate ${requestCount} more unique cards about: ${description}

Output ONLY the flashcards in format: dutch | english
NO explanations, NO intro text, NO numbering:`;
    } else if (wantsTranslations) {
      prompt = `Study these vocabulary flashcard examples:
${exampleCards.join('\n')}

Generate ${requestCount} more unique cards about: ${description}

Output ONLY the flashcards, NO intro text:`;
    } else {
      prompt = `Study these flashcard examples:
${exampleCards.join('\n')}

Generate ${requestCount} more unique cards about: ${description}

Output ONLY the flashcards, NO intro text:`;
    }


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
          temperature: 0.8, // Higher for more variety in responses
          num_predict: Math.max(12000, requestCount * 250), // Even higher token limit
          top_k: 60, // More options for diverse vocabulary
          top_p: 0.95, // High for diverse output
          repeat_penalty: 2.0, // MUCH higher to strongly prevent repetition
          frequency_penalty: 0.8, // Higher to avoid repeating same words
          presence_penalty: 0.6, // Higher to encourage new vocabulary
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
      
      const metaWords = ['woorden', 'woord', 'tekst', 'text', 'word', 'words', 'translation', 'vertaling', 'vertalingen'];
      
      // Try splitting by any common separators and being very lenient
      const lines = generatedText.split('\n');
      for (const line of lines) {
        const cleaned = line.trim().toLowerCase();
        if (!cleaned || cleaned.length < 5) continue;
        
        // Try to find ANY separator
        for (const sep of ['|', ':', '-', '=', '\t']) {
          if (cleaned.includes(sep)) {
            const idx = cleaned.indexOf(sep);
            let front = cleaned.substring(0, idx).trim().replace(/^\d+[\.)]\s*/, '');
            let back = cleaned.substring(idx + 1).trim();
            
            // Remove parenthetical parts like "(apple)" or "(word)"
            front = front.replace(/\s*\([^)]*\)/g, '').trim();
            back = back.replace(/\s*\([^)]*\)/g, '').trim();
            
            // Filter out meta-words
            const isMetaWord = metaWords.includes(front) || metaWords.includes(back);
            
            if (front && back && front.length > 0 && back.length > 0 && !isMetaWord && front !== back) {
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

