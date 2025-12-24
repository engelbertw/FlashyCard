import { integer, pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const decksTable = pgTable("decks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(), // Clerk user ID
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const cardsTable = pgTable("cards", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deckId: integer().notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  front: text().notNull(), // e.g., "Dog" or "When was the battle of hastings?"
  back: text().notNull(),  // e.g., "Anjing" or "1066"
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const studySessionsTable = pgTable("study_sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(), // Clerk user ID
  deckId: integer().notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  mode: varchar({ length: 50 }).notNull(), // 'flip' or 'test'
  totalCards: integer().notNull(),
  correctAnswers: integer().notNull(),
  completedAt: timestamp().defaultNow().notNull(),
});

export const studyResultsTable = pgTable("study_results", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer().notNull().references(() => studySessionsTable.id, { onDelete: "cascade" }),
  cardId: integer().notNull().references(() => cardsTable.id, { onDelete: "cascade" }),
  isCorrect: boolean().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const challengesTable = pgTable("challenges", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deckId: integer().notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  challengerId: varchar({ length: 255 }).notNull(), // User who created the challenge
  challengedId: varchar({ length: 255 }).notNull(), // User who was challenged
  challengerScore: integer(), // Score of challenger (null until completed)
  challengedScore: integer(), // Score of challenged user (null until completed)
  challengerSessionId: integer().references(() => studySessionsTable.id),
  challengedSessionId: integer().references(() => studySessionsTable.id),
  status: varchar({ length: 50 }).notNull().default('pending'), // 'pending', 'accepted', 'completed', 'declined'
  createdAt: timestamp().defaultNow().notNull(),
  completedAt: timestamp(),
});
