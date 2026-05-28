import { pgTable, uuid, text, integer, real, boolean, timestamp, date, jsonb, unique, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('student'),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  levelTitle: text('level_title').notNull().default('Beginner'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learningPaths = pgTable('learning_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  duration: text('duration').notNull(),
  colorScheme: text('color_scheme').notNull().default('primary'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pathModules = pgTable('path_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  pathId: uuid('path_id').notNull().references(() => learningPaths.id),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const labs = pgTable('labs', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => pathModules.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  estimatedMin: integer('estimated_min').notNull(),
  seedManifest: text('seed_manifest').notNull(),
  seedLevel: text('seed_level').notNull().default('code-only'),
  sortOrder: integer('sort_order').notNull(),
  tags: text('tags').array().notNull().default([]),
  status: text('status').notNull().default('available'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quizChecks = pgTable('quiz_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  labId: uuid('lab_id').notNull().references(() => labs.id),
  checkType: text('check_type').notNull(),
  specJson: jsonb('spec_json').notNull(),
  description: text('description').notNull(),
  points: integer('points').notNull().default(10),
  sortOrder: integer('sort_order').notNull(),
});

export const userPathProgress = pgTable('user_path_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  pathId: uuid('path_id').notNull().references(() => learningPaths.id),
  progressPct: real('progress_pct').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  uniqueUserPath: unique().on(table.userId, table.pathId),
}));

export const sandboxSessions = pgTable('sandbox_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  labId: uuid('lab_id').notNull().references(() => labs.id),
  sandboxId: text('sandbox_id').notNull().unique(),
  status: text('status').notNull().default('PROVISIONING'),
  kubeconfig: text('kubeconfig'),
  vclusterEp: text('vcluster_ep'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  statusIdx: index('idx_sessions_status').on(table.status),
  expiresIdx: index('idx_sessions_expires').on(table.expiresAt),
}));

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  labId: uuid('lab_id').notNull().references(() => labs.id),
  sandboxId: text('sandbox_id').notNull(),
  passed: boolean('passed').notNull(),
  score: integer('score').notNull(),
  resultsJson: jsonb('results_json').notNull(),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userLabIdx: index('idx_submissions_user_lab').on(table.userId, table.labId),
}));

export const dailyTasks = pgTable('daily_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  taskDate: date('task_date').notNull(),
  taskType: text('task_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  referenceId: uuid('reference_id'),
  durationMin: integer('duration_min').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  uniqueUserDateTitle: unique().on(table.userId, table.taskDate, table.title),
  dateIdx: index('idx_daily_tasks_date').on(table.userId, table.taskDate),
}));

export const streaks = pgTable('streaks', {
  userId: uuid('user_id').notNull().references(() => users.id),
  streakDate: date('streak_date').notNull(),
  tasksDone: integer('tasks_done').notNull().default(0),
  totalTasks: integer('total_tasks').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.streakDate] }),
  userIdx: index('idx_streaks_user').on(table.userId, table.streakDate),
}));

export const domainMastery = pgTable('domain_mastery', {
  userId: uuid('user_id').notNull().references(() => users.id),
  domain: text('domain').notNull(),
  masteryPct: real('mastery_pct').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.domain] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  pathProgress: many(userPathProgress),
  sandboxSessions: many(sandboxSessions),
  submissions: many(submissions),
  dailyTasks: many(dailyTasks),
  streaks: many(streaks),
  domainMastery: many(domainMastery),
}));

export const learningPathsRelations = relations(learningPaths, ({ many }) => ({
  modules: many(pathModules),
  userProgress: many(userPathProgress),
}));

export const pathModulesRelations = relations(pathModules, ({ one, many }) => ({
  path: one(learningPaths, {
    fields: [pathModules.pathId],
    references: [learningPaths.id],
  }),
  labs: many(labs),
}));

export const labsRelations = relations(labs, ({ one, many }) => ({
  module: one(pathModules, {
    fields: [labs.moduleId],
    references: [pathModules.id],
  }),
  quizChecks: many(quizChecks),
  sandboxSessions: many(sandboxSessions),
  submissions: many(submissions),
}));

export const quizChecksRelations = relations(quizChecks, ({ one }) => ({
  lab: one(labs, {
    fields: [quizChecks.labId],
    references: [labs.id],
  }),
}));

export const userPathProgressRelations = relations(userPathProgress, ({ one }) => ({
  user: one(users, {
    fields: [userPathProgress.userId],
    references: [users.id],
  }),
  path: one(learningPaths, {
    fields: [userPathProgress.pathId],
    references: [learningPaths.id],
  }),
}));

export const sandboxSessionsRelations = relations(sandboxSessions, ({ one }) => ({
  user: one(users, {
    fields: [sandboxSessions.userId],
    references: [users.id],
  }),
  lab: one(labs, {
    fields: [sandboxSessions.labId],
    references: [labs.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  lab: one(labs, {
    fields: [submissions.labId],
    references: [labs.id],
  }),
}));

export const dailyTasksRelations = relations(dailyTasks, ({ one }) => ({
  user: one(users, {
    fields: [dailyTasks.userId],
    references: [users.id],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

export const domainMasteryRelations = relations(domainMastery, ({ one }) => ({
  user: one(users, {
    fields: [domainMastery.userId],
    references: [users.id],
  }),
}));
