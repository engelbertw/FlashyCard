import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getUserDeckWithCards } from "@/db/queries/decks";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StudySession } from "@/components/study-session";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ deckId: string }>;
}

export default async function StudyPage({ params }: PageProps) {
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

  // Redirect back to deck if no cards
  if (cards.length === 0) {
    redirect(`/decks/${deckId}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/decks/${deckId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deck
            </Button>
          </Link>
        </div>

        {/* Deck Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{deck.name}</h1>
          <p className="text-muted-foreground">
            Study Mode - {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </p>
        </div>

        {/* Study Session */}
        <StudySession cards={cards} deckId={deckIdNum} />
      </div>
    </div>
  );
}

