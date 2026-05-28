# Lab 02 — Design a Vending Machine

**Category:** LLD
**Difficulty:** Easy
**Estimated Time:** 20–30 min
**Tags:** State Machine, OOP, Design Patterns

---

## Problem Statement

Design an object-oriented model for a vending machine. The machine holds a fixed inventory of products (snacks, drinks) at various price points. A user interacts with it by inserting coins/notes, selecting a product, and receiving the item plus change.

The machine must correctly handle invalid states — like selecting a product before inserting money, or running out of a specific item. It should support an admin interface for restocking inventory and collecting cash.

This is a classic state machine problem. The elegance of your solution will come from cleanly modeling the states and transitions, not from writing business logic in a big `if-else` chain.

## Functional Requirements

1. Display available products and their prices.
2. Accept money (coins and notes) incrementally — user can insert multiple denominations.
3. Allow product selection once sufficient money is inserted.
4. Dispense the selected product and return exact change.
5. Allow the user to cancel at any time and get their money back.
6. Admin can restock products and collect accumulated cash.
7. Handle edge cases: insufficient funds, out-of-stock item, exact change not available.

## Non-Functional Requirements

1. **Correctness:** State transitions must be valid — no dispensing without payment.
2. **Extensibility:** Adding a new state or product type should not require rewriting existing logic.
3. **Thread safety:** Consider concurrent button presses (optional stretch goal).

## Constraints & Scale

- Max product slots: 20
- Max quantity per slot: 10 units
- Supported denominations: 1, 5, 10, 25 cents; $1, $5 notes
- This is a single-machine, single-user interaction model (no distributed concerns)

## Starting Point

Begin by identifying the **states** the machine can be in. Draw the state transition diagram on paper first — what events trigger transitions between states?

Then think about your class structure: which entities need to exist? What does the `VendingMachine` class own, and what does it delegate?

---

> **Note:** Do not read the discussion guide below until you've worked through your approach.
> Share your design and the interviewer will probe it with follow-up questions.

<details>
<summary>📖 Discussion Guide (click only after attempting)</summary>

## Discussion Guide

### State Transition Diagram

```
         insert money            select product         dispense + change
  IDLE ──────────────► ACCEPTING ──────────────► DISPENSING ──────────────► IDLE
    ▲                     │                          │
    │    cancel/return     │  cancel/return           │  out of stock /
    └─────────────────────┴──────────────────────────┘  no change available
```

States:
- **IDLE** — waiting for money
- **ACCEPTING_MONEY** — money inserted, awaiting product selection or more money
- **DISPENSING** — product selected, dispensing item + change

### Key Classes

```
VendingMachine
  - inventory: Map<String, ProductSlot>
  - cashRegister: CashRegister
  - state: VendingMachineState  ← the Strategy/State pattern object
  - insertMoney(denomination)
  - selectProduct(code)
  - cancel()
  - refill(code, qty)    // admin
  - collectCash()        // admin

VendingMachineState (interface)
  + insertMoney(machine, amount): void
  + selectProduct(machine, code): void
  + cancel(machine): void

IdleState implements VendingMachineState
AcceptingMoneyState implements VendingMachineState
DispensingState implements VendingMachineState

ProductSlot
  - product: Product
  - quantity: int
  - isAvailable(): boolean

Product
  - code: String
  - name: String
  - price: int  // cents

CashRegister
  - denominations: Map<Denomination, int>
  - insertCoins(denomination, count)
  - canMakeChange(amount): boolean
  - dispenseChange(amount): Map<Denomination, int>
  - collect(): void

Denomination (enum)
  CENT_1, CENT_5, CENT_10, CENT_25, DOLLAR_1, DOLLAR_5
```

### The State Pattern in Action

Instead of:
```java
// Bad — everything in one class with giant if-else
public void selectProduct(String code) {
  if (currentState == IDLE) { throw ... }
  else if (currentState == ACCEPTING_MONEY) { ... }
  // ...
}
```

Each state handles its own transitions:
```java
// Good — behavior is encapsulated per state
class IdleState implements VendingMachineState {
  public void selectProduct(VendingMachine m, String code) {
    System.out.println("Please insert money first.");
    // No state change
  }
  public void insertMoney(VendingMachine m, int amount) {
    m.addToBalance(amount);
    m.setState(new AcceptingMoneyState());
  }
}
```

### Change Dispense Algorithm

Greedy approach (works when denominations are standard):
1. Sort denominations descending.
2. For each denomination, use as many as available without exceeding remaining change.
3. If exact change cannot be made → cancel transaction, return all money, stay in IDLE.

### Deep Dives

- **No-change scenario:** What if the machine can't make exact change? You must detect this *before* dispensing the product, not after. Check `canMakeChange()` before transitioning to DISPENSING.
- **Admin vs. user interface:** Consider separating these into two interfaces — `UserInterface` and `AdminInterface` — or using a role-based method guard.
- **Thread safety (stretch):** Use `synchronized` on state transitions or a `ReentrantLock` to prevent two users from selecting the last item simultaneously.

### Common Pitfalls

- Mixing state-specific logic into `VendingMachine` directly — this makes extending states painful.
- Not handling the "insert more money" flow — users should be able to keep adding money in `ACCEPTING_MONEY` state.
- Forgetting to reset `currentBalance` after cancellation or successful purchase.
- Not validating product code before transitioning state.

### Evaluation Rubric

| Area | Weak | Good | Strong |
|------|------|------|--------|
| State modeling | Big if-else in one class | Enum-based state switch | State pattern with separate classes |
| Class design | One giant class | Reasonable separation | Clean SRP, good encapsulation |
| Edge cases | Happy path only | Handles cancel + out-of-stock | Also handles no-change, invalid input |
| Change algorithm | Ignored | Greedy described | Pre-validates, handles failure gracefully |
| Extensibility | Hardcoded | Some flexibility | Easy to add states/products/denominations |

</details>
