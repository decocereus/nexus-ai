---
name: nexus-elements-view-history
description: Integrate the ViewHistory element for Nexus intent history in React/TypeScript apps. Use when installing or debugging intent-history retrieval, infinite-scroll pagination, modal/inline history UIs, and refresh events tied to completed bridge/transfer/deposit flows.
---

# Nexus Elements - View History

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/view-history`
- Ensure `NexusProvider` is installed and initialized before rendering.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is initialized.
- Ensure wallet is connected before expecting history data.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before expecting history fetches.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import ViewHistory from "@/components/view-history/view-history";

export function HistoryPanel() {
  return <ViewHistory viewAsModal={false} className="w-full" />;
}
```

## Live prop contract
- `viewAsModal?` (default `true`): modal trigger vs inline list.
- `className?`: styling for trigger in modal mode.

## SDK flow details (under the hood)
- Fetching:
  - calls `sdk.getMyIntents()`
  - stores full history and paginates client-side (`ITEMS_PER_PAGE = 10`)
- Status derivation:
  - fulfilled -> `Fulfilled`
  - deposited -> `Deposited`
  - refunded -> `Refunded`
  - fallback -> `Failed`
- Refresh integration:
  - listens for `nexus:intent-history:refresh`
  - bridge/transfer hooks dispatch this event after successful completion

## Error and loading behavior
- `history === null` renders loading state.
- fetch failure sets `loadError` and renders retry UI.
- retry button re-runs `getMyIntents` fetch.

## E2E verification
- Open modal and confirm history fetch on open.
- Scroll to bottom and confirm incremental pagination loads.
- Complete a bridge/transfer flow and confirm history refreshes.
- Disconnect wallet and verify empty/error handling remains stable.

## Common failure cases
- No history displayed despite transactions:
  - verify wallet connected to same account used for intents.
- Infinite spinner risk:
  - ensure fetch errors are surfaced and retry path is shown.
