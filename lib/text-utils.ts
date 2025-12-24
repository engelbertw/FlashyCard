/**
 * Text normalization utilities for flashcards
 */

/**
 * Normalize text by:
 * - Converting to lowercase
 * - Removing strange/invalid characters
 * - Trimming extra whitespace
 * - Keeping only letters, numbers, spaces, and common punctuation
 */
export function normalizeCardText(text: string): string {
  if (!text) return '';
  
  return text
    // Convert to lowercase
    .toLowerCase()
    // Remove control characters and other non-printable characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove parenthetical translations like "(apple)" or "(word)"
    .replace(/\s*\([^)]*\)/g, '')
    // Remove quotes at start/end that might be left over
    .replace(/^["']+|["']+$/g, '')
    // Keep: letters (all languages), numbers, spaces, and common punctuation
    // More permissive - keeps most useful characters
    .replace(/[^\p{L}\p{N}\s.,!?;:()\-'"/&%$€£¥+*=@#]/gu, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Clean AI-generated text that might have formatting issues
 */
export function cleanAIGeneratedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown formatting (bold, italic, code, strikethrough)
    .replace(/[*_~`#]/g, '')
    // Remove bullet points and list markers
    .replace(/^[\s]*[-•●▪▫◦⦿⦾]\s*/gm, '')
    // Remove numbering (1., 2., 1), a., etc.)
    .replace(/^\s*\d+[\.)]\s*/gm, '')
    .replace(/^\s*[a-z][\.)]\s*/gm, '')
    // Remove quotes at start/end
    .replace(/^["']+|["']+$/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Parse AI-generated flashcards and normalize them
 * Expected format: "Front | Back" or "Front: Back"
 */
export function parseAndNormalizeFlashcards(
  aiResponse: string
): Array<{ front: string; back: string }> {
  if (!aiResponse) return [];

  const cards: Array<{ front: string; back: string }> = [];
  const lines = aiResponse.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = cleanAIGeneratedText(line);
    
    if (!trimmedLine) continue;
    
    // Skip lines that are too short to be valid cards
    if (trimmedLine.length < 3) continue;
    
    // Skip common header/intro lines and meta labels
    const lowerLine = trimmedLine.toLowerCase();
    if (
      lowerLine.includes('flashcard') ||
      lowerLine.includes('here are') ||
      lowerLine.includes('here is') ||
      lowerLine.startsWith('okay') ||
      lowerLine.startsWith('sure') ||
      lowerLine.startsWith('certainly') ||
      lowerLine.startsWith('of course') ||
      lowerLine.includes('vocabulary') ||
      lowerLine.includes('each with') ||
      lowerLine.includes('different dutch') ||
      lowerLine.includes('different english') ||
      lowerLine === 'cards:' ||
      lowerLine === 'cards' ||
      lowerLine === 'output' ||
      lowerLine === 'topic:' ||
      lowerLine.startsWith('generated') ||
      lowerLine.includes('format:') ||
      lowerLine.includes('examples:') ||
      lowerLine.includes('perfect examples') ||
      lowerLine.startsWith('term |') ||
      lowerLine.startsWith('translation |') ||
      lowerLine.startsWith('explanation |') ||
      lowerLine.startsWith('front |') ||
      lowerLine.startsWith('back |') ||
      lowerLine.startsWith('leftside |') ||
      lowerLine.startsWith('rightside |') ||
      lowerLine.startsWith('no numbering') ||
      lowerLine.startsWith('name:') ||
      lowerLine.startsWith('description:') ||
      lowerLine.startsWith('rules:') ||
      // Skip lines that are just numbers or punctuation
      /^[\d\s,]+$/.test(trimmedLine) ||
      // Skip lines that are too long (likely explanatory text)
      trimmedLine.length > 100 ||
      // Skip lines that look like instructions
      lowerLine.includes('must create') ||
      lowerLine.includes('copy this') ||
      lowerLine.includes('each line') ||
      lowerLine.includes('unique cards')
    ) {
      continue;
    }

    // Try multiple separators in order of preference
    let parts: string[] = [];
    const separators = [
      { char: '|', priority: 1 },
      { char: ' | ', priority: 2 },
      { char: ':', priority: 3 },
      { char: ' - ', priority: 4 },
      { char: '-', priority: 5 },
      { char: '\t', priority: 6 },
      { char: '=', priority: 7 },
      { char: ' / ', priority: 8 },
    ];
    
    // Try each separator
    for (const sep of separators) {
      if (trimmedLine.includes(sep.char)) {
        const splitIndex = trimmedLine.indexOf(sep.char);
        const front = trimmedLine.substring(0, splitIndex).trim();
        const back = trimmedLine.substring(splitIndex + sep.char.length).trim();
        
        if (front && back && front !== back) {
          parts = [front, back];
          break;
        }
      }
    }

    // If we found valid parts
    if (parts.length === 2) {
      const front = normalizeCardText(parts[0]);
      const back = normalizeCardText(parts[1]);
      
      // Skip meta-words that shouldn't appear in actual flashcards
      const metaWords = [
        'woorden', 'woord', 'tekst', 'text', 'word', 'words',
        'translation', 'vertaling', 'vertalingen', 'english', 'dutch',
        'term', 'definition', 'front', 'back',
        'leftside', 'rightside', 'example', 'format',
        'native', 'language', 'taal'
      ];
      
      const frontLower = front.toLowerCase().trim();
      const backLower = back.toLowerCase().trim();
      
      // Check if front or back is ONLY a meta-word (exact match)
      const isMetaWord = 
        metaWords.includes(frontLower) || 
        metaWords.includes(backLower) ||
        // Also check if it starts with these words followed by punctuation
        metaWords.some(word => frontLower === word || backLower === word);
      
      // Only add if both sides have content, are different, and not meta-words
      if (front && back && front !== back && !isMetaWord) {
        cards.push({ front, back });
      }
    }
  }

  return cards;
}

/**
 * Remove duplicate cards (case-insensitive comparison)
 * Also removes cards where the back side is repeated too many times (AI pattern bug)
 */
export function removeDuplicateCards(
  cards: Array<{ front: string; back: string }>
): Array<{ front: string; back: string }> {
  const seen = new Set<string>();
  const backCounts = new Map<string, number>();
  const unique: Array<{ front: string; back: string }> = [];

  // First pass - count how many times each back appears
  for (const card of cards) {
    const backKey = card.back.toLowerCase();
    backCounts.set(backKey, (backCounts.get(backKey) || 0) + 1);
  }

  // Second pass - only keep cards where back appears <= 2 times
  for (const card of cards) {
    const key = `${card.front.toLowerCase()}|${card.back.toLowerCase()}`;
    const backKey = card.back.toLowerCase();
    const backCount = backCounts.get(backKey) || 0;
    
    // Skip if we've seen this exact card before
    if (seen.has(key)) {
      continue;
    }
    
    // Skip if the back side appears more than 2 times (AI repetition bug)
    if (backCount > 2) {
      console.log(`Filtering out card with repeated back: ${card.back} (appears ${backCount} times)`);
      continue;
    }
    
    seen.add(key);
    unique.push(card);
  }

  return unique;
}

