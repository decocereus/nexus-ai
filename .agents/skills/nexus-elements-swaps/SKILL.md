---
name: nexus-elements-swaps
description: Integrate the SwapWidget element for cross-chain exact-in and exact-out swaps in React/TypeScript apps. Use when installing or debugging swap simulations, source selection for exact-out mode, swap intent approvals, and event-driven progress using `sdk.swapWithExactIn`/`sdk.swapWithExactOut`.
---

# Nexus Elements - Swaps

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/swaps`
- Ensure `NexusProvider` is installed and initialized before rendering.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is initialized.
- Ensure `swapBalance` is fetched (`fetchSwapBalance` is called by hook if missing).

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before swap simulation starts.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import SwapWidget from "@/components/swaps/swap-widget";

export function SwapPanel() {
  return (
    <SwapWidget
      onStart={() => {
        // swap started
      }}
      onComplete={(amount) => {
        console.log("Destination amount:", amount);
      }}
      onError={() => {
        console.error("Swap failed");
      }}
    />
  );
}
```

## Live prop contract
- `onStart?(): void`
- `onComplete?(amount?: string): void`
- `onError?(): void` (component signature currently ignores message argument)

## SDK flow details (under the hood)
- Exact-in mode:
  - build `ExactInSwapInput`
  - call `sdk.swapWithExactIn(input, { onEvent })`
- Exact-out mode:
  - build `ExactOutSwapInput`
  - optional `fromSources` comes from selected source options
  - call `sdk.swapWithExactOut(input, { onEvent })`
- Intent confirmation:
  - uses `swapIntent.current` from `setOnSwapIntentHook`
  - final execution happens after `swapIntent.current.allow()` in `continueSwap()`
- Event mapping:
  - listens for `NEXUS_EVENTS.SWAP_STEP_COMPLETE`
  - captures source/destination explorer URLs from step payloads

## Understand mode behavior
- Widget auto-simulates when inputs are valid (debounced).
- `exactIn`: requires source chain/token/amount and destination chain/token.
- `exactOut`: requires destination chain/token/amount; sources are auto-selected unless overridden.
- Exact-out source selection:
  - users can toggle source options.
  - if selection changes, widget re-simulates before allowing continue.

## E2E verification
- Enter exact-in inputs and confirm simulation starts automatically.
- Confirm swap intent appears and progress steps render.
- Switch to exact-out, set destination amount, and verify source options load.
- Change exact-out source selection and confirm re-simulation occurs.
- Continue swap and confirm explorer links for source/destination swaps.
- Confirm balances refresh after success.

## Common failure cases
- No valid inputs for current mode:
  - ensure required fields for active mode are populated.
- Stale intent after input changes:
  - widget calls `deny()` and resets; re-enter or wait for re-simulation.
- Simulation loops:
  - clear errors and verify destination/source token-chain combinations are supported.
