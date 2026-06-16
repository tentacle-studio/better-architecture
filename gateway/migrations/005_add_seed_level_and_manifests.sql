-- 005_add_seed_level_and_manifests.sql
-- Add seed_level column and populate seed_manifest with K8s YAML for each lab.
--
-- Seed levels:
--   infra-ready   — HLD Easy/Medium: Postgres, Redis, NATS pre-deployed
--   infra-minimal — HLD Hard: only a ConfigMap with context, user designs from scratch
--   code-only     — LLD labs: no infra, just the shell pod (auto-created by orchestrator)

ALTER TABLE labs
  ADD COLUMN IF NOT EXISTS seed_level TEXT NOT NULL DEFAULT 'code-only';

-- Set seed_level per lab
UPDATE labs SET seed_level = 'infra-ready'   WHERE title = 'Design a URL Shortener';
UPDATE labs SET seed_level = 'code-only'     WHERE title = 'Design a Vending Machine';
UPDATE labs SET seed_level = 'infra-ready'   WHERE title = 'Design a Notification System';
UPDATE labs SET seed_level = 'code-only'     WHERE title = 'Design an In-Memory Cache with TTL';
UPDATE labs SET seed_level = 'infra-minimal' WHERE title = 'Design a Distributed Message Queue';

-- ─────────────────────────────────────────────────────────────────────────────
-- Lab 01 — URL Shortener (infra-ready): Postgres + Redis
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE labs SET seed_manifest = replace(encode(convert_to(
$lab01$apiVersion: v1
kind: ConfigMap
metadata:
  name: lab-config
  labels:
    app: workload
data:
  LAB_NAME: "url-shortener"
  SEED_LEVEL: "infra-ready"
  POSTGRES_HOST: "postgres"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "urlshortener"
  POSTGRES_USER: "postgres"
  POSTGRES_PASSWORD: "postgres"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  README: |
    Pre-configured infrastructure for the URL Shortener lab:

    - PostgreSQL 16 (postgres:5432) — persistent URL storage
    - Redis 7 (redis:6379) — redirect caching layer

    Connect from the shell pod:
      psql -h postgres -U postgres -d urlshortener
      redis-cli -h redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: workload
    component: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      component: postgres
  template:
    metadata:
      labels:
        app: workload
        component: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        imagePullPolicy: IfNotPresent
        env:
        - name: POSTGRES_DB
          value: urlshortener
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: postgres
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: workload
spec:
  selector:
    component: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: workload
    component: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      component: redis
  template:
    metadata:
      labels:
        app: workload
        component: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: workload
spec:
  selector:
    component: redis
  ports:
  - port: 6379
    targetPort: 6379$lab01$, 'UTF8'), 'base64'), E'\n', '')
WHERE title = 'Design a URL Shortener';

-- ─────────────────────────────────────────────────────────────────────────────
-- Lab 03 — Notification System (infra-ready): Postgres + Redis + NATS
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE labs SET seed_manifest = replace(encode(convert_to(
$lab03$apiVersion: v1
kind: ConfigMap
metadata:
  name: lab-config
  labels:
    app: workload
data:
  LAB_NAME: "notification-system"
  SEED_LEVEL: "infra-ready"
  POSTGRES_HOST: "postgres"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "notifications"
  POSTGRES_USER: "postgres"
  POSTGRES_PASSWORD: "postgres"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  NATS_URL: "nats://nats:4222"
  README: |
    Pre-configured infrastructure for the Notification System lab:

    - PostgreSQL 16 (postgres:5432) — user preferences & notification history
    - Redis 7 (redis:6379) — deduplication cache & preference lookups
    - NATS (nats:4222) — lightweight event bus for pub/sub routing

    Connect from the shell pod:
      psql -h postgres -U postgres -d notifications
      redis-cli -h redis
      nats sub '>' -s nats://nats:4222
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: workload
    component: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      component: postgres
  template:
    metadata:
      labels:
        app: workload
        component: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        imagePullPolicy: IfNotPresent
        env:
        - name: POSTGRES_DB
          value: notifications
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: postgres
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: workload
spec:
  selector:
    component: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: workload
    component: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      component: redis
  template:
    metadata:
      labels:
        app: workload
        component: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: workload
spec:
  selector:
    component: redis
  ports:
  - port: 6379
    targetPort: 6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
  labels:
    app: workload
    component: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      component: nats
  template:
    metadata:
      labels:
        app: workload
        component: nats
    spec:
      containers:
      - name: nats
        image: nats:2-alpine
        imagePullPolicy: IfNotPresent
        ports:
        - name: client
          containerPort: 4222
        - name: monitor
          containerPort: 8222
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  labels:
    app: workload
spec:
  selector:
    component: nats
  ports:
  - name: client
    port: 4222
    targetPort: 4222
  - name: monitor
    port: 8222
    targetPort: 8222$lab03$, 'UTF8'), 'base64'), E'\n', '')
WHERE title = 'Design a Notification System';

-- ─────────────────────────────────────────────────────────────────────────────
-- Lab 05 — Distributed Message Queue (infra-minimal): ConfigMap only
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE labs SET seed_manifest = replace(encode(convert_to(
$lab05$apiVersion: v1
kind: ConfigMap
metadata:
  name: lab-config
  labels:
    app: workload
data:
  LAB_NAME: "distributed-message-queue"
  SEED_LEVEL: "infra-minimal"
  README: |
    Minimal infrastructure for the Distributed Message Queue lab.

    You have a blank namespace with terminal access — no pre-deployed services.
    Design your Kafka-style message queue system from scratch.

    Think about:
    - How many broker nodes? How are they discovered?
    - Topic partitioning strategy and partition-to-broker assignment
    - Replication: ISR model, acks=0 vs acks=1 vs acks=all
    - Consumer group offset tracking and rebalancing
    - What happens when a broker crashes mid-write?$lab05$, 'UTF8'), 'base64'), E'\n', '')
WHERE title = 'Design a Distributed Message Queue';

-- ─────────────────────────────────────────────────────────────────────────────
-- Labs 02 & 04 (LLD, code-only) keep seed_manifest = '' — the orchestrator
-- auto-creates the shell pod; no additional infrastructure needed.
-- ─────────────────────────────────────────────────────────────────────────────
