# 04 — PostgreSQL + Citus Database

Full relational schema for the learning platform with 11 tables, Citus distribution on `user_id` for horizontal scaling, and targeted indexes for common query patterns.

---

## 4.1 Schema

```sql
-- Core tables (distributed via Citus on user_id)

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'student',  -- student | admin
  xp            INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  level_title   TEXT NOT NULL DEFAULT 'Beginner',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_paths (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL,
  difficulty    TEXT NOT NULL,  -- Beginner | Intermediate | Advanced
  duration      TEXT NOT NULL,
  color_scheme  TEXT NOT NULL DEFAULT 'primary',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE path_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id       UUID NOT NULL REFERENCES learning_paths(id),
  title         TEXT NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE labs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     UUID NOT NULL REFERENCES path_modules(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  difficulty    TEXT NOT NULL,
  estimated_min INTEGER NOT NULL,
  seed_manifest TEXT NOT NULL,           -- K8s YAML for initial state
  sort_order    INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id        UUID NOT NULL REFERENCES labs(id),
  check_type    TEXT NOT NULL,            -- STATE | LIVENESS | SLA
  spec_json     JSONB NOT NULL,           -- check-specific config
  description   TEXT NOT NULL,            -- human-readable description
  points        INTEGER NOT NULL DEFAULT 10,
  sort_order    INTEGER NOT NULL
);

-- User progress tables (Citus distribution key: user_id)

CREATE TABLE user_path_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  path_id       UUID NOT NULL REFERENCES learning_paths(id),
  progress_pct  REAL NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);
SELECT create_distributed_table('user_path_progress', 'user_id');

CREATE TABLE sandbox_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  lab_id        UUID NOT NULL REFERENCES labs(id),
  sandbox_id    TEXT NOT NULL UNIQUE,     -- maps to vCluster namespace
  status        TEXT NOT NULL DEFAULT 'PROVISIONING',  -- PROVISIONING | READY | EXPIRED | FAILED | CLEANED
  kubeconfig    TEXT,
  vcluster_ep   TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ
);
SELECT create_distributed_table('sandbox_sessions', 'user_id');

CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  lab_id        UUID NOT NULL REFERENCES labs(id),
  sandbox_id    TEXT NOT NULL,
  passed        BOOLEAN NOT NULL,
  score         INTEGER NOT NULL,
  results_json  JSONB NOT NULL,           -- per-check results
  xp_awarded    INTEGER NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT create_distributed_table('submissions', 'user_id');

CREATE TABLE daily_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  task_date     DATE NOT NULL,
  task_type     TEXT NOT NULL,            -- Technical Lab | Documentation | Assessment | Social
  title         TEXT NOT NULL,
  description   TEXT,
  reference_id  UUID,                     -- lab_id, quiz_id, or null
  duration_min  INTEGER NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  UNIQUE(user_id, task_date, title)
);
SELECT create_distributed_table('daily_tasks', 'user_id');

CREATE TABLE streaks (
  user_id       UUID NOT NULL REFERENCES users(id),
  streak_date   DATE NOT NULL,
  tasks_done    INTEGER NOT NULL DEFAULT 0,
  total_tasks   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, streak_date)
);
SELECT create_distributed_table('streaks', 'user_id');

CREATE TABLE domain_mastery (
  user_id       UUID NOT NULL REFERENCES users(id),
  domain        TEXT NOT NULL,            -- DevOps, Cloud, Security, Architecture
  mastery_pct   REAL NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, domain)
);
SELECT create_distributed_table('domain_mastery', 'user_id');
```

---

## 4.2 Indexes

```sql
CREATE INDEX idx_sessions_status ON sandbox_sessions(status) WHERE status IN ('PROVISIONING', 'READY');
CREATE INDEX idx_sessions_expires ON sandbox_sessions(expires_at) WHERE status = 'READY';
CREATE INDEX idx_submissions_user_lab ON submissions(user_id, lab_id);
CREATE INDEX idx_daily_tasks_date ON daily_tasks(user_id, task_date);
CREATE INDEX idx_streaks_user ON streaks(user_id, streak_date DESC);
```
