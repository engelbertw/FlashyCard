import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getUserDeckWithCards } from "@/db/queries/decks";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddCardDialog } from "@/components/add-card-dialog";
import { BulkImportCardsDialog } from "@/components/bulk-import-cards-dialog";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import { DeleteDeckDialog } from "@/components/delete-deck-dialog";
import { Flashcard } from "@/components/flashcard";
import { Play, Pencil, Trash } from "lucide-react";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default async function DeckPage({ params }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { deckId } = await params;
  const deckIdNum = parseInt(deckId, 10);

  if (isNaN(deckIdNum)) {
    notFound();
  }

  const deckWithCards = await getUserDeckWithCards(userId, deckIdNum);

  if (!deckWithCards) {
    notFound();
  }

  const { cards, ...deck } = deckWithCards;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            ← Back to Dashboard
          </Button>
        </Link>

        {/* Deck Header */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-4xl mb-2">{deck.name}</CardTitle>
                  {deck.description && (
                    <CardDescription className="text-lg mb-2">
                      {deck.description}
                    </CardDescription>
                  )}
                  <CardDescription>
                    {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <EditDeckDialog
                    deck={deck}
                    trigger={
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DeleteDeckDialog
                    deckId={deck.id}
                    trigger={
                      <Button variant="outline" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </CardHeader>
            {cards.length > 0 && (
              <CardContent>
                <Link href={`/decks/${deckIdNum}/study`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Play className="mr-2 h-4 w-4" />
                    Start Practice Session
                  </Button>
                </Link>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Cards Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Cards</h2>
            <div className="flex gap-2">
              <BulkImportCardsDialog deckId={deckIdNum} />
              <AddCardDialog deckId={deckIdNum} />
            </div>
          </div>

          {cards.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-4">No cards yet</p>
                  <p className="text-sm mb-6">Add your first card to get started</p>
                  <AddCardDialog
                    deckId={deckIdNum}
                    trigger={<Button>+ Add Your First Card</Button>}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <Flashcard key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

