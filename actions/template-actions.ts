'use server';

import { auth } from '@clerk/nextjs/server';
import { getRecentDecksForTemplates } from '@/db/queries/decks';

/**
 * Get user's recent decks as template suggestions
 */
export async function getRecentDeckTemplates() {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  try {
    const recentDecks = await getRecentDecksForTemplates(userId, 5);
    
    // Format as templates
    const templates = recentDecks.map(deck => ({
      id: `recent-${deck.id}`,
      label: deck.name,
      baseDescription: deck.description || '',
      deckName: deck.name,
      isRecent: true,
      createdAt: deck.createdAt,
    }));
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching recent deck templates:', error);
    return { success: false, error: 'Failed to fetch templates', data: [] };
  }
}

/**
 * Generate AI-powered template suggestions based on user's deck history
 */
export async function generateSmartTemplates() {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  try {
    const recentDecks = await getRecentDecksForTemplates(userId, 10);
    
    if (recentDecks.length === 0) {
      return { success: true, data: [] };
    }

    // Analyze deck descriptions to find patterns
    const descriptions = recentDecks.map(d => d.description).filter(Boolean);
    
    // Simple pattern detection (can be enhanced with AI later)
    const patterns = {
      hasLanguage: descriptions.some(d => 
        d.toLowerCase().includes('english') || 
        d.toLowerCase().includes('dutch') || 
        d.toLowerCase().includes('spanish') ||
        d.toLowerCase().includes('french') ||
        d.toLowerCase().includes('german')
      ),
      hasGeography: descriptions.some(d => 
        d.toLowerCase().includes('capital') || 
        d.toLowerCase().includes('country') || 
        d.toLowerCase().includes('city')
      ),
      hasScience: descriptions.some(d => 
        d.toLowerCase().includes('science') || 
        d.toLowerCase().includes('biology') || 
        d.toLowerCase().includes('chemistry')
      ),
      hasBooks: descriptions.some(d => 
        d.toLowerCase().includes('book') || 
        d.toLowerCase().includes('author') || 
        d.toLowerCase().includes('literature')
      ),
      hasMovies: descriptions.some(d => 
        d.toLowerCase().includes('movie') || 
        d.toLowerCase().includes('film') || 
        d.toLowerCase().includes('director')
      ),
    };

    const suggestions = [];

    // Generate smart suggestions based on patterns
    if (patterns.hasBooks) {
      suggestions.push({
        id: 'smart-books',
        label: 'Books & Authors',
        baseDescription: 'famous books with their authors',
        deckName: 'Books & Authors',
        topics: ['dutch literature', 'classic novels', 'bestsellers', 'poetry', 'non-fiction'],
      });
    }

    if (patterns.hasMovies) {
      suggestions.push({
        id: 'smart-movies',
        label: 'Movies & Directors',
        baseDescription: 'famous movies with their directors',
        deckName: 'Movies & Directors',
        topics: ['dutch cinema', 'hollywood classics', 'european films', 'documentaries'],
      });
    }

    if (patterns.hasLanguage) {
      suggestions.push({
        id: 'smart-advanced-vocab',
        label: 'Advanced Vocabulary',
        baseDescription: 'advanced vocabulary with definitions',
        deckName: 'Advanced Vocabulary',
        topics: ['idioms', 'business terms', 'academic words', 'slang'],
      });
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error('Error generating smart templates:', error);
    return { success: false, error: 'Failed to generate suggestions', data: [] };
  }
}

