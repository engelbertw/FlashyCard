import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserDecks } from "@/db/queries/decks";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { AuthButtons } from "@/components/auth-buttons";

export default async function Home() {
  const { userId } = await auth();

  // If not authenticated, show landing page with auth buttons
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-6xl font-bold tracking-tight">
              FlashyCardy
            </CardTitle>
            <CardDescription className="text-xl">
              Your personal flashcard platform
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AuthButtons />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authenticated, show decks page
  const decks = await getUserDecks(userId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Decks</h1>
              <p className="text-muted-foreground">
                Manage your flashcard decks
              </p>
            </div>
            <CreateDeckDialog
              trigger={<Button size="lg">+ Create Deck</Button>}
              redirectAfterCreate={true}
            />
          </div>
        </div>

        {/* Decks Grid */}
        {decks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-4">No decks yet</p>
                <p className="text-sm mb-6">Create your first deck to get started</p>
                <CreateDeckDialog
                  trigger={<Button>+ Create Your First Deck</Button>}
                  redirectAfterCreate={true}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-xl">{deck.name}</CardTitle>
                    {deck.description && (
                      <CardDescription className="line-clamp-2">
                        {deck.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(deck.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
