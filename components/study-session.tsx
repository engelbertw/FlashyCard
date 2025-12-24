'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, BookOpen, PenTool, CheckCircle2, XCircle, Trophy, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { normalizeCardText } from '@/lib/text-utils';
import { saveStudySessionAction } from '@/actions/study-actions';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface StudySessionProps {
  cards: Array<{
    id: number;
    deckId: number;
    front: string;
    back: string;
  }>;
  deckId: number;
}

export function StudySession({ cards, deckId }: StudySessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyCards, setStudyCards] = useState(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [studyMode, setStudyMode] = useState<'flip' | 'test'>('flip');
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  const [cardResults, setCardResults] = useState<Array<{ cardId: number; isCorrect: boolean }>>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<{rank: number | null, total: number, score: number | null} | null>(null);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);

  const currentCard = studyCards[currentIndex];
  const progress = ((currentIndex + 1) / studyCards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < studyCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setUserAnswer('');
      setIsAnswerChecked(false);
      setIsCorrect(null);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setUserAnswer('');
      setIsAnswerChecked(false);
      setIsCorrect(null);
    }
  };

  const generateMultipleChoiceOptions = () => {
    const correctAnswer = currentCard.back;
    
    // Get other cards' answers as distractors (wrong options)
    const otherAnswers = studyCards
      .filter(card => card.id !== currentCard.id)
      .map(card => card.back);
    
    // Shuffle and pick 3 random wrong answers
    const shuffledDistractors = otherAnswers
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Combine correct answer with distractors and shuffle
    const allOptions = [correctAnswer, ...shuffledDistractors]
      .sort(() => Math.random() - 0.5);
    
    setMultipleChoiceOptions(allOptions);
  };

  // Generate multiple choice options when card changes or mode switches
  useEffect(() => {
    if (studyMode === 'test' && currentCard && studyCards.length >= 4) {
      generateMultipleChoiceOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, studyMode, studyCards]);

  const handleMultipleChoiceAnswer = (selectedAnswer: string) => {
    const isAnswerCorrect = normalizeCardText(selectedAnswer) === normalizeCardText(currentCard.back);
    
    setUserAnswer(selectedAnswer);
    setIsCorrect(isAnswerCorrect);
    setIsAnswerChecked(true);
    setScore(prev => ({
      correct: isAnswerCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
    
    // Track this result
    setCardResults(prev => [
      ...prev,
      { cardId: currentCard.id, isCorrect: isAnswerCorrect }
    ]);
  };

  const handleToggleMode = () => {
    // Need at least 4 cards for multiple choice
    if (studyMode === 'flip' && studyCards.length < 4) {
      alert('You need at least 4 cards in your deck to use Test Mode (multiple choice)');
      return;
    }
    
    setStudyMode(studyMode === 'flip' ? 'test' : 'flip');
    setIsFlipped(false);
    setUserAnswer('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
  };

  const handleReset = () => {
    setStudyCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setUserAnswer('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setScore({ correct: 0, total: 0 });
  };

  const handleFinish = async () => {
    // Show completion screen first if in test mode
    if (studyMode === 'test' && score.total > 0) {
      setIsSessionComplete(true);
      
      // Save results in background
      setIsSaving(true);
      try {
        const result = await saveStudySessionAction({
          deckId,
          mode: studyMode,
          totalCards: score.total,
          correctAnswers: score.correct,
          cardResults,
        });
        
        // Get leaderboard rank if available
        if (result.success && result.data?.rank) {
          setLeaderboardRank(result.data.rank);
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Flip mode or no cards answered - just go back
      router.push(`/decks/${deckId}`);
    }
  };

  const isLastCard = currentIndex === studyCards.length - 1;
  const isFirstCard = currentIndex === 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Multiple choice shortcuts (A, B, C, D)
      if (studyMode === 'test' && !isAnswerChecked && multipleChoiceOptions.length > 0) {
        const key = event.key.toUpperCase();
        const optionIndex = key.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        
        if (optionIndex >= 0 && optionIndex < multipleChoiceOptions.length) {
          event.preventDefault();
          handleMultipleChoiceAnswer(multipleChoiceOptions[optionIndex]);
          return;
        }
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (studyMode === 'flip') {
            handleFlip();
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (studyMode === 'flip') {
            handleFlip();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (!isFirstCard) handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (studyMode === 'test' && !isAnswerChecked) {
            return; // Don't advance if answer hasn't been checked
          }
          if (!isLastCard) {
            handleNext();
          } else {
            handleFinish();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, isFlipped, studyCards.length, studyMode, userAnswer, isAnswerChecked, multipleChoiceOptions]);

  // Show session complete screen
  if (isSessionComplete) {
    const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const passed = percentage >= 70;
    
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {passed ? (
                <Trophy className="h-20 w-20 text-yellow-500" />
              ) : (
                <TrendingUp className="h-20 w-20 text-blue-500" />
              )}
            </div>
            <CardTitle className="text-3xl mb-2">
              {passed ? 'Great Job!' : 'Session Complete'}
            </CardTitle>
            <p className="text-muted-foreground">
              {passed 
                ? 'Excellent work! You\'ve mastered these cards.' 
                : 'Keep practicing to improve your score!'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{score.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-destructive">
                  {score.total - score.correct}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{percentage}%</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Your Performance</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    passed ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Status Message */}
            <div className={`p-4 rounded-lg border ${
              passed 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <p className="text-center text-sm">
                {isSaving ? (
                  '💾 Saving your results...'
                ) : (
                  '✅ Results saved successfully!'
                )}
              </p>
            </div>

            {/* Leaderboard Rank */}
            {leaderboardRank && leaderboardRank.rank && (
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex items-center justify-center gap-3">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-2xl font-bold">
                      #{leaderboardRank.rank} <span className="text-sm text-muted-foreground">of {leaderboardRank.total}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsSessionComplete(false);
                    setScore({ correct: 0, total: 0 });
                    setCardResults([]);
                    setCurrentIndex(0);
                    setIsAnswerChecked(false);
                    setIsCorrect(null);
                    setLeaderboardRank(null);
                  }}
                >
                  Study Again
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => router.push(`/decks/${deckId}`)}
                >
                  Back to Deck
                </Button>
              </div>
              
              {/* Challenge Button */}
              <AlertDialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Challenge a Friend
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Challenge Feature Coming Soon!</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p className="mb-4">
                          Soon you'll be able to challenge friends to beat your score of {percentage}%!
                        </p>
                        <p className="mb-2">This feature will allow you to:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Send challenges to other users</li>
                          <li>Compare scores head-to-head</li>
                          <li>Track challenge history</li>
                          <li>See who's the ultimate champion!</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                    <AlertDialogAction onClick={() => router.push(`/decks/${deckId}`)}>
                      View Leaderboard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Card {currentIndex + 1} of {studyCards.length}
            </span>
            {studyMode === 'test' && score.total > 0 && (
              <span className="text-sm text-muted-foreground">
                Score: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={studyMode === 'test' ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleMode}
              disabled={studyCards.length < 4}
              title={studyCards.length < 4 ? 'Need at least 4 cards for Test Mode' : undefined}
            >
              {studyMode === 'flip' ? (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Test Mode
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Flip Mode
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShuffle}
              disabled={isShuffled}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isShuffled && isFirstCard && score.total === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      {studyMode === 'flip' ? (
        <Card className="mb-6 min-h-[400px] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex-1 flex items-center justify-center p-8">
            <div className="text-center w-full max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                {isFlipped ? 'Back' : 'Front'}
              </p>
              <div
                className="text-3xl font-bold whitespace-pre-wrap break-words leading-relaxed"
                onClick={handleFlip}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-t bg-muted/50">
            <div className="flex justify-center py-4">
              <Button onClick={handleFlip} size="lg" variant="outline">
                {isFlipped ? 'Show Front' : 'Show Back'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 min-h-[500px] flex flex-col transition-all duration-300">
          <CardHeader className="flex-1 flex items-center justify-center p-8">
            <div className="text-center w-full space-y-8">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-4">
                  Question
                </p>
                <div className="text-3xl font-bold whitespace-pre-wrap break-words mb-8 leading-relaxed">
                  {currentCard.front}
                </div>
              </div>

              {!isAnswerChecked ? (
                <div className="space-y-4 w-full max-w-3xl mx-auto">
                  <div className="grid grid-cols-1 gap-3">
                    {multipleChoiceOptions.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="lg"
                        className="h-auto min-h-[60px] py-4 px-6 text-left justify-start hover:bg-primary/10 hover:border-primary transition-all"
                        onClick={() => handleMultipleChoiceAnswer(option)}
                      >
                        <span className="flex items-start gap-4 w-full">
                          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-lg leading-relaxed break-words whitespace-normal text-left pt-1">
                            {option}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Click an option or press {multipleChoiceOptions.map((_, i) => 
                      String.fromCharCode(65 + i)
                    ).join(', ')} on your keyboard
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg border-2 ${
                    isCorrect 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <span className="text-2xl font-bold text-green-500">Correct!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-8 w-8 text-red-500" />
                          <span className="text-2xl font-bold text-red-500">Incorrect</span>
                        </>
                      )}
                    </div>
                    {!isCorrect && (
                      <div className="space-y-3 text-base max-w-xl mx-auto">
                        <div className="p-3 bg-background/50 rounded">
                          <span className="text-muted-foreground font-medium">Your answer: </span>
                          <span className="line-through text-red-500 break-words whitespace-normal">
                            {userAnswer}
                          </span>
                        </div>
                        <div className="p-3 bg-background/50 rounded">
                          <span className="text-muted-foreground font-medium">Correct answer: </span>
                          <span className="font-bold text-green-500 break-words whitespace-normal">
                            {currentCard.back}
                          </span>
                        </div>
                      </div>
                    )}
                    {isCorrect && (
                      <p className="text-center text-muted-foreground mt-3">
                        Great job! Click next to continue.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={isFirstCard}
          className="flex-1"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          Previous
        </Button>

        {isLastCard ? (
          <Button
            size="lg"
            onClick={handleFinish}
            disabled={studyMode === 'test' && !isAnswerChecked}
            className="flex-1"
          >
            Finish Session
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNext}
            disabled={studyMode === 'test' && !isAnswerChecked}
            className="flex-1"
          >
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mb-1">
          <strong>Keyboard Shortcuts:</strong>
        </p>
        {studyMode === 'flip' ? (
          <p>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Space</kbd> or{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Enter</kbd> to flip •{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">←</kbd>{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">→</kbd> to navigate
          </p>
        ) : (
          <p>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">A</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono ml-1">B</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono ml-1">C</kbd>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono ml-1">D</kbd> to select •{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">←</kbd>{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">→</kbd> to navigate
          </p>
        )}
      </div>
    </div>
  );
}

