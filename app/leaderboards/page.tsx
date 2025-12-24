import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGlobalLeaderboard, getAllDecksLeaderboards } from "@/db/queries/study-sessions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Crown, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";

export default async function LeaderboardsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const [globalLeaderboard, deckLeaderboards] = await Promise.all([
    getGlobalLeaderboard(10),
    getAllDecksLeaderboards(5),
  ]);

  // Fetch user details for global leaderboard
  const userIds = globalLeaderboard.map(entry => entry.userId);
  const users = await Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await (await clerkClient()).users.getUser(id);
        return {
          id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
          imageUrl: user.imageUrl,
        };
      } catch (error) {
        return {
          id,
          name: 'Unknown User',
          imageUrl: null,
        };
      }
    })
  );

  const userMap = new Map(users.map(u => [u.id, u]));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 text-yellow-500" />
              <div>
                <CardTitle className="text-4xl">Leaderboards</CardTitle>
                <CardDescription className="text-lg">
                  See how you compare with other users
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Global Leaderboard */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  Global Top Performers
                </CardTitle>
                <CardDescription>Based on average test scores</CardDescription>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {globalLeaderboard.length > 0 ? (
              <div className="space-y-3">
                {globalLeaderboard.map((entry, index) => {
                  const user = userMap.get(entry.userId);
                  const isCurrentUser = entry.userId === userId;
                  const rank = index + 1;
                  
                  return (
                    <div 
                      key={entry.userId}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        isCurrentUser ? 'bg-primary/10 border-primary' : 'bg-muted/30'
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12">
                        {rank === 1 && <Crown className="h-8 w-8 text-yellow-500" />}
                        {rank === 2 && <Medal className="h-8 w-8 text-gray-400" />}
                        {rank === 3 && <Medal className="h-8 w-8 text-orange-600" />}
                        {rank > 3 && (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {user?.name || 'Unknown User'}
                          {isCurrentUser && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.totalSessions} session{entry.totalSessions !== 1 ? 's' : ''} • {entry.totalCards} cards studied
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {Math.round(entry.averageScore)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          avg score
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No test sessions completed yet. Be the first!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Deck Leaderboards */}
        {deckLeaderboards.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Popular Decks
            </h2>
            
            {deckLeaderboards.map(async (deck) => {
              // Fetch users for this deck's leaderboard
              const deckUserIds = deck.topScores.map(score => score.userId);
              const deckUsers = await Promise.all(
                deckUserIds.map(async (id) => {
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

              const deckUserMap = new Map(deckUsers.map(u => [u.id, u]));

              return (
                <Card key={deck.deckId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          <Link 
                            href={`/decks/${deck.deckId}`}
                            className="hover:underline"
                          >
                            {deck.deckName}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {deck.uniqueUsers} user{deck.uniqueUsers !== 1 ? 's' : ''} • {deck.totalSessions} session{deck.totalSessions !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Link href={`/decks/${deck.deckId}/study`}>
                        <Trophy className="h-6 w-6 text-yellow-500 hover:text-yellow-600 transition-colors" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deck.topScores.map((score, index) => {
                        const user = deckUserMap.get(score.userId);
                        const isCurrentUser = score.userId === userId;
                        const rank = index + 1;
                        
                        return (
                          <div 
                            key={score.userId}
                            className={`flex items-center justify-between p-3 rounded border ${
                              isCurrentUser ? 'bg-primary/10 border-primary' : 'bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-6 text-center font-semibold ${
                                rank <= 3 ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}>
                                #{rank}
                              </span>
                              <span className="font-medium">
                                {user?.name || 'Unknown User'}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {Math.round(score.bestScore)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {score.totalSessions} session{score.totalSessions !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

