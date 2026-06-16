# Database Implementation

This document describes the PostgreSQL + Citus database implementation based on `specs/04-database.md`.

## Overview

The database schema includes 11 tables designed for a learning platform with horizontal scaling capabilities via Citus distribution.

## Schema Structure

### Core Tables

1. **users** - User accounts with XP/level progression
2. **learning_paths** - Learning path definitions
3. **path_modules** - Modules within learning paths
4. **labs** - Individual lab exercises
5. **quiz_checks** - Validation checks for labs

### User Progress Tables (Citus Distributed)

6. **user_path_progress** - User progress through learning paths
7. **sandbox_sessions** - Active K8s sandbox environments
8. **submissions** - Lab submission results
9. **daily_tasks** - Daily task assignments
10. **streaks** - User activity streaks
11. **domain_mastery** - User mastery levels by domain

## Files Created

### Migration Files
- `migrations/001_initial_schema.sql` - Complete SQL schema with indexes

### Drizzle ORM Files
- `src/db/schema.ts` - Drizzle schema definitions with relations
- `src/db/client.ts` - Updated database client with schema
- `src/db/migrate.ts` - Migration runner script

### Query Files
- `src/db/queries/users.ts` - User CRUD operations
- `src/db/queries/learning-paths.ts` - Learning path queries
- `src/db/queries/labs.ts` - Lab queries with checks
- `src/db/queries/sandbox-sessions.ts` - Sandbox session management
- `src/db/queries/submissions.ts` - Submission tracking
- `src/db/queries/daily-tasks.ts` - Daily tasks and streaks
- `src/db/queries/progress.ts` - User progress and domain mastery

### Configuration
- `drizzle.config.ts` - Drizzle Kit configuration

## Setup Instructions

### 1. Install Dependencies

The required dependencies are already in `package.json`:
- `drizzle-orm` - ORM library
- `pg` - PostgreSQL client

You may need to add `drizzle-kit` as a dev dependency:

```bash
cd gateway
npm install -D drizzle-kit
```

### 2. Set Environment Variable

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/learning_platform"
```

### 3. Run Migrations

```bash
npm run db:migrate
```

Or manually with psql:

```bash
psql $DATABASE_URL < migrations/001_initial_schema.sql
```

### 4. (Optional) Enable Citus Distribution

If using Citus for horizontal scaling, uncomment the `create_distributed_table` lines in the migration file:

```sql
SELECT create_distributed_table('user_path_progress', 'user_id');
SELECT create_distributed_table('sandbox_sessions', 'user_id');
SELECT create_distributed_table('submissions', 'user_id');
SELECT create_distributed_table('daily_tasks', 'user_id');
SELECT create_distributed_table('streaks', 'user_id');
SELECT create_distributed_table('domain_mastery', 'user_id');
```

## Usage Examples

### Query Users

```typescript
import { findUserByEmail, upsertUser } from './db/queries/users.js';

const user = await findUserByEmail(db, 'user@example.com');

const newUser = await upsertUser(db, {
  email: 'user@example.com',
  displayName: 'John Doe',
  role: 'student',
});
```

### Create Sandbox Session

```typescript
import { createSandboxSession } from './db/queries/sandbox-sessions.js';

const session = await createSandboxSession(db, {
  userId: user.id,
  labId: lab.id,
  sandboxId: 'vcluster-abc123',
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
});
```

### Submit Lab

```typescript
import { createSubmission } from './db/queries/submissions.js';
import { updateUserXp } from './db/queries/users.js';

const submission = await createSubmission(db, {
  userId: user.id,
  labId: lab.id,
  sandboxId: session.sandboxId,
  passed: true,
  score: 95,
  resultsJson: { checks: [...] },
  xpAwarded: 50,
});

await updateUserXp(db, user.id, 50);
```

### Track Daily Progress

```typescript
import { findDailyTasks, completeDailyTask, upsertStreak } from './db/queries/daily-tasks.js';

const tasks = await findDailyTasks(db, user.id, '2026-04-27');
await completeDailyTask(db, tasks[0].id);

await upsertStreak(db, {
  userId: user.id,
  streakDate: '2026-04-27',
  tasksDone: 3,
  totalTasks: 4,
});
```

## Indexes

The following indexes are created for optimal query performance:

- `idx_sessions_status` - Filter sessions by status
- `idx_sessions_expires` - Find expiring sessions
- `idx_submissions_user_lab` - User submission history
- `idx_daily_tasks_date` - Daily task queries
- `idx_streaks_user` - User streak tracking

## Citus Distribution

Tables distributed by `user_id` for horizontal scaling:
- user_path_progress
- sandbox_sessions
- submissions
- daily_tasks
- streaks
- domain_mastery

This ensures all user-related data is co-located on the same shard for efficient queries.

## Development Tools

### Drizzle Studio

View and edit database data with a GUI:

```bash
npm run db:studio
```

This will open Drizzle Studio at `https://local.drizzle.studio`

## Notes

- All timestamps use `TIMESTAMPTZ` for timezone awareness
- UUIDs are used for primary keys with `gen_random_uuid()`
- Drizzle ORM provides type-safe queries with full TypeScript support
- The schema supports both standalone PostgreSQL and Citus deployment
