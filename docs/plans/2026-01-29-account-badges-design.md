# Account Badges on Transaction Page

## Overview

Add compact icon badges next to account addresses on transaction detail pages to display account labels from the Stellarchain API. Icons show verified status, known account name, and organization affiliation with tooltips for details.

## Data Source

**Stellarchain API only** - no Horizon account data for labels.

Fields used:
- `label.name` - Account name
- `label.verified` - Verification status (1 = verified)
- `org_name` - Organization name

## Visual Design

### Icons

| Status | Icon | Color | Tooltip |
|--------|------|-------|---------|
| Verified | Checkmark (✓) | `var(--primary-blue)` | "Verified: {label.name}" |
| Has Label (not verified) | Tag | `var(--text-muted)` | "{label.name}" |
| Has Org | Building | `var(--text-secondary)` | "Org: {org_name}" |

### Display Rules

- Show **all applicable icons** for each account (max 2-3)
- Icon size: 12-14px (`w-3.5 h-3.5`)
- Gap: 4px after address, 2px between icons
- Tooltip delay: 200ms

## Architecture

### Data Flow

```
transaction/[hash]/page.tsx (server component)
  ├── Fetch transaction, operations, effects (existing)
  ├── Extract all unique account addresses from data
  ├── Call getAccountLabels(addresses)
  └── Pass labels Map to view components
        └── Views render AccountBadges next to addresses
```

### New Types

```typescript
// src/lib/stellar.ts
export interface AccountLabel {
  name: string;
  verified: boolean;
  org_name: string | null;
  description: string | null;
}
```

### New Functions

```typescript
// src/lib/stellar.ts

// Fetch label for a single account
export async function getAccountLabel(
  address: string
): Promise<AccountLabel | null>

// Batch fetch labels for multiple accounts
export async function getAccountLabels(
  addresses: string[]
): Promise<Map<string, AccountLabel>>
```

### New Component

```typescript
// src/components/AccountBadges.tsx
interface AccountBadgesProps {
  address: string;
  labels: Map<string, AccountLabel>;
  size?: 'sm' | 'md';
}
```

## Integration Points

Badges appear next to account addresses in:

1. **Transaction header** - source account
2. **Operations list** - `source_account`, `from`, `to`, `account` fields
3. **Effects list** - `account` field
4. **Swap/Payment summaries** - destination addresses

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/stellar.ts` | Add `AccountLabel` type, `getAccountLabel()`, `getAccountLabels()` |
| `src/components/AccountBadges.tsx` | New component (create) |
| `src/app/transaction/[hash]/page.tsx` | Extract addresses, fetch labels, pass to views |
| `src/components/mobile/TransactionMobileView.tsx` | Add `labels` prop, render `AccountBadges` |
| `src/components/desktop/TransactionDesktopView.tsx` | Add `labels` prop, render `AccountBadges` |

## Implementation Steps

1. Add `AccountLabel` type and API functions to `stellar.ts`
2. Create `AccountBadges` component with icons and tooltips
3. Update transaction page to fetch labels server-side
4. Update `TransactionMobileView` to display badges
5. Update `TransactionDesktopView` to display badges
