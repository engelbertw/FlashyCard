import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getUserDeckWithCards } from "@/db/queries/decks";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
        {/* Deck Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl">{deck.name}</CardTitle>
              {deck.description && (
                <CardDescription className="text-lg">
                  {deck.description}
                </CardDescription>
              )}
              <CardDescription>
                {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Cards List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Cards</h2>
            <Button>+ Add Card</Button>
          </div>

          {cards.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-4">No cards yet</p>
                  <p className="text-sm">Add your first card to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <Card key={card.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Front</CardTitle>
                    <CardDescription className="text-base font-normal text-foreground">
                      {card.front}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      Back
                    </p>
                    <p className="text-base">{card.back}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

