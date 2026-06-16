# Lab 04 — Design an In-Memory Cache with TTL

**Category:** LLD
**Difficulty:** Medium
**Estimated Time:** 25–35 min
**Tags:** Data Structures, Concurrency, Eviction Policies, LRU

---

## Problem Statement

Design an in-memory key-value cache that supports TTL (time-to-live) expiration and an LRU (Least Recently Used) eviction policy. Think of it as building a simplified, single-node version of Redis.

The cache has a fixed capacity (number of entries). When it's full and a new key needs to be inserted, the least recently used entry is evicted. Additionally, entries can be given a TTL — after which they are considered expired and should not be returned.

This is a fundamental component in almost every production system. Your solution needs to be correct, efficient (O(1) operations), and thread-safe for concurrent access.

## Functional Requirements

1. `put(key, value, ttl?)` — insert or update an entry, with an optional TTL in seconds.
2. `get(key)` — return the value if the key exists and hasn't expired; return null/None otherwise.
3. `delete(key)` — explicitly remove an entry.
4. `size()` — return the number of currently valid (non-expired) entries.
5. Entries without TTL never expire unless evicted by LRU.
6. Expired entries should not be returned even if not yet physically removed.
7. (Stretch) `keys()` — return all currently valid keys.

## Non-Functional Requirements

1. **Time complexity:** `get` and `put` must be O(1) average.
2. **Space complexity:** Bounded by `capacity` — never exceed max entries.
3. **Thread safety:** Safe for concurrent reads and writes from multiple goroutines/threads.
4. **Correctness:** Expired entries must never be returned; LRU order must be exact.

## Constraints & Scale

- Max capacity: configurable (e.g., 1,000 to 10,000,000 entries)
- TTL resolution: seconds (no sub-second needed)
- This is a single-node, in-process cache (not distributed)
- Assume high read throughput: 100K ops/sec on a single instance

## Starting Point

The classic LRU cache uses a **hash map + doubly linked list** in tandem. Before writing any code, explain:

1. Why do you need both structures? What does each one give you?
2. Where in the linked list does a newly accessed entry go?
3. How does TTL interact with LRU eviction — should an expired entry count as "least recently used"?

---

> **Note:** Do not read the discussion guide below until you've worked through your approach.
> Share your design and the interviewer will probe it with follow-up questions.

<details>
<summary>📖 Discussion Guide (click only after attempting)</summary>

## Discussion Guide

### Core Data Structure

**HashMap + Doubly Linked List** gives O(1) for all operations:

- `HashMap<Key, Node>` → O(1) lookup by key
- `DoublyLinkedList` → O(1) move-to-front (most recently used) and evict-from-tail (least recently used)

```
HEAD ↔ [key3, val3] ↔ [key1, val1] ↔ [key5, val5] ↔ TAIL
        most recent                       least recent
```

On `get(key)`:
1. Look up node in map → O(1)
2. Check if expired → if yes, remove and return null
3. Move node to HEAD (most recently used)
4. Return value

On `put(key, value, ttl)`:
1. If key exists → update value, update expiry, move to HEAD
2. If at capacity → evict TAIL node, remove from map
3. Create new node, add to HEAD, add to map

### Class Design

```go
type Node struct {
    Key       string
    Value     interface{}
    ExpiresAt time.Time  // zero value = never expires
    Prev, Next *Node
}

type Cache struct {
    capacity int
    mu       sync.RWMutex
    items    map[string]*Node
    head     *Node  // sentinel
    tail     *Node  // sentinel
}

func NewCache(capacity int) *Cache
func (c *Cache) Get(key string) (interface{}, bool)
func (c *Cache) Put(key string, value interface{}, ttl time.Duration)
func (c *Cache) Delete(key string)
func (c *Cache) Size() int
```

Using **sentinel nodes** (dummy head and tail) avoids nil-pointer edge cases when the list is empty or has one element.

### TTL Implementation: Lazy vs. Active Expiry

**Lazy expiry (simpler):**
- Check expiry only on `get()` — if expired, remove and return null
- Pro: zero background overhead
- Con: expired entries occupy memory until touched; `size()` may overcount

**Active expiry (more correct):**
- Background goroutine/thread periodically scans for expired entries and removes them
- Use a **min-heap** (priority queue) ordered by `expiresAt` for efficient scanning
- Or maintain a separate `expiry_bucket` map: `second_timestamp → []keys`

**Recommended:** Lazy expiry for the interview + mention active expiry as an optimization.

### Thread Safety

```go
// Read path — use RLock for concurrent reads
func (c *Cache) Get(key string) (interface{}, bool) {
    c.mu.Lock()  // full lock needed since we mutate LRU order on get
    defer c.mu.Unlock()
    // ...
}

// Write path
func (c *Cache) Put(...) {
    c.mu.Lock()
    defer c.mu.Unlock()
    // ...
}
```

Note: even `Get` requires a **write lock** because it mutates the linked list order (move-to-front). If you want true read concurrency, you'd need a more complex approach (e.g., separate lock for the LRU order, or a lock-free structure).

### TTL and LRU Interaction

When evicting by LRU:
- Should you prefer evicting expired entries first? **Yes** — it's more memory-efficient.
- On every `put`, do a quick check: if the tail node is already expired, evict it first before considering LRU eviction.

### Deep Dives

- **`size()` accuracy:** With lazy expiry, `size()` should either scan and filter (expensive) or maintain a separate `validCount` decremented on expiry detection.
- **LFU as alternative:** LFU (Least Frequently Used) is fairer for "popular" keys but harder to implement in O(1). LRU is the standard interview answer; mention LFU exists.
- **Memory limit vs. count limit:** Real caches often limit by bytes, not entry count. This requires tracking per-entry memory size — a worthwhile discussion point.

### Common Pitfalls

- Forgetting sentinel nodes → null pointer errors at list boundaries.
- Updating only the map on `put` without moving the node to HEAD in the linked list.
- Not removing the map entry when evicting from the linked list tail.
- Returning stale values for expired keys instead of null — check TTL on every `get`.
- Using `sync.RWMutex` with `RLock` on `get` — but forgetting that `get` mutates order and needs a write lock.

### Evaluation Rubric

| Area | Weak | Good | Strong |
|------|------|------|--------|
| Data structure choice | Array/slice | HashMap only | HashMap + DLL, explains why both needed |
| O(1) operations | Can't achieve it | Achieves get/put O(1) | Full O(1) incl. eviction, explains sentinel nodes |
| TTL | Ignored | Checks on get | Lazy + mentions active expiry with min-heap |
| Thread safety | Ignored | Adds mutex | Explains RLock vs Lock tradeoff for LRU mutation |
| Edge cases | Happy path | Handles expiry | Expired-before-evict, zero-TTL, capacity=1 |

</details>
