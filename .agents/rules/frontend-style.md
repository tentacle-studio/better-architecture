---
trigger: always_on
---

# Frontend Skill: React + TypeScript Feature-Sliced Design (FSD)

## Objective
You are an expert frontend developer operating within a Vite + React + TypeScript Single Page Application (SPA). Your primary directive is to strictly adhere to the Feature-Sliced Design (FSD) architectural methodology. Consistency, unidirectional dependencies, and explicit public APIs are your highest priorities.

## Tech Stack
* **Core:** React 18+, TypeScript, Vite
* **Routing:** React Router (client-side)
* **State Management:** Local state (React Hooks), Entity/Feature state (Zustand/Jotai), Server State (TanStack Query)
* **Styling:** [Insert your styling choice, e.g., Tailwind CSS / CSS Modules]

---

## 1. Architectural Layers & Hierarchy
The application is located in the `src/` directory and is strictly divided into the following layers. 
**Crucial Rule:** A layer can ONLY import from the layers *below* it. NEVER import upwards. NEVER import across slices within the same layer (except in `shared`).

1.  `app/` (Highest): Global application setup, routing initialization, global styles, and root providers.
2.  `pages/`: Route-level components. Pages compose Widgets, Features, and Entities.
3.  `widgets/`: Complex, autonomous UI blocks (e.g., `Header`, `UserProfileCard`). Composes Features and Entities.
4.  `features/`: Specific business logic and user interactions (e.g., `AddToCart`, `AuthByEmail`). Composes Entities.
5.  `entities/`: Business domain concepts, data models, and pure UI representations of data (e.g., `User`, `Product`, `Order`).
6.  `shared/` (Lowest): Domain-agnostic, reusable utilities, UI kits, API instances, and helpers. Can be imported by ANY layer above it.

---

## 2. Strict Dependency Rules (The Golden Rules)
When generating code or adding imports, you MUST verify the import complies with these rules:
* **Unidirectional Flow:** `features` can import from `entities` and `shared`. `features` CANNOT import from `pages`, `widgets`, or other `features`.
* **Cross-Slice Isolation:** A slice within a layer cannot import from another slice in the same layer. (e.g., `features/cart` CANNOT import from `features/checkout`). If they need to share logic, that logic belongs in `entities` or `shared`.
* **Path Aliases:** ALWAYS use absolute path aliases for cross-layer imports. NEVER use relative paths like `../../` to escape a slice.
    * Allowed: `import { Button } from '@shared/ui/Button'`
    * Forbidden: `import { Button } from '../../../shared/ui/Button'`

---

## 3. The Public API (Gatekeeper Pattern)
Every slice (inside `pages`, `widgets`, `features`, `entities`) MUST have an `index.ts` file at its root.
* This `index.ts` serves as the Public API for that module.
* **Rule:** When importing from a slice, you MUST import from its root `index.ts`.
* **Forbidden:** Deep imports are strictly prohibited. 
    * Allowed: `import { AddToCart } from '@features/add-to-cart'`
    * Forbidden: `import { AddToCart } from '@features/add-to-cart/ui/AddToCart'`

---

## 4. Slice Anatomy (Micro-Structure)
When creating a new Feature or Entity, use the following standard segment folders. Only create the segments that are actually needed.

```text
layer-name/slice-name/
├── ui/         # UI components and their specific styles/tests
├── model/      # Business logic, state (Zustand/Redux slices), selectors
├── lib/        # Internal utility functions specific to this slice
├── api/        # API requests specific to this slice (e.g., RTK Query endpoints)
└── index.ts    # Public API export