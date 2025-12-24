'use server';

import { auth } from '@clerk/nextjs/server';
import { parseAndNormalizeFlashcards, removeDuplicateCards } from '@/lib/text-utils';

/**
 * Authenticate with Cptain API and get access token using OAuth2 client credentials flow
 */
async function getCptainAuthToken(): Promise<{ 
  token: string | null; 
  error?: string; 
  authSucceeded?: boolean;
  authData?: any;
}> {
  const authUrl = (process.env.CPTAIN_AUTH_URL || 'https://auth.cptain.nl').trim();
  const clientId = process.env.CPTAIN_CLIENT_ID?.trim();
  const clientSecret = (process.env.CPTAIN_CLIENT_SECRET || process.env.CPTAIN_API_KEY)?.trim(); // Fallback to API_KEY for backward compatibility
  const realm = (process.env.CPTAIN_REALM || 'pink-roccade-pz').trim(); // Default to 'pink-roccade-pz' if not specified

  console.log('[Cptain Auth] Starting OAuth2 client credentials authentication...');
  console.log('[Cptain Auth] Auth URL:', authUrl);
  console.log('[Cptain Auth] Realm:', realm);
  console.log('[Cptain Auth] Client ID configured:', !!clientId);
  console.log('[Cptain Auth] Client ID length:', clientId?.length || 0);
  console.log('[Cptain Auth] Client Secret configured:', !!clientSecret);
  console.log('[Cptain Auth] Client Secret length:', clientSecret?.length || 0);

  if (!authUrl || !clientId || !clientSecret) {
    const missing = [];
    if (!authUrl) missing.push('CPTAIN_AUTH_URL');
    if (!clientId) missing.push('CPTAIN_CLIENT_ID');
    if (!clientSecret) missing.push('CPTAIN_CLIENT_SECRET (or CPTAIN_API_KEY)');
    
    const error = `Cptain API credentials not configured in .env file. Missing: ${missing.join(', ')}`;
    console.error('[Cptain Auth] Error:', error);
    return { token: null, error };
  }

  // Additional validation: check if values are not just whitespace
  if (clientId.length === 0 || clientSecret.length === 0) {
    const error = 'Cptain API credentials are empty or contain only whitespace. Please check your .env file.';
    console.error('[Cptain Auth] Error:', error);
    return { token: null, error };
  }

  try {
    // Build OAuth2 token endpoint URL (Keycloak/OpenID Connect format)
    const tokenUrl = `${authUrl}/realms/${realm}/protocol/openid-connect/token`;
    
    console.log('[Cptain Auth] Token URL:', tokenUrl);
    console.log('[Cptain Auth] Using OAuth2 client credentials flow');

    // Prepare form data (application/x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);

    console.log('[Cptain Auth] Sending request to:', tokenUrl);
    console.log('[Cptain Auth] Client ID (first 10 chars):', clientId.substring(0, 10) + '...');
    console.log('[Cptain Auth] Client Secret (first 10 chars):', clientSecret.substring(0, 10) + '...');

    // Make token request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log(`[Cptain Auth] Response status: ${response.status}`);

    if (!response.ok) {
      let errorText = '';
      let errorJson: any = null;
      
      try {
        errorText = await response.text();
        // Try to parse as JSON
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          // Not JSON, use as text
        }
      } catch (e) {
        errorText = 'Could not read error response';
      }
      
      console.error(`[Cptain Auth] Error ${response.status}: ${response.statusText}`);
      console.error('[Cptain Auth] Error details:', errorText.substring(0, 500));
      
      // Provide more helpful error message for 401
      if (response.status === 401) {
        const errorMsg = errorJson?.error_description || errorJson?.error || errorText;
        return {
          token: null,
          error: `Authentication failed: Invalid client credentials (401 Unauthorized). ${errorMsg}. Please verify your CPTAIN_CLIENT_ID and CPTAIN_CLIENT_SECRET in the .env file are correct and have no extra spaces or quotes.`
        };
      }
      
      return {
        token: null,
        error: `Authentication failed: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`
      };
    }

    const data = await response.json();
    console.log('[Cptain Auth] ✓✓✓ SUCCESS! Token obtained');
    console.log('[Cptain Auth] Response keys:', Object.keys(data));

    // Extract access token from OAuth2 response
    const token = data.access_token;

    if (token) {
      console.log('[Cptain Auth] ✓ Access token found!');
      return { token };
    } else {
      console.error('[Cptain Auth] ⚠️  No access_token in response');
      console.error('[Cptain Auth] Response:', JSON.stringify(data, null, 2));
      return {
        token: null,
        error: 'No access_token in authentication response',
        authData: data
      };
    }

  } catch (error) {
    console.error('[Cptain Auth] Unexpected error:', error);
    return { 
      token: null, 
      error: error instanceof Error ? error.message : 'Unknown authentication error'
    };
  }
}

/**
 * Generate flashcards using Cptain AI API (cloud-based)
 */
export async function generateCardsWithCptainAI(
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
    console.log('[Cptain] Starting card generation...');
    
    // Call Cptain API
    const apiUrl = process.env.CPTAIN_API_URL || 'https://api.cptain.nl/api/v0';
    const apiKey = process.env.CPTAIN_API_KEY; // Optional, used as fallback if OAuth2 fails
    
    console.log('[Cptain] API URL:', apiUrl);
    console.log('[Cptain] Calling API with:', { description, cardCount });
    
    // Get authentication token via OAuth2 client credentials flow (REQUIRED for Cptain API)
    console.log('[Cptain] Attempting OAuth2 authentication...');
    const authResult = await getCptainAuthToken();
    const authToken = authResult.token || null;
    
    if (authToken) {
      console.log('[Cptain] ✓ Authentication token obtained successfully!');
      console.log('[Cptain] Token (first 20 chars):', authToken.substring(0, 20) + '...');
    } else if (authResult.authSucceeded) {
      // Auth succeeded but no token - API might use API key directly
      console.log('[Cptain] ✓ Authentication succeeded (no token returned)');
      console.log('[Cptain] Auth response:', authResult.authData);
      console.log('[Cptain] Will use API key directly for requests');
    } else {
      console.log('[Cptain] ❌ Failed to authenticate:', authResult.error);
      return {
        success: false,
        error: `Authentication required but failed: ${authResult.error}. Check your credentials in .env file (CPTAIN_AUTH_URL, CPTAIN_CLIENT_ID, CPTAIN_CLIENT_SECRET, and optionally CPTAIN_REALM).`,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    // Use the correct LLM chat endpoint
    // Based on: https://api.cptain.nl/api/v0/task/llm/api/chat
    const endpoint = `${apiUrl}/task/llm/api/chat`;

    let data: any = null;
    let lastError: string = '';

    // Use OAuth2 Bearer token (primary method)
    if (!authToken) {
      throw new Error('Authentication token is required but was not obtained. Please check your credentials.');
    }

    // Try different request body formats for the LLM chat endpoint
    // The API uses Ollama with gemma3 model
    const prompt = `Generate ${cardCount} flashcards about: ${description}. Format each card as "front | back" on separate lines.`;
    
    const requestBodyFormats = [
      // Format 1: OpenAI-style chat format with gemma3 model (primary)
      {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gemma3',
        temperature: 0.7,
      },
      // Format 2: OpenAI-style chat format without model (fallback)
      {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      },
      // Format 3: Simple prompt format without model
      {
        prompt: prompt,
        temperature: 0.7,
      },
      // Format 4: Task-specific format
      {
        task: 'generate_flashcards',
        description: description,
        count: cardCount,
        format: 'front | back',
      },
      // Format 5: Direct content format
      {
        content: prompt,
      },
    ];

    for (const requestBody of requestBodyFormats) {
      try {
        console.log(`[Cptain] Trying endpoint: ${endpoint}`);
        console.log(`[Cptain] Request body format:`, Object.keys(requestBody).join(', '));
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        console.log(`[Cptain] Response status: ${response.status}`);

        if (response.ok) {
          data = await response.json();
          console.log('[Cptain] ✓ SUCCESS!');
          console.log('[Cptain] Response keys:', Object.keys(data));
          console.log('[Cptain] Response sample:', JSON.stringify(data).substring(0, 500));
          break; // Success, exit loop
        } else {
          let errorText = '';
          let errorJson: any = null;
          
          try {
            errorText = await response.text();
            // Try to parse HTML error responses to extract JSON errors
            const jsonMatch = errorText.match(/\{"detail":"[^"]+"\}/);
            if (jsonMatch) {
              try {
                errorJson = JSON.parse(jsonMatch[0]);
              } catch {}
            }
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          lastError = `${response.status} - ${errorText.substring(0, 200)}`;
          console.log(`[Cptain] Failed with format ${Object.keys(requestBody).join(', ')}: ${lastError}`);
          
          // If it's a model not found error, continue trying other formats
          if (errorJson?.detail?.includes('model') && errorJson?.detail?.includes('not found')) {
            console.log(`[Cptain] Model not found, trying next format...`);
            continue; // Try next format
          }
          
          // If it's not a 400 (bad request) or 404 (not found), don't try other formats
          if (response.status !== 400 && response.status !== 404) {
            break;
          }
        }
      } catch (endpointError) {
        lastError = endpointError instanceof Error ? endpointError.message : 'Unknown error';
        console.log(`[Cptain] Error:`, lastError);
      }
    }

    if (!data) {
      console.error('[Cptain] ❌ All attempts failed. Last error:', lastError);
      throw new Error(`Cptain API request failed on all endpoints and auth methods. Last error: ${lastError}. Check the console for detailed logs.`);
    }

    // Parse the API response - adapt based on actual response format
    let parsedCards: Array<{ front: string; back: string }> = [];

    // Try different response formats
    if (data.cards && Array.isArray(data.cards)) {
      // Format 1: Structured cards array
      parsedCards = data.cards
        .map((card: any) => ({
          front: (card.front || card.question || card.term || '').toString().trim(),
          back: (card.back || card.answer || card.definition || '').toString().trim(),
        }))
        .filter((card: any) => card.front && card.back);
    } else if (data.flashcards && Array.isArray(data.flashcards)) {
      // Format 2: flashcards array
      parsedCards = data.flashcards
        .map((card: any) => ({
          front: (card.front || card.question || card.term || '').toString().trim(),
          back: (card.back || card.answer || card.definition || '').toString().trim(),
        }))
        .filter((card: any) => card.front && card.back);
    } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      // Format 3: Chat API response (OpenAI-style: { choices: [{ message: { content: "..." } }] })
      const content = data.choices[0]?.message?.content || data.choices[0]?.content || '';
      if (content) {
        parsedCards = parseAndNormalizeFlashcards(content);
      }
    } else if (data.text || data.response || data.content || data.message?.content) {
      // Format 4: Text that needs parsing (various formats)
      const generatedText = data.text || data.response || data.content || data.message?.content;
      parsedCards = parseAndNormalizeFlashcards(generatedText);
    } else if (typeof data === 'string') {
      // Format 5: Direct text response
      parsedCards = parseAndNormalizeFlashcards(data);
    }

    if (parsedCards.length === 0) {
      console.error('Failed to parse Cptain API response:', data);
      return {
        success: false,
        error: 'No valid cards could be generated. The API response could not be parsed. Please check the console for details.',
        debug: JSON.stringify(data).substring(0, 500),
      };
    }

    // Remove duplicates
    const uniqueCards = removeDuplicateCards(parsedCards);

    // Limit to requested count
    const finalCards = uniqueCards.slice(0, cardCount);

    const percentageGenerated = (finalCards.length / cardCount) * 100;

    return {
      success: true,
      data: {
        rawText: JSON.stringify(data),
        cards: finalCards,
        count: finalCards.length,
        requestedCount: cardCount,
        warning: finalCards.length === cardCount
          ? `✓ Successfully generated exactly ${cardCount} cards with Cptain AI!`
          : finalCards.length < cardCount
          ? `Generated ${finalCards.length} out of ${cardCount} requested cards. ${
              percentageGenerated < 50
                ? 'Try generating with a more specific description or fewer cards.'
                : 'You can generate more if needed.'
            }`
          : `✓ Generated ${finalCards.length} cards!`,
      },
    };
  } catch (error) {
    console.error('Cptain AI generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: 'Could not connect to Cptain API. Please check your internet connection and API URL configuration.',
        };
      }
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'API request timed out. Please try again with fewer cards or a simpler description.',
        };
      }
      return { success: false, error: `Cptain AI generation failed: ${error.message}` };
    }

    return { success: false, error: 'Failed to generate cards with Cptain AI' };
  }
}

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

