'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDeckAction } from '@/actions/deck-actions';
import { generateCardsWithAI } from '@/actions/ai-actions';
import { getRecentDeckTemplates, generateSmartTemplates } from '@/actions/template-actions';
import { normalizeCardText } from '@/lib/text-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Cpu } from 'lucide-react';

interface CreateDeckDialogProps {
  trigger?: React.ReactNode;
  redirectAfterCreate?: boolean;
}

export function CreateDeckDialog({ trigger, redirectAfterCreate = false }: CreateDeckDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cardCount, setCardCount] = useState(10); // Optimized for Gemma3 270M model
  const [cardsText, setCardsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner');
  const [recentTemplates, setRecentTemplates] = useState<any[]>([]);
  const [smartTemplates, setSmartTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Template suggestions with topics
  const descriptionTemplates = [
    { 
      id: 'dutch-english',
      label: 'Dutch → English',
      baseDescription: 'dutch words with english translations',
      deckName: 'Dutch Vocabulary',
      topics: ['food', 'animals', 'colors', 'numbers', 'family', 'verbs', 'adjectives', 'greetings']
    },
    { 
      id: 'spanish-english',
      label: 'Spanish → English',
      baseDescription: 'spanish vocabulary with english translations',
      deckName: 'Spanish Basics',
      topics: ['food', 'animals', 'colors', 'numbers', 'family', 'verbs', 'travel', 'greetings']
    },
    { 
      id: 'french-english',
      label: 'French → English',
      baseDescription: 'french phrases with english translations',
      deckName: 'French Phrases',
      topics: ['food', 'travel', 'shopping', 'restaurant', 'directions', 'verbs', 'adjectives']
    },
    { 
      id: 'german-english',
      label: 'German → English',
      baseDescription: 'german words with english translations',
      deckName: 'German Basics',
      topics: ['food', 'animals', 'colors', 'numbers', 'family', 'verbs', 'compound words']
    },
    { 
      id: 'geography',
      label: 'Geography',
      baseDescription: 'geography facts and locations',
      deckName: 'Geography',
      topics: ['capitals', 'countries', 'rivers', 'mountains', 'oceans', 'flags', 'landmarks']
    },
    { 
      id: 'math',
      label: 'Mathematics',
      baseDescription: 'mathematical concepts and formulas',
      deckName: 'Math Concepts',
      topics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics', 'formulas']
    },
    { 
      id: 'science',
      label: 'Science',
      baseDescription: 'science concepts and definitions',
      deckName: 'Science',
      topics: ['biology', 'chemistry', 'physics', 'anatomy', 'elements', 'laws']
    },
    { 
      id: 'history',
      label: 'History',
      baseDescription: 'historical events and dates',
      deckName: 'History',
      topics: ['wars', 'revolutions', 'inventions', 'leaders', 'ancient civilizations', 'modern history']
    },
  ];

  // Load user's recent and smart templates when dialog opens
  useEffect(() => {
    if (open) {
      loadUserTemplates();
    }
  }, [open]);

  const loadUserTemplates = async () => {
    setLoadingTemplates(true);
    
    try {
      const [recentResult, smartResult] = await Promise.all([
        getRecentDeckTemplates(),
        generateSmartTemplates(),
      ]);

      if (recentResult.success && recentResult.data) {
        setRecentTemplates(recentResult.data);
      }

      if (smartResult.success && smartResult.data) {
        setSmartTemplates(smartResult.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    
    setLoadingTemplates(false);
  };

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template.id);
    setSelectedTopic(''); // Reset topic selection
    setCustomTopic(''); // Reset custom topic
    
    // Build the initial description
    const levelPrefix = difficultyLevel === 'beginner' ? 'basic' : difficultyLevel === 'intermediate' ? 'common' : 'advanced';
    
    // For recent templates, use the exact description
    if (template.isRecent) {
      setDescription(template.baseDescription);
    } else {
      setDescription(`${levelPrefix} ${template.baseDescription}`);
    }
    
    if (!name) {
      setName(template.deckName);
    }
  };

  const findTemplate = (templateId: string | null) => {
    if (!templateId) return null;
    return (
      descriptionTemplates.find(t => t.id === templateId) ||
      smartTemplates.find(t => t.id === templateId) ||
      recentTemplates.find(t => t.id === templateId)
    );
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCustomTopic(''); // Clear custom topic if selecting from list
    
    const template = findTemplate(selectedTemplate);
    if (template) {
      if (template.isRecent) {
        // For recent templates, append topic to existing description
        setDescription(`${template.baseDescription} about ${topic}`);
      } else {
        const levelPrefix = difficultyLevel === 'beginner' ? 'basic' : difficultyLevel === 'intermediate' ? 'common' : 'advanced';
        setDescription(`${levelPrefix} ${template.baseDescription} about ${topic}`);
      }
    }
  };

  const handleCustomTopicChange = (topic: string) => {
    setCustomTopic(topic);
    setSelectedTopic(''); // Clear predefined topic if entering custom
    
    const template = findTemplate(selectedTemplate);
    if (template && topic.trim()) {
      if (template.isRecent) {
        setDescription(`${template.baseDescription} about ${topic.trim()}`);
      } else {
        const levelPrefix = difficultyLevel === 'beginner' ? 'basic' : difficultyLevel === 'intermediate' ? 'common' : 'advanced';
        setDescription(`${levelPrefix} ${template.baseDescription} about ${topic.trim()}`);
      }
    } else if (template) {
      if (template.isRecent) {
        setDescription(template.baseDescription);
      } else {
        const levelPrefix = difficultyLevel === 'beginner' ? 'basic' : difficultyLevel === 'intermediate' ? 'common' : 'advanced';
        setDescription(`${levelPrefix} ${template.baseDescription}`);
      }
    }
  };

  const handleDifficultyChange = (level: 'beginner' | 'intermediate' | 'expert') => {
    setDifficultyLevel(level);
    
    const template = findTemplate(selectedTemplate);
    if (template && !template.isRecent) {
      const levelPrefix = level === 'beginner' ? 'basic' : level === 'intermediate' ? 'common' : 'advanced';
      const topicPart = selectedTopic ? ` about ${selectedTopic}` : customTopic.trim() ? ` about ${customTopic.trim()}` : '';
      setDescription(`${levelPrefix} ${template.baseDescription}${topicPart}`);
    }
  };

  const parseCards = (text: string): Array<{ front: string; back: string }> => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').filter(line => line.trim());
    const cards = [];
    
    for (const line of lines) {
      // Support multiple separators: | or ; or tab
      const separators = ['|', ';', '\t'];
      let front = '';
      let back = '';
      
      for (const sep of separators) {
        if (line.includes(sep)) {
          const parts = line.split(sep).map(p => p.trim());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            front = parts[0];
            back = parts[1];
            break;
          }
        }
      }
      
      if (front && back) {
        // Normalize text: lowercase, remove strange characters
        const normalizedFront = normalizeCardText(front);
        const normalizedBack = normalizeCardText(back);
        
        // Only add if both sides have content after normalization
        if (normalizedFront && normalizedBack) {
          cards.push({ 
            front: normalizedFront, 
            back: normalizedBack 
          });
        }
      }
    }
    
    return cards;
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setError(null);
    setWarning(null);

    if (!description.trim()) {
      setError('Please enter a description to generate cards with AI');
      setIsGenerating(false);
      return;
    }

    const result = await generateCardsWithAI(description, cardCount);

    if (result.success && result.data) {
      // Convert parsed cards back to text format for the textarea
      const cardsText = result.data.cards
        .map((card: { front: string; back: string }) => `${card.front} | ${card.back}`)
        .join('\n');
      setCardsText(cardsText);
      
      // Show warning if the count doesn't match
      if (result.data.warning) {
        setWarning(result.data.warning);
      } else if (result.data.count < cardCount * 0.5) {
        // Less than 50% generated - suggest smaller batch
        setWarning(`⚠️ Only generated ${result.data.count} out of ${cardCount} requested cards.

💡 Suggestions to get more cards:
• Try ${Math.ceil(cardCount / 2)} cards instead of ${cardCount}
• Be more specific: "${description} - common words"
• Generate multiple smaller batches
• The Gemma3 270M model is small - larger models work better for big requests

You can still create the deck with these ${result.data.count} cards, or try generating again.`);
      } else if (result.data.count < cardCount) {
        setWarning(`⚠️ Generated ${result.data.count} out of ${cardCount} requested cards. This is normal for the small Gemma3 model. You can generate again to add more!`);
      } else if (result.data.count === cardCount) {
        setWarning(`✓ Successfully generated ${result.data.count} cards!`);
      } else {
        setWarning(`✓ Generated ${result.data.count} cards (requested ${cardCount})!`);
      }
    } else {
      let errorMsg = result.error || 'Failed to generate cards';
      
      // If there's debug info, show a hint
      if ((result as any).debug) {
        errorMsg += '\n\n💡 Tip: Try a more specific topic like "common Dutch verbs" or "Spanish numbers 1-20"';
        console.log('AI Debug Output:', (result as any).debug);
      }
      
      setError(errorMsg);
    }

    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Deck name is required');
      setIsLoading(false);
      return;
    }

    const cards = parseCards(cardsText);
    
    if (cards.length === 0) {
      setError('Please add at least one card. Use format: Front | Back (one per line)');
      setIsLoading(false);
      return;
    }

    const result = await createDeckAction({
      name,
      description: description || undefined,
      cards,
    });

    if (result.success) {
      // Reset form
      setName('');
      setDescription('');
      setCardsText('');
      setOpen(false);
      
      // Optionally redirect to the new deck
      if (redirectAfterCreate && result.data) {
        router.push(`/decks/${result.data.id}`);
      }
    } else {
      setError(typeof result.error === 'string' ? result.error : 'Failed to create deck');
    }

    setIsLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset on close
      setName('');
      setDescription('');
      setCardCount(10);
      setCardsText('');
      setError(null);
      setWarning(null);
      setSelectedTemplate(null);
      setSelectedTopic('');
      setCustomTopic('');
      setDifficultyLevel('beginner');
      setRecentTemplates([]);
      setSmartTemplates([]);
    }
  };

  const parsedCards = parseCards(cardsText);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>+ Create Deck</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deck with Cards</DialogTitle>
          <DialogDescription>
            Let local Gemma3 AI generate cards for you, or paste your own in the format <code className="text-xs bg-muted px-1 py-0.5 rounded">Front | Back</code>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Deck Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dutch Food Vocabulary"
              disabled={isLoading || isGenerating}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">
              Description * <span className="text-xs text-muted-foreground">(used by AI to generate cards)</span>
            </Label>
            
            {/* Loading Templates Indicator */}
            {loadingTemplates && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading your personalized templates...
              </div>
            )}

            {/* Recent Deck Templates */}
            {recentTemplates.length > 0 && (
              <div className="space-y-1 border rounded-lg p-3 bg-primary/5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <span>⭐</span> Your Recent Decks:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentTemplates.map((template) => (
                    <Button
                      key={template.id}
                      type="button"
                      variant={selectedTemplate === template.id ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleTemplateClick(template)}
                      disabled={isLoading || isGenerating}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Smart AI Suggestions */}
            {smartTemplates.length > 0 && (
              <div className="space-y-1 border rounded-lg p-3 bg-green-500/5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <span>🤖</span> Smart Suggestions (based on your history):
                </p>
                <div className="flex flex-wrap gap-2">
                  {smartTemplates.map((template) => (
                    <Button
                      key={template.id}
                      type="button"
                      variant={selectedTemplate === template.id ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleTemplateClick(template)}
                      disabled={isLoading || isGenerating}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Quick Templates */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Standard Templates:</p>
              <div className="flex flex-wrap gap-2">
                {descriptionTemplates.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleTemplateClick(template)}
                    disabled={isLoading || isGenerating}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Difficulty Level Selector */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Difficulty Level:</p>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={difficultyLevel === level ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() => handleDifficultyChange(level)}
                    disabled={isLoading || isGenerating}
                  >
                    {level === 'beginner' ? '🌱 Beginner' : level === 'intermediate' ? '📚 Intermediate' : '🎓 Expert'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Topic Selector (shown when a template is selected) */}
            {selectedTemplate && (() => {
              // Find the template in all sources
              const template = 
                descriptionTemplates.find(t => t.id === selectedTemplate) ||
                smartTemplates.find(t => t.id === selectedTemplate) ||
                recentTemplates.find(t => t.id === selectedTemplate);
              
              // Only show topic selector if template has topics (not for recent decks)
              if (template && template.topics && template.topics.length > 0) {
                return (
                  <div className="space-y-1 border rounded-lg p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground font-medium">Select or Add a Topic:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.topics.map((topic: string) => (
                        <Button
                          key={topic}
                          type="button"
                          variant={selectedTopic === topic ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleTopicSelect(topic)}
                          disabled={isLoading || isGenerating}
                        >
                          {topic}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        value={customTopic}
                        onChange={(e) => handleCustomTopicChange(e.target.value)}
                        placeholder="Or type your own topic..."
                        disabled={isLoading || isGenerating}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., basic italian food words with english translations, advanced french verbs with conjugations"
              disabled={isLoading || isGenerating}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Select a template, choose difficulty level (beginner/intermediate/expert), and pick a topic. Description auto-updates!
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardCount">Number of Cards to Generate</Label>
            <Input
              id="cardCount"
              type="number"
              min={1}
              max={100}
              value={cardCount}
              onChange={(e) => setCardCount(parseInt(e.target.value) || 10)}
              disabled={isLoading || isGenerating}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground">
              ⚡ <strong>Best results: 5-10 cards per generation.</strong> The small Gemma3 270M model works better with smaller batches. Generate multiple times for larger decks.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isLoading || isGenerating || !description.trim()}
              className="flex-1"
              variant="secondary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating {cardCount} cards with Gemma3...
                </>
              ) : (
                <>
                  <Cpu className="mr-2 h-4 w-4" />
                  Generate {cardCount} Card{cardCount !== 1 ? 's' : ''} with Gemma3
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            🖥️ Uses Gemma3 AI running locally on your computer (free, private, offline)
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cards">
                Cards * <span className="text-xs text-muted-foreground">(AI-generated or paste your own)</span>
              </Label>
              {parsedCards.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {parsedCards.length} cards detected
                </span>
              )}
            </div>
            <Textarea
              id="cards"
              value={cardsText}
              onChange={(e) => setCardsText(e.target.value)}
              placeholder={isGenerating ? "AI is generating your cards..." : "Click 'Generate with AI' or paste cards manually:\nApple | Appel\nBread | Brood\nCheese | Kaas\n..."}
              disabled={isLoading || isGenerating}
              rows={16}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>💡 Format: Front | Back (one per line)</span>
              {parsedCards.length > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ Ready to create {parsedCards.length} cards
                </span>
              )}
            </div>
          </div>

          {parsedCards.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Preview (first 5 cards)</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30 max-h-[200px] overflow-y-auto">
                {parsedCards.slice(0, 5).map((card, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono w-6">{index + 1}.</span>
                    <span className="flex-1 font-medium">{card.front}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="flex-1">{card.back}</span>
                  </div>
                ))}
                {parsedCards.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ... and {parsedCards.length - 5} more cards
                  </p>
                )}
              </div>
            </div>
          )}
          
          {warning && (
            <div className={`text-sm p-3 rounded-md whitespace-pre-line ${
              warning.includes('✓') 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                : warning.includes('⚠️')
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
            }`}>
              {warning}
            </div>
          )}
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading || isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isGenerating || !name.trim() || parsedCards.length === 0}>
              {isLoading ? 'Creating...' : `Create Deck with ${parsedCards.length} Cards`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

