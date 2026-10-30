# Caja: Audit Improvements + Negocios Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all P0-P1 audit findings (visual system, onboarding, testing, storage hardening) and build the Negocios module for tracking business investments, receivables, and payment recovery with automatic surplus routing to personal Caja.

**Architecture:** 
- Visual/functional: Extend existing React + Vite + TypeScript + localStorage stack. Add design token system, primitive components, Vitest suite, error boundaries, and versioned storage adapter.
- Negocios: New domain layer (`engine/business.ts`) with pure functions, new types in `types.ts`, new store keys, new tab with modals for sale/capture/payment flows. Payment application returns `{ toInvestment, toPersonalCaja }` where surplus feeds into AmountPanel as pre-filled income.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, localStorage (migrating to IndexedDB via idb in Phase 2), Framer Motion for micro-interactions.

**Spec:** This plan + audit critique (chat history) + Negocios spec (chat history)

## Global Constraints

- No backend; all data local. Future sync protocol must be designed now (vector clocks, deviceId, lastModified per entity).
- Spanish (es-VE) locale for all user-facing text, numbers, dates.
- USD as base currency; VES converted at parallel rate at time of entry.
- No external deps beyond current: react, react-dom, vite, oxlint, typescript. New: vitest, @testing-library/react, framer-motion, idb (Phase 2).
- Bundle budget: main chunk < 100KB gzipped.
- Accessibility: WCAG AA (4.5:1 contrast, focus visible, ARIA labels, keyboard nav).
- Dark mode via `[data-theme="dark"]` on `<html>`, persisted in localStorage.

## Review Focus

1. **Rate staleness during payment** — User records payment with stale rates → wrong USD conversion. Test: payment with rates > 30min old shows warning and uses cached rate.
2. **Partial payment rounding** — Multiple partial payments on same receivable → rounding drift vs investment total. Test: sum of payments equals receivable total within 0.01 USD.
3. **Investment recovery race** — Two simultaneous payments on same investment (different devices future) → double-count recovery. Test: applyPayment is pure; sync layer handles conflict (Phase 2).
4. **Stock deletion on full payment** — Receivable paid in full → stock decremented and receivable removed from "Por cobrar". Test: units available = investment.units - sum(pending receivables).
5. **Surplus routing to Repartir** — Payment surplus appears pre-filled in AmountPanel with source="negocio". Test: handleRegister creates IncomeEntry with buckets per current plan logic.

---

### Task 1: Design Token System + Primitive Components

**Files:**
- Create: `src/design/tokens.ts`
- Create: `src/design/primitives/Button.tsx`
- Create: `src/design/primitives/Chip.tsx`
- Create: `src/design/primitives/Card.tsx`
- Create: `src/design/primitives/Input.tsx`
- Create: `src/design/primitives/Select.tsx`
- Create: `src/design/primitives/SegmentedControl.tsx`
- Create: `src/design/primitives/Toast.tsx`
- Create: `src/design/primitives/Badge.tsx`
- Create: `src/design/primitives/ProgressTrack.tsx`
- Create: `src/design/primitives/EmptyState.tsx`
- Create: `src/design/primitives/Skeleton.tsx`
- Create: `src/design/primitives/Modal.tsx`
- Create: `src/design/index.ts`
- Modify: `src/styles.css` (replace custom properties with token references)
- Modify: All components in `src/components/*.tsx` to use primitives

**Interfaces:**
- Consumes: Current CSS custom properties in `styles.css`
- Produces: Exported primitives + `tokens` object (colors, spacing, radii, typography, motion, semantic roles)

- [ ] **Step 1: Write failing tests for each primitive**

```typescript
// src/design/primitives/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

test('Button renders with primary variant', () => {
  render(<Button variant="primary">Click</Button>)
  expect(screen.getByRole('button')).toHaveClass('btn-primary')
})

test('Button loading state shows spinner', () => {
  render(<Button variant="primary" loading>Click</Button>)
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
})

test('Button disabled prevents click', () => {
  const handleClick = vi.fn()
  render(<Button variant="primary" disabled onClick={handleClick}>Click</Button>)
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/design/primitives/__tests__/Button.test.tsx`
Expected: FAIL (components don't exist)

- [ ] **Step 3: Implement tokens.ts with semantic color roles**

```typescript
// src/design/tokens.ts
export const tokens = {
  color: {
    // Achromatic
    ground: '#eceee9',
    surface: '#fdfdfa',
    raised: '#f3f4ef',
    border: '#d9dcd2',
    rule: '#e7e9e1',
    control: '#c6cabd',
    ink: '#141815',
    muted: '#4a5148',
    faint: '#656b60',
    placeholder: '#717665',
    // Semantic roles (NEW)
    primary: '#141815',
    primaryHover: '#232a26',
    destructive: '#E5404F',      // was guayaba
    destructiveHover: '#c93441',
    destructiveBg: '#ffe3e6',
    constructive: '#247b50',
    constructiveBg: '#dcfae5',
    warning: '#92400e',
    warningBg: '#fffbeb',
    neutral: '#4a5148',
    neutralBg: '#e4e6dd',
    // Guayaba kept for META highlight only
    meta: '#E5404F',
    metaInk: '#8e1d28',
    metaBg: '#ffe3e6',
  },
  // ... spacing, radii, typography, motion, shadows, breakpoints
}
```

- [ ] **Step 4: Implement Button primitive with variants: primary | destructive | ghost | outline, sizes: sm | md | lg, states: loading | disabled**

```tsx
// src/design/primitives/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'destructive' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((...))
```

- [ ] **Step 5: Implement Chip, Badge, Card, Input, Select, SegmentedControl, ProgressTrack, EmptyState, Skeleton, Toast, Modal primitives**

Each with: TypeScript props, semantic token usage, focus-visible styles, ARIA attributes, motion tokens for enter/exit.

- [ ] **Step 6: Refactor styles.css to use token CSS variables; migrate all components to primitives**

Run: `npm run build` → verify no visual regression

- [ ] **Step 7: Add dark mode tokens + ThemeProvider + toggle in SettingsView**

- [ ] **Step 8: Commit**

```bash
git add src/design src/styles.css src/components
git commit -m "feat: design token system + primitive components + dark mode"
```

---

### Task 2: Onboarding Flow (3 Steps)

**Files:**
- Create: `src/components/OnboardingView.tsx`
- Create: `src/components/OnboardingStep1.tsx` (Gastos fijos estimator)
- Create: `src/components/OnboardingStep2.tsx` (Risk profile picker)
- Create: `src/components/OnboardingStep3.tsx` (First income walkthrough)
- Modify: `src/App.tsx` (show onboarding if `settings.fixedExpensesUSD <= 0 && history.length === 0`)
- Modify: `src/lib/store.ts` (add `onboardingComplete` flag)

**Interfaces:**
- Consumes: `Settings`, `DEFAULT_SETTINGS`, `setSettings`
- Produces: Complete settings + `onboardingComplete: true` in localStorage

- [ ] **Step 1: Write failing test for onboarding flow**

```typescript
// src/components/__tests__/OnboardingView.test.tsx
test('OnboardingStep1 saves fixedExpensesUSD and advances', () => {
  render(<OnboardingStep1 onNext={mockNext} />)
  fireEvent.change(screen.getByLabelText(/gastos fijos/i), { target: { value: '350' } })
  fireEvent.click(screen.getByText(/continuar/i))
  expect(mockNext).toHaveBeenCalledWith({ fixedExpensesUSD: 350 })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement OnboardingStep1 with presets (200, 350, 500, 800) + custom input**

- [ ] **Step 4: Implement OnboardingStep2 with 3 risk cards showing scenario outcomes**

```tsx
// Each card shows: "Con $350/mes: Liquidez → $120 libre, $150 colchón, $80 metas"
```

- [ ] **Step 5: Implement OnboardingStep3 with live AmountPanel preview (no persistence)**

- [ ] **Step 6: Wire in App.tsx; gate behind `!settings.onboardingComplete`**

- [ ] **Step 7: Commit**

```bash
git add src/components/Onboarding*.tsx src/App.tsx src/lib/store.ts
git commit -m "feat: 3-step onboarding flow"
```

---

### Task 3: Repartir Redesign — Stepper (Input → Preview → Confirm)

**Files:**
- Create: `src/components/RepartirStepper.tsx`
- Create: `src/components/RepartirInputStep.tsx`
- Create: `src/components/RepartirPreviewStep.tsx`
- Create: `src/components/RepartirConfirmStep.tsx`
- Modify: `src/App.tsx` (replace Repartir tab content with RepartirStepper)
- Modify: `src/components/AmountPanel.tsx` (extract reusable input section)

**Interfaces:**
- Consumes: `AmountPanel` logic, `buildPlan`, `handleSubmit`, `handleRegister`
- Produces: Same final `handleRegister` call; improved UX

- [ ] **Step 1: Write failing test for stepper navigation**

```typescript
test('Stepper advances from input to preview on submit', () => {
  render(<RepartirStepper {...props} />)
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '100' } })
  fireEvent.click(screen.getByText(/repartir/i))
  expect(screen.getByText(/vista previa/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement 3-step stepper with progress indicator**

Step 1: Amount + Currency + Source + Reason (sticky bottom: "Repartir")
Step 2: PlanView (read-only) + "Editar" (back) + "Confirmar" 
Step 3: Success toast with bucket summary + "Nuevo ingreso"

- [ ] **Step 4: Preserve manual distMode toggle in Step 1 (hidden advanced)**

- [ ] **Step 5: Commit**

```bash
git add src/components/RepartirStepper*.tsx src/App.tsx
git commit -m "feat: Repartir stepper flow"
```

---

### Task 4: Vitest Suite for Engine (90% Coverage)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/engine/__tests__/allocate.test.ts` (20+ scenarios)
- Create: `src/engine/__tests__/rates.test.ts` (fetch, cache, fallback)
- Create: `src/engine/__tests__/analyze.test.ts` (monthStats, allMovements)
- Create: `src/lib/__tests__/format.test.ts`
- Create: `src/lib/__tests__/validate.test.ts`
- Create: `src/lib/__tests__/store.test.ts`

**Interfaces:**
- Consumes: All pure functions in `engine/`, `lib/format`, `lib/validate`, `lib/store`
- Produces: Test coverage report; CI gate

- [ ] **Step 1: Configure vitest.config.ts with coverage thresholds**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: { provider: 'v8', thresholds: { lines: 90, functions: 90, branches: 80 } },
    environment: 'jsdom',
  },
})
```

- [ ] **Step 2: Write allocate.test.ts covering tier boundaries, risk profiles, custody split, goal urgency, stale rates, zero goals**

Scenarios (each a `test`):
- Tier supervivencia (< 0.33 ratio) → only gastos
- Tier ajustado (0.33-0.85) → gastos + 50/40/10 split (equilibrado)
- Tier normal (0.85-2) → gastos + 35/50/15 split
- Tier holgado (> 2) → gastos + 20/60/20 split
- Risk liquidez shifts +5% to colchon, +10% libre, -15% metas
- Risk dolarizar shifts +10% colchon, +5% metas, -15% libre
- Custody split > 400 → colchon split 60/40 binance/efectivo
- Goal urgency: priority 1, 15 days → score 1.35/sqrt(15)
- Zero active goals → metasShare → libre + note
- Stale rates → verdict.confidence = 'baja' + note
- VES income conversion at paralelo rate

- [ ] **Step 3: Run tests; implement missing logic to pass**

Run: `npm test -- --run`

- [ ] **Step 4: Write rates.test.ts: fetch success, cache hit, fallback to cached, all fail → EMPTY_RATES**

- [ ] **Step 5: Write analyze.test.ts: monthStats categories, top 4, daysActive, avgDaily basis**

- [ ] **Step 6: Write format.test.ts: parseAmount (VE/US formats), digits, groupVeAmount, sanitizeAmountInput**

- [ ] **Step 7: Write validate.test.ts: sanitizeBackup rejects malicious payload, clamps values, preserves valid data**

- [ ] **Step 8: Write store.test.ts: load/save roundtrip, migration from v0, corruption recovery**

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts src/engine/__tests__ src/lib/__tests__
git commit -m "test: vitest suite 90% coverage on engine"
```

---

### Task 5: Storage Adapter + Migration + Error Boundaries

**Files:**
- Create: `src/lib/storage.ts` (StorageAdapter class)
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/lib/store.ts` (delegate to StorageAdapter)
- Modify: `src/App.tsx` (wrap each tab in ErrorBoundary)

**Interfaces:**
- Consumes: Current `localStorage` keys (`caja.v1.*`)
- Produces: Versioned schema (`caja.v2.*`), migration fn, corruption fallback, quota handling

- [ ] **Step 1: Write failing test for migration v1 → v2**

```typescript
test('migrates v1 settings to v2 with defaults', () => {
  localStorage.setItem('caja.v1.settings', JSON.stringify({ fixedExpensesUSD: 300 }))
  const adapter = new StorageAdapter()
  const settings = adapter.loadSettings()
  expect(settings.custodySplitUSD).toBe(400) // v2 default
  expect(settings.expensesInBs).toBe(true)   // v2 default
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement StorageAdapter with schema version, migrate(), load(), save(), clear()**

```typescript
// src/lib/storage.ts
const SCHEMA_VERSION = 2
const PREFIX = 'caja.v2.'

class StorageAdapter {
  migrate(raw: Record<string, string>) { /* v1→v2 */ }
  loadSettings(): Settings { /* read + migrate */ }
  saveSettings(s: Settings) { /* write + handle quota */ }
  // ... same for goals, history, expenses, rates
}
```

- [ ] **Step 4: Implement ErrorBoundary with fallback UI per tab + reset action**

```tsx
// src/components/ErrorBoundary.tsx
interface Props { children: React.ReactNode; tab: Tab; onReset: () => void }
export function ErrorBoundary({ children, tab, onReset }: Props) { ... }
```

- [ ] **Step 5: Wrap each tab in App.tsx: `<ErrorBoundary tab={tab} onReset={() => setTab('repartir')}>`

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/components/ErrorBoundary.tsx src/lib/store.ts src/App.tsx
git commit -m "feat: storage adapter v2 + error boundaries"
```

---

### Task 6: Negocios Types + Store Keys

**Files:**
- Modify: `src/types.ts` (add BusinessProduct, BusinessInvestment, AccountsReceivable, Payment)
- Modify: `src/lib/store.ts` (add load/save for businessProducts, businessInvestments, businessReceivables)

**Interfaces:**
- Consumes: Existing `AccountId`, `Currency`, `newId`
- Produces: New types + store functions

- [ ] **Step 1: Add types to types.ts**

```typescript
export interface BusinessProduct { ... }
export interface BusinessInvestment { ... }
export interface AccountsReceivable { ... }
export interface Payment { ... }
```

- [ ] **Step 2: Add store functions**

```typescript
export const loadBusinessProducts = () => readList<BusinessProduct>('businessProducts')
export const saveBusinessProducts = (p: BusinessProduct[]) => write('businessProducts', p)
// ... investments, receivables
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/lib/store.ts
git commit -m "feat: negocio types + store keys"
```

---

### Task 7: Negocios Engine (Pure Functions)

**Files:**
- Create: `src/engine/business.ts`
- Create: `src/engine/__tests__/business.test.ts`

**Interfaces:**
- Consumes: `BusinessInvestment`, `AccountsReceivable`, `Payment`, `AccountId`, `Currency`, `Rates`
- Produces: `createInvestment`, `createReceivable`, `applyPayment`, `getInvestmentStatus`, `getReceivablesAging`, `getAvailableUnits`, `calculateInvestmentROI`

- [ ] **Step 1: Write failing tests for applyPayment (core logic)**

```typescript
test('applyPayment routes to investment first, then surplus to personal', () => {
  const inv = { totalCostUSD: 300, recoveredUSD: 180, status: 'active' }
  const result = applyPayment(200, inv)
  expect(result.toInvestment).toBe(120)  // fills remaining 120
  expect(result.toPersonalCaja).toBe(80) // surplus
  expect(inv.recoveredUSD).toBe(300)
  expect(inv.status).toBe('recovered')
})

test('applyPayment partial payment only to investment', () => {
  const inv = { totalCostUSD: 300, recoveredUSD: 50, status: 'active' }
  const result = applyPayment(100, inv)
  expect(result.toInvestment).toBe(100)
  expect(result.toPersonalCaja).toBe(0)
})

test('applyPayment on recovered investment routes all to personal', () => {
  const inv = { totalCostUSD: 300, recoveredUSD: 300, status: 'recovered' }
  const result = applyPayment(100, inv)
  expect(result.toInvestment).toBe(0)
  expect(result.toPersonalCaja).toBe(100)
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement business.ts**

```typescript
// src/engine/business.ts
export function createInvestment(input: { productId: string; productName: string; units: number; unitCostUSD: number; fundedFrom: AccountId }): BusinessInvestment { ... }
export function createReceivable(input: { investmentId: string; productId: string; productName: string; client: string; units: number; unitPrice: number; currency: Currency; agreedDate: number; rates: Rates }): AccountsReceivable { ... }
export function applyPayment(paymentUSD: number, investment: BusinessInvestment): { toInvestment: number; toPersonalCaja: number } { ... }
export function getAvailableUnits(investment: BusinessInvestment, receivables: AccountsReceivable[]): number { ... }
export function getReceivablesAging(receivables: AccountsReceivable[], rates: Rates): AgingBucket[] { ... }
export function calculateInvestmentROI(investment: BusinessInvestment, receivables: AccountsReceivable[]): { roi: number; paybackDays: number } { ... }
```

- [ ] **Step 4: Implement VES cost support: createInvestment accepts `unitCostVES` + `rateUsed`, converts to USD**

- [ ] **Step 5: Implement stock logic: getAvailableUnits = investment.units - sum(pending receivables.units); when all receivables paid → investment.status = 'closed'**

- [ ] **Step 6: Implement abonos (partial payments): applyPayment handles any amount; receivable.paidUSD accumulates; status: pending | partial | paid | overdue**

- [ ] **Step 7: Run tests; verify all pass**

Run: `npm test -- src/engine/__tests__/business.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/engine/business.ts src/engine/__tests__/business.test.ts
git commit -m "feat: negocio engine pure functions"
```

---

### Task 8: Negocios UI — Tab + Cards + Modals

**Files:**
- Create: `src/components/NegociosView.tsx`
- Create: `src/components/InvestmentCard.tsx`
- Create: `src/components/ReceivableCard.tsx`
- Create: `src/components/NewSaleModal.tsx`
- Create: `src/components/PaymentModal.tsx`
- Create: `src/components/ProductPicker.tsx`
- Modify: `src/components/Nav.tsx` (add `negocios` tab + icon)
- Modify: `src/App.tsx` (add NegociosView, wire modals)

**Interfaces:**
- Consumes: `BusinessProduct`, `BusinessInvestment`, `AccountsReceivable`, `Payment`, engine functions, store functions, `Rates`, `AccountId`
- Produces: Full CRUD for products, investments, receivables, payments; payment triggers surplus to AmountPanel

- [ ] **Step 1: Write failing test for InvestmentCard render**

```typescript
test('InvestmentCard shows progress and actions', () => {
  render(<InvestmentCard investment={mockInv} receivables={mockRec} onPayment={mockFn} />)
  expect(screen.getByText(/camisas polo/i)).toBeInTheDocument()
  expect(screen.getByText(/60%/i)).toBeInTheDocument()
  expect(screen.getByText(/registrar cobro/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement NegociosView with sections: Inversiones activas, Por cobrar, Productos**

- [ ] **Step 4: Implement InvestmentCard with progress bar, recovered %, [Ver CxC], [Registrar cobro]**

- [ ] **Step 5: Implement ReceivableCard with client, units, total, agreed date, paid, status badge, [Marcar pago], [Editar]**

- [ ] **Step 6: Implement NewSaleModal: product picker (from investments with stock), quantity, client, agreed date, currency, linked investment (auto FIFO)**

- [ ] **Step 7: Implement PaymentModal: shows receivable balance, amount input, account picker (efectivo_usd/banesco/binance), date, note; PREVIEW shows "Se aplicará: $X a inversión, $Y a tu caja libre"**

- [ ] **Step 8: Wire PaymentModal.onConfirm → applyPayment → if surplus > 0: open AmountPanel with amountRaw=surplus, source=account, reason=`Cobro: ${client} (${product})`**

- [ ] **Step 9: Add "Abonar" (partial payment) support in PaymentModal (default = full balance)**

- [ ] **Step 10: When receivable fully paid → remove from "Por cobrar", decrement stock, if investment fully recovered → status = 'recovered'**

- [ ] **Step 11: Commit**

```bash
git add src/components/Negocios*.tsx src/components/InvestmentCard.tsx src/components/ReceivableCard.tsx src/components/*Modal.tsx src/components/Nav.tsx src/App.tsx
git commit -m "feat: negocio UI tab + modals + payment→surplus routing"
```

---

### Task 9: Integration Polish + Audit Remaining P1s

**Files:**
- Modify: `src/components/AmountPanel.tsx` (accept pre-filled amount from negocio payment)
- Modify: `src/components/CuentasView.tsx` (toggle "Incluir negocio")
- Modify: `src/components/AnalisisView.tsx` (toggle "Incluir negocio")
- Modify: `src/engine/rates.ts` (add rate freshness badge in RateRail)
- Modify: `src/components/RateRail.tsx` (show "hace X min" + warning if stale > 30min)
- Modify: `package.json` (add test script, coverage thresholds)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Cohesive app with audit P1s addressed

- [ ] **Step 1: AmountPanel accepts `initialAmount?: number` prop; pre-fills input, focuses reason field**

- [ ] **Step 2: CuentasView + AnalisisView add segmented control: "Personal" | "Negocio" | "Consolidado"**

- [ ] **Step 3: RateRail shows freshness: "hace 2 min" | "hace 45 min ⚠️"**

- [ ] **Step 4: Add micro-interactions (Framer Motion): button press scale, list insert/remove, tab cross-fade, verdict card entry**

- [ ] **Step 5: Run full test suite; verify build; verify bundle size**

Run: `npm test -- --run && npm run build && npx vite-bundle-analyzer`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: integration polish + rate freshness + micro-interactions"
```

---

### Task 10: PWA Install + Offline Ready (Foundation for Future Sync)

**Files:**
- Modify: `public/manifest.webmanifest` (add shortcuts, share_target)
- Modify: `public/sw.js` (add stale-while-revalidate for API calls, background sync placeholder)
- Create: `src/hooks/useInstallPrompt.ts`
- Modify: `src/components/SettingsView.tsx` (add "Instalar app" button if supported)

**Interfaces:**
- Consumes: Existing SW + manifest
- Produces: Installable PWA with offline shell; sync protocol designed in code comments

- [ ] **Step 1: Update manifest with shortcuts: "Nuevo ingreso", "Registrar gasto", "Nueva venta"**

- [ ] **Step 2: SW: cache static assets; network-first for rates API with 10min TTL; background sync queue for future mutations**

- [ ] **Step 3: useInstallPrompt hook + "Instalar" button in Ajustes**

- [ ] **Step 4: Document sync protocol in `docs/SYNC_PROTOCOL.md` (vector clocks, deviceId, lastModified, conflict resolution: last-write-wins per entity with user merge for IncomeEntry)**

- [ ] **Step 5: Commit**

```bash
git add public/manifest.webmanifest public/sw.js src/hooks/useInstallPrompt.ts src/components/SettingsView.tsx docs/SYNC_PROTOCOL.md
git commit -m "feat: PWA install + sync protocol design"
```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-29-caja-audit-negocios.md`.**

**Recommended execution: Native (single session)** — Tasks are highly sequential (tokens → primitives → onboarding → stepper → tests → storage → negocio types → engine → UI → integration). Each task depends on the previous task's interfaces. A single context carrying all decisions is faster and cheaper than 10 sub-agent handoffs. A fresh reviewer at the end (subagent or new session) can verify the complete branch.

**Please review the plan. Does it capture what you want?**