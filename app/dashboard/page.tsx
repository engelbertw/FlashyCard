import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserDecks } from "@/db/queries/decks";
import { getUserStudySessions, getGlobalLeaderboard } from "@/db/queries/study-sessions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { Trophy, TrendingUp, Calendar, Target, BarChart3, Crown, Medal } from "lucide-react";
import { clerkClient } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const [decks, recentSessions, globalLeaderboard] = await Promise.all([
    getUserDecks(userId),
    getUserStudySessions(userId, 5),
    getGlobalLeaderboard(5),
  ]);

  // Calculate overall statistics
  const totalSessions = recentSessions.length;
  const averageScore = totalSessions > 0 
    ? Math.round(recentSessions.reduce((sum, s) => sum + (s.correctAnswers / s.totalCards * 100), 0) / totalSessions)
    : 0;
  const totalCardsStudied = recentSessions.reduce((sum, s) => sum + s.totalCards, 0);

  // Fetch user details for leaderboard
  const leaderboardUserIds = globalLeaderboard.map(entry => entry.userId);
  const leaderboardUsers = await Promise.all(
    leaderboardUserIds.map(async (id) => {
      try {
        const user = await (await clerkClient()).users.getUser(id);
        return {
          id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
        };
      } catch (error) {
        return {
          id,
          name: 'Unknown User',
        };
      }
    })
  );

  const userMap = new Map(leaderboardUsers.map(u => [u.id, u]));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-4xl">Dashboard</CardTitle>
            <CardDescription className="text-lg">
              Welcome to your FlashyCardy dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Statistics Overview */}
        {totalSessions > 0 && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSessions}</div>
                <p className="text-xs text-muted-foreground">
                  Study sessions completed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Across all sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cards Studied</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCardsStudied}</div>
                <p className="text-xs text-muted-foreground">
                  Total cards practiced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Session</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(recentSessions[0].completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(recentSessions[0].completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Global Leaderboard */}
        {globalLeaderboard.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>See how others are doing</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/leaderboards">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalLeaderboard.map((entry, index) => {
                  const user = userMap.get(entry.userId);
                  const isCurrentUser = entry.userId === userId;
                  const rank = index + 1;
                  
                  return (
                    <div 
                      key={entry.userId}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        isCurrentUser ? 'bg-primary/10 border-primary' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-center w-8">
                        {rank === 1 && <Crown className="h-6 w-6 text-yellow-500" />}
                        {rank === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                        {rank === 3 && <Medal className="h-6 w-6 text-orange-600" />}
                        {rank > 3 && (
                          <span className="text-xl font-bold text-muted-foreground">
                            {rank}
                          </span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {user?.name || 'Unknown User'}
                          {isCurrentUser && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.totalSessions} sessions • {entry.totalCards} cards
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {Math.round(entry.averageScore)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          avg
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Study Sessions */}
        {recentSessions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Recent Study Sessions</CardTitle>
                  <CardDescription>Your latest practice results</CardDescription>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions.map((session) => {
                  const percentage = Math.round((session.correctAnswers / session.totalCards) * 100);
                  const isPassed = percentage >= 70;
                  
                  return (
                    <Link 
                      key={session.id} 
                      href={`/decks/${session.deckId}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold">{session.deckName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.completedAt).toLocaleDateString()} • {session.mode === 'test' ? 'Test Mode' : 'Flip Mode'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {session.correctAnswers}/{session.totalCards}
                            </div>
                            <div className={`text-sm font-medium ${isPassed ? 'text-green-500' : 'text-orange-500'}`}>
                              {percentage}%
                            </div>
                          </div>
                          {isPassed && <Trophy className="h-5 w-5 text-yellow-500" />}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Quick Actions</CardTitle>
            <CardDescription>Get started with your flashcards</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/decks">View All Decks</Link>
            </Button>
            <CreateDeckDialog
              trigger={<Button size="lg" variant="outline">Create New Deck</Button>}
              redirectAfterCreate={true}
            />
          </CardContent>
        </Card>

        {/* Recent Decks */}
        {decks.length > 0 ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">Your Decks</CardTitle>
              <CardDescription>Recently created decks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {decks.map((deck) => (
                  <Link key={deck.id} href={`/decks/${deck.id}`} className="block transition-transform hover:scale-105">
                    <Card className="h-full cursor-pointer">
                      <CardHeader>
                        <CardTitle>{deck.name}</CardTitle>
                        {deck.description && (
                          <CardDescription>{deck.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Updated: {new Date(deck.updatedAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">No Decks Yet</CardTitle>
              <CardDescription>Create your first deck to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateDeckDialog
                trigger={<Button size="lg">+ Create Your First Deck</Button>}
                redirectAfterCreate={true}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

