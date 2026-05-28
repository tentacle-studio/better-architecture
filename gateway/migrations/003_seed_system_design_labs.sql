-- 003_seed_system_design_labs.sql
-- Seed system design interview lab exercises (HLD + LLD, Easy → Hard)

DO $$
DECLARE
  path_id       UUID := gen_random_uuid();

  mod_easy_id   UUID := gen_random_uuid();
  mod_medium_id UUID := gen_random_uuid();
  mod_hard_id   UUID := gen_random_uuid();

  lab_url_id    UUID := gen_random_uuid();
  lab_vend_id   UUID := gen_random_uuid();
  lab_notif_id  UUID := gen_random_uuid();
  lab_cache_id  UUID := gen_random_uuid();
  lab_mq_id     UUID := gen_random_uuid();

BEGIN

  -- ──────────────────────────────────────────────────────────────────────────
  -- Learning Path
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO learning_paths (id, title, description, category, difficulty, duration, color_scheme, sort_order)
  VALUES (
    path_id,
    'System Design Interview Prep',
    'A structured lab track covering High-Level Design (HLD) and Low-Level Design (LLD) interview problems, progressing from Easy to Hard. Each lab provides a realistic interview prompt, scale constraints, and a self-evaluation rubric.',
    'System Design',
    'Mixed',
    '4–6 hours',
    'primary',
    100
  );

  -- ──────────────────────────────────────────────────────────────────────────
  -- Modules
  -- ──────────────────────────────────────────────────────────────────────────
  INSERT INTO path_modules (id, path_id, title, description, sort_order) VALUES
    (mod_easy_id,   path_id, 'Easy — Foundations',          'Single-service systems and classic OOP patterns. Build intuition for clean design before tackling scale.', 1),
    (mod_medium_id, path_id, 'Medium — Multi-Service Scale', 'Multi-component architectures with real trade-offs: queues, caches, async pipelines, and concurrency.',   2),
    (mod_hard_id,   path_id, 'Hard — Distributed Systems',  'Large-scale distributed problems requiring deep knowledge of replication, consensus, and fault tolerance.',    3);

  -- ──────────────────────────────────────────────────────────────────────────
  -- Labs
  -- ──────────────────────────────────────────────────────────────────────────

  -- Lab 01 — URL Shortener (Easy, HLD)
  INSERT INTO labs (id, module_id, title, description, difficulty, estimated_min, seed_manifest, sort_order)
  VALUES (
    lab_url_id,
    mod_easy_id,
    'Design a URL Shortener',
    'Design a read-heavy URL shortening service (bit.ly-style). Cover short code generation strategies (hash vs base62 encode), the redirect path, caching layer, and async analytics pipeline. Scale: 100M URLs/month, 1B redirects/day.',
    'easy',
    40,
    '',
    1
  );

  -- Lab 02 — Vending Machine (Easy, LLD)
  INSERT INTO labs (id, module_id, title, description, difficulty, estimated_min, seed_manifest, sort_order)
  VALUES (
    lab_vend_id,
    mod_easy_id,
    'Design a Vending Machine',
    'Model a vending machine using the State design pattern. Implement clean state transitions (Idle → AcceptingMoney → Dispensing), handle edge cases like insufficient funds and exact-change unavailability, and expose an admin restocking interface.',
    'easy',
    25,
    '',
    2
  );

  -- Lab 03 — Notification System (Medium, HLD)
  INSERT INTO labs (id, module_id, title, description, difficulty, estimated_min, seed_manifest, sort_order)
  VALUES (
    lab_notif_id,
    mod_medium_id,
    'Design a Notification System',
    'Design a multi-channel notification system (push, email, SMS) handling 10B notifications/day. Focus on priority isolation, per-user preferences with quiet hours, at-least-once delivery with deduplication, and async third-party provider integration.',
    'medium',
    45,
    '',
    1
  );

  -- Lab 04 — In-Memory Cache with TTL (Medium, LLD)
  INSERT INTO labs (id, module_id, title, description, difficulty, estimated_min, seed_manifest, sort_order)
  VALUES (
    lab_cache_id,
    mod_medium_id,
    'Design an In-Memory Cache with TTL',
    'Implement an LRU cache with TTL expiration achieving O(1) get/put/delete using a HashMap + doubly linked list. Cover lazy vs active expiry strategies, sentinel nodes, and thread safety trade-offs for concurrent access.',
    'medium',
    30,
    '',
    2
  );

  -- Lab 05 — Distributed Message Queue (Hard, HLD)
  INSERT INTO labs (id, module_id, title, description, difficulty, estimated_min, seed_manifest, sort_order)
  VALUES (
    lab_mq_id,
    mod_hard_id,
    'Design a Distributed Message Queue',
    'Design a Kafka-style distributed message queue supporting 1M writes/sec. Cover topic partitioning, ISR replication with configurable acks, consumer group offset tracking, partition leader election on failure, and log compaction.',
    'hard',
    50,
    '',
    1
  );

  -- ──────────────────────────────────────────────────────────────────────────
  -- Quiz Checks
  -- ──────────────────────────────────────────────────────────────────────────

  -- Lab 01: URL Shortener checks
  INSERT INTO quiz_checks (lab_id, check_type, spec_json, description, points, sort_order) VALUES
    (lab_url_id, 'free_response', '{"question": "What are the two main approaches for generating a short code, and what is the key trade-off between them?", "keywords": ["hash", "base62", "collision", "auto-increment", "predictable"]}',
      'Code generation strategy and trade-offs', 15, 1),
    (lab_url_id, 'free_response', '{"question": "Why should the redirect return HTTP 302 instead of 301?", "keywords": ["browser cache", "analytics", "permanent", "temporary"]}',
      'Redirect status code reasoning', 10, 2),
    (lab_url_id, 'free_response', '{"question": "How would you prevent a cache stampede when a popular short URL''s cache entry expires?", "keywords": ["background refresh", "lock", "stale-while-revalidate", "mutex"]}',
      'Cache stampede prevention', 15, 3),
    (lab_url_id, 'free_response', '{"question": "Describe the analytics pipeline. Why must it be asynchronous?", "keywords": ["kafka", "queue", "async", "fire-and-forget", "latency", "redirect"]}',
      'Analytics pipeline design', 10, 4);

  -- Lab 02: Vending Machine checks
  INSERT INTO quiz_checks (lab_id, check_type, spec_json, description, points, sort_order) VALUES
    (lab_vend_id, 'free_response', '{"question": "List all states the vending machine can be in and the events that trigger transitions between them.", "keywords": ["idle", "accepting", "dispensing", "cancel", "insert", "select"]}',
      'State transition diagram', 15, 1),
    (lab_vend_id, 'free_response', '{"question": "Why is the State design pattern preferable to a giant if-else on currentState?", "keywords": ["open-closed", "encapsulation", "extensible", "single responsibility"]}',
      'State pattern justification', 10, 2),
    (lab_vend_id, 'free_response', '{"question": "When must the machine check if exact change is available, and what should happen if it cannot make change?", "keywords": ["before dispensing", "cancel", "return money", "idle"]}',
      'Change validation timing', 10, 3);

  -- Lab 03: Notification System checks
  INSERT INTO quiz_checks (lab_id, check_type, spec_json, description, points, sort_order) VALUES
    (lab_notif_id, 'free_response', '{"question": "How do you ensure a critical OTP notification is never delayed by a marketing blast?", "keywords": ["separate queue", "separate topic", "priority", "dedicated consumer", "isolation"]}',
      'Priority isolation strategy', 20, 1),
    (lab_notif_id, 'free_response', '{"question": "Describe how you would implement deduplication for notifications.", "keywords": ["idempotency key", "redis", "hash", "ttl", "event_id"]}',
      'Deduplication mechanism', 15, 2),
    (lab_notif_id, 'free_response', '{"question": "How would you handle a user''s quiet hours preference without losing the notification?", "keywords": ["delayed queue", "redis zadd", "schedule", "non-critical", "window"]}',
      'Quiet hours handling', 15, 3),
    (lab_notif_id, 'free_response', '{"question": "What should happen when APNs returns InvalidDeviceToken for a push notification?", "keywords": ["remove token", "delete", "device_tokens", "cleanup"]}',
      'Third-party provider failure handling', 10, 4);

  -- Lab 04: In-Memory Cache checks
  INSERT INTO quiz_checks (lab_id, check_type, spec_json, description, points, sort_order) VALUES
    (lab_cache_id, 'free_response', '{"question": "Why do you need both a HashMap and a doubly linked list? What does each data structure contribute?", "keywords": ["O(1) lookup", "O(1) eviction", "order", "map", "list"]}',
      'Core data structure justification', 20, 1),
    (lab_cache_id, 'free_response', '{"question": "Why does get() require a write lock rather than a read lock in an LRU cache?", "keywords": ["move to front", "linked list mutation", "write lock", "state change"]}',
      'Thread safety for LRU mutation', 15, 2),
    (lab_cache_id, 'free_response', '{"question": "Explain the difference between lazy and active TTL expiry. When would you prefer active expiry?", "keywords": ["background thread", "min-heap", "memory", "scan", "check on get"]}',
      'TTL expiry strategies', 15, 3);

  -- Lab 05: Distributed Message Queue checks
  INSERT INTO quiz_checks (lab_id, check_type, spec_json, description, points, sort_order) VALUES
    (lab_mq_id, 'free_response', '{"question": "How are messages routed to partitions, and what ordering guarantee does this provide?", "keywords": ["hash key", "modulo", "partition", "ordering within partition", "not across partitions"]}',
      'Partition routing and ordering guarantees', 20, 1),
    (lab_mq_id, 'free_response', '{"question": "Explain acks=0, acks=1, and acks=all. What does each trade off?", "keywords": ["durability", "latency", "fire and forget", "leader", "ISR", "all replicas"]}',
      'Producer acknowledgement modes', 20, 2),
    (lab_mq_id, 'free_response', '{"question": "What happens to partition leadership when a broker crashes? How does a consumer recover?", "keywords": ["ISR", "leader election", "controller", "offset", "resume", "metadata refresh"]}',
      'Failure recovery — leader election and consumer resume', 20, 3),
    (lab_mq_id, 'free_response', '{"question": "Two consumer groups subscribe to the same topic. Does one group''s slow consumption affect the other?", "keywords": ["independent offsets", "decoupled", "no", "consumer group", "lag"]}',
      'Consumer group isolation', 15, 4);

END $$;
