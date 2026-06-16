# Frontend Developer Guide

## Project Overview
Vite + React 19 + TypeScript SPA using Feature-Sliced Design (FSD) architecture.

## Tech Stack
- **Core:** React 19.2, TypeScript 6.0, Vite 8.0
- **Routing:** React Router DOM 7.14
- **Styling:** Tailwind CSS 4.2 (with @tailwindcss/vite plugin)
- **UI Components:** Radix UI Primitives, shadcn/ui
- **State Management:** Zustand 5.0 (client state), React Hooks (local state)
- **Forms:** React Hook Form 7.0
- **Dev Tools:** ESLint 9, TypeScript ESLint, @conarti/eslint-plugin-feature-sliced

---

## Architecture: Feature-Sliced Design (FSD)

The codebase follows FSD with strict layered architecture in `src/`:

```
src/
├── app/           # Application setup, providers, routing, global styles
├── pages/         # Route-level components (compose widgets/features/entities)
├── widgets/       # Complex UI blocks (e.g., Header, SideNavbar, ProgressWidget)
├── features/      # User interactions & business logic (e.g., Auth, Sandbox)
├── entities/      # Domain models & business concepts (e.g., Lab, Task, User)
└── shared/        # Reusable utilities, UI components, API clients
```

### Dependency Rules (GOLDEN RULE)
- Layers can ONLY import from **lower layers**
- NEVER import across slices at the same level
- NEVER import upwards in the hierarchy

```
✅ Allowed:  features → entities → shared
❌ Forbidden: features → pages, widgets → features (different slices), entities → features
```

---

- Framework-agnostic utilities
- Reusable UI components (shadcn/ui components)
- API clients (HTTP, WebSocket)

**Structure:**
```
shared/
├── api/         # httpClient, wsClient
├── lib/         # Utilities (cn, formatters)
└── ui/          # Reusable components (Button, Card, Input)
```

--

## Public API Pattern (Gatekeeper)

Every slice MUST export its public API through `index.ts`:

```typescript
// ✅ CORRECT - Export through index.ts
export { LabCard } from './ui/LabCard'
export type { Lab } from './model/lab'

// ❌ FORBIDDEN - Deep imports
import { LabCard } from './ui/LabCard' // Don't do this
```

### Import Examples
```typescript
// ✅ Good
import { LabCard } from '@entities/lab'
import { Button } from '@shared/ui/button'
import { useAuth } from '@features/auth'

// ❌ Bad
import { LabCard } from '@entities/lab/ui/LabCard'
import Card from '../../shared/ui/card'
```

---

## Common Commands

```bash
# Start dev server with hot reload
pnpm dev

# Production build
pnpm build

# Type checking
pnpm tsc

# Linting (ESLint with FSD plugin)
pnpm lint

# Preview production build
pnpm preview
```

---

## React 19 Best Practices

### 1. Use Modern React Patterns
```typescript
// ✅ Use TypeScript with JSX
import type { ReactElement } from 'react';

// ✅ Use functional components with proper typing
interface Props {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<Props> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
);

// ✅ Use useHook naming convention
export const useLab = (labId: string) => { /* ... */ }
```

### 2. State Management Guidelines
- **Component state:** `useState`, `useReducer` for local state
- **Feature state:** Zustand for medium complexity
- **Server state:** TanStack Query (when added) for async data

### 3. Performance Optimization (2026 Standards)
- Use `React.memo` only for expensive renders with measurable benefit
- Avoid over-optimization; Vite's fast refresh is fast enough for dev
- Use `useCallback`/`useMemo` only when passing to memoized children
- Consider `Reactbounded` and `useOptimistic` for optimistic updates

---

## Tailwind CSS 4 Guidelines

### 1. Use CSS Variables for Theming
```typescript
// Use Tailwind CSS 4's native CSS-first configuration
@theme {
  --color-primary: oklch(0.6 0.2 260);
  --font-sans: "Inter", system-ui, sans-serif;
}
```

### 2. Utility-First Approach
```typescript
// ✅ Syntax
className="flex items-center justify-between gap-4 px-4 py-2"

// ✅ With variants
className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"

// ✅ Responsive
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### 3. Component Classes for Repeated Patterns
```typescript
// Use clsx/tailwind-merge for dynamic classes
import { clsx } from 'clsx';
import { type ClassValue, twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## TypeScript Guidelines (2026)

### 1. Strict Mode Enabled
- `noUnusedLocals`, `noUnusedParameters` enforced
- `verbatimModuleSyntax` required
- `moduleDetection: "force"` for consistent bundling

### 2. Type Throughout
```typescript
// ✅ Prefer explicit types on functions
interface User {
  id: string;
  name: string;
  email: string;
}

export const formatUser = (user: User): string => {
  return `${user.name} <${user.email}>`;
};

// ✅ Use type guards for runtime checks
function isError(value: unknown): value is Error {
  return value instanceof Error;
}
```

### 3. Avoid `any`
```typescript
// ❌ Bad
const data: any = response.data;

// ✅ Good
interface ApiResponse {
  data:unknown;
}
const data = response.data as YourType;
// OR better:
const data = validateResponse(response);
```

---

## Styling Conventions

### 1. Component Co-location
- Place styles adjacent to components
- Use Tailwind utility classes in `className`
- Extract shared styles to `shared/ui/`

### 2. Radix UI Integration
```typescript
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
// or use shadcn/ui wrappers
import { Dialog } from '@shared/ui/dialog';
```

### 3. Responsive Design
- Mobile-first approach
- Use Tailwind breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

---

## Testing Guidelines

### Recommended Setup
```bash
# Add testing dependencies
pnpm add -D @testing-library/react @testing-library/jest-dom vitest

# Test structure
src/
├── component.test.tsx
├── component.spec.ts
└── __tests__/
```

### Test Patterns
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

---

## Git & Workflow

1. **Feature Branches:** Create `feat/`, `fix/`, `chore/` branches from `main`
2. **Commit Messages:** Conventional commits (`feat: add lab detail page`)
3. **PR Reviews:** Review imports for FSD compliance
4. **Code Ownership:** Each slice is owned by the developer who created it

---

## Important Notes (2026)

### Do
- ✅ Export through `index.ts` only (public API pattern)
- ✅ Import using path aliases (`@entities/`, `@features/`)
- ✅ Keep slices small and focused
- ✅ Use TypeScript strict mode
- ✅ Leverage React 19 features (Actions, useOptimistic, etc.)

### Don't
- ❌ Cross-slice imports at same level
- ❌ Deep imports into another slice
- ❌ Import from `shared` at app level (circular dependency risk)
- ❌ Use `any` type without justification

### Performance Checklist
- [ ] Code split routes with `React.lazy()`
- [ ] Defer non-critical JavaScript
- [ ] Use `prefetch()` for likely navigations
- [ ] Optimize bundle with dependency analysis

---

## Quick Reference

| Layer | Purpose | Import From |
|-------|---------|-------------|
| `app/` | Bootstrapping, routing | - |
| `pages/` | Route handlers | `@app`, `@widgets`, `@features`, `@entities`, `@shared` |
| `widgets/` | Complex UI blocks | `@features`, `@entities`, `@shared` |
| `features/` | Business logic | `@entities`, `@shared` |
| `entities/` | Domain models | `@shared` |
| `shared/` | Utilities, UI kit | - |