'use client';

import { useState } from 'react';
import { createBulkCardsAction } from '@/actions/card-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BulkImportCardsDialogProps {
  deckId: number;
  trigger?: React.ReactNode;
}

export function BulkImportCardsDialog({ deckId, trigger }: BulkImportCardsDialogProps) {
  const [open, setOpen] = useState(false);
  const [cardsText, setCardsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await createBulkCardsAction(deckId, cardsText);

    if (result.success) {
      setCardsText('');
      setSuccess(`Successfully imported ${result.count} card${result.count === 1 ? '' : 's'}!`);
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 2000);
    } else {
      setError(typeof result.error === 'string' ? result.error : 'Failed to import cards');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Bulk Import Cards</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Cards</DialogTitle>
          <DialogDescription>
            Paste your cards in the format: "front | back" (one per line). 
            Numbering will be automatically removed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardsText">Cards (one per line)</Label>
            <Textarea
              id="cardsText"
              value={cardsText}
              onChange={(e) => setCardsText(e.target.value)}
              placeholder={`Example:
1 | un table pour deux, s'il vous plaît. a table for two, please.
2 | je voudrais réserver une table pour ce soir. i would like to reserve a table for tonight.
3 | la carte, s'il vous plaît. the menu, please.

Or with two pipes:
1 | french phrase | english translation`}
              disabled={isLoading}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setCardsText('');
                setError(null);
                setSuccess(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !cardsText.trim()}>
              {isLoading ? 'Importing...' : 'Import Cards'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

