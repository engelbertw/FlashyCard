import { db } from '@/db';
import { studySessionsTable, studyResultsTable, decksTable, challengesTable } from '@/db/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';

/**
 * Create a new study session
 */
export async function createStudySession(
  userId: string,
  deckId: number,
  mode: 'flip' | 'test',
  totalCards: number,
  correctAnswers: number
) {
  const [session] = await db
    .insert(studySessionsTable)
    .values({
      userId,
      deckId,
      mode,
      totalCards,
      correctAnswers,
    })
    .returning();
  
  return session;
}

/**
 * Save individual card results for a session
 */
export async function saveStudyResults(
  sessionId: number,
  results: Array<{ cardId: number; isCorrect: boolean }>
) {
  if (results.length === 0) return [];
  
  const insertedResults = await db
    .insert(studyResultsTable)
    .values(
      results.map(result => ({
        sessionId,
        cardId: result.cardId,
        isCorrect: result.isCorrect,
      }))
    )
    .returning();
  
  return insertedResults;
}

/**
 * Get recent study sessions for a user
 */
export async function getUserStudySessions(userId: string, limit = 10) {
  const sessions = await db
    .select({
      id: studySessionsTable.id,
      deckId: studySessionsTable.deckId,
      deckName: decksTable.name,
      mode: studySessionsTable.mode,
      totalCards: studySessionsTable.totalCards,
      correctAnswers: studySessionsTable.correctAnswers,
      completedAt: studySessionsTable.completedAt,
    })
    .from(studySessionsTable)
    .innerJoin(decksTable, eq(studySessionsTable.deckId, decksTable.id))
    .where(eq(studySessionsTable.userId, userId))
    .orderBy(desc(studySessionsTable.completedAt))
    .limit(limit);
  
  return sessions;
}

/**
 * Get study sessions for a specific deck
 */
export async function getDeckStudySessions(userId: string, deckId: number) {
  const sessions = await db
    .select()
    .from(studySessionsTable)
    .where(
      and(
        eq(studySessionsTable.userId, userId),
        eq(studySessionsTable.deckId, deckId)
      )
    )
    .orderBy(desc(studySessionsTable.completedAt));
  
  return sessions;
}

/**
 * Get statistics for a deck
 */
export async function getDeckStatistics(userId: string, deckId: number) {
  const sessions = await getDeckStudySessions(userId, deckId);
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalCards: 0,
      totalCorrect: 0,
      averageScore: 0,
      lastStudied: null,
    };
  }
  
  const totalSessions = sessions.length;
  const totalCards = sessions.reduce((sum, s) => sum + s.totalCards, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
  const averageScore = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;
  const lastStudied = sessions[0].completedAt;
  
  return {
    totalSessions,
    totalCards,
    totalCorrect,
    averageScore,
    lastStudied,
  };
}

/**
 * Get leaderboard for a specific deck (top performers)
 */
export async function getDeckLeaderboard(deckId: number, limit = 10) {
  const leaderboard = await db
    .select({
      userId: studySessionsTable.userId,
      bestScore: sql<number>`MAX((${studySessionsTable.correctAnswers} * 100.0) / NULLIF(${studySessionsTable.totalCards}, 0))`,
      totalSessions: sql<number>`COUNT(*)`,
      totalCards: sql<number>`SUM(${studySessionsTable.totalCards})`,
      lastStudied: sql<Date>`MAX(${studySessionsTable.completedAt})`,
    })
    .from(studySessionsTable)
    .where(
      and(
        eq(studySessionsTable.deckId, deckId),
        eq(studySessionsTable.mode, 'test') // Only test mode for fair comparison
      )
    )
    .groupBy(studySessionsTable.userId)
    .orderBy(desc(sql`MAX((${studySessionsTable.correctAnswers} * 100.0) / NULLIF(${studySessionsTable.totalCards}, 0))`))
    .limit(limit);
  
  return leaderboard;
}

/**
 * Get user's rank for a specific deck
 */
export async function getUserRankForDeck(userId: string, deckId: number) {
  const allScores = await db
    .select({
      userId: studySessionsTable.userId,
      bestScore: sql<number>`MAX((${studySessionsTable.correctAnswers} * 100.0) / NULLIF(${studySessionsTable.totalCards}, 0))`,
    })
    .from(studySessionsTable)
    .where(
      and(
        eq(studySessionsTable.deckId, deckId),
        eq(studySessionsTable.mode, 'test')
      )
    )
    .groupBy(studySessionsTable.userId)
    .orderBy(desc(sql`MAX((${studySessionsTable.correctAnswers} * 100.0) / NULLIF(${studySessionsTable.totalCards}, 0))`));
  
  const userIndex = allScores.findIndex(s => s.userId === userId);
  
  return {
    rank: userIndex >= 0 ? userIndex + 1 : null,
    totalUsers: allScores.length,
    userScore: userIndex >= 0 ? Math.round(allScores[userIndex].bestScore) : null,
  };
}

/**
 * Create a new challenge
 */
export async function createChallenge(
  deckId: number,
  challengerId: string,
  challengedId: string
) {
  const [challenge] = await db
    .insert(challengesTable)
    .values({
      deckId,
      challengerId,
      challengedId,
      status: 'pending',
    })
    .returning();
  
  return challenge;
}

/**
 * Get challenges for a user (both sent and received)
 */
export async function getUserChallenges(userId: string) {
  const challenges = await db
    .select({
      id: challengesTable.id,
      deckId: challengesTable.deckId,
      deckName: decksTable.name,
      challengerId: challengesTable.challengerId,
      challengedId: challengesTable.challengedId,
      challengerScore: challengesTable.challengerScore,
      challengedScore: challengesTable.challengedScore,
      status: challengesTable.status,
      createdAt: challengesTable.createdAt,
      completedAt: challengesTable.completedAt,
    })
    .from(challengesTable)
    .innerJoin(decksTable, eq(challengesTable.deckId, decksTable.id))
    .where(
      or(
        eq(challengesTable.challengerId, userId),
        eq(challengesTable.challengedId, userId)
      )
    )
    .orderBy(desc(challengesTable.createdAt));
  
  return challenges;
}

/**
 * Update challenge with session result
 */
export async function updateChallengeResult(
  challengeId: number,
  userId: string,
  sessionId: number,
  score: number
) {
  // Determine if user is challenger or challenged
  const [challenge] = await db
    .select()
    .from(challengesTable)
    .where(eq(challengesTable.id, challengeId));
  
  if (!challenge) return null;
  
  const isChallenger = challenge.challengerId === userId;
  
  // Update appropriate score
  const updateData = isChallenger
    ? { challengerScore: score, challengerSessionId: sessionId }
    : { challengedScore: score, challengedSessionId: sessionId };
  
  // Check if both completed
  const shouldComplete = isChallenger
    ? challenge.challengedScore !== null
    : challenge.challengerScore !== null;
  
  if (shouldComplete) {
    updateData.status = 'completed';
    updateData.completedAt = new Date();
  } else if (challenge.status === 'pending' && !isChallenger) {
    updateData.status = 'accepted';
  }
  
  const [updated] = await db
    .update(challengesTable)
    .set(updateData)
    .where(eq(challengesTable.id, challengeId))
    .returning();
  
  return updated;
}

/**
 * Decline a challenge
 */
export async function declineChallenge(challengeId: number, userId: string) {
  const [updated] = await db
    .update(challengesTable)
    .set({ status: 'declined' })
    .where(
      and(
        eq(challengesTable.id, challengeId),
        eq(challengesTable.challengedId, userId),
        eq(challengesTable.status, 'pending')
      )
    )
    .returning();
  
  return updated;
}

