---
name: nexus-elements-fast-bridge
description: Integrate the FastBridge element for intent-based cross-chain bridge UX in React/TypeScript apps. Use when installing or debugging self-bridge flows, source-chain selection, allowance gating, step progress events, and `sdk.bridge` execution end-to-end.
---

# Nexus Elements - Fast Bridge

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/fast-bridge`
- Ensure `NexusProvider` is installed and initialized on wallet connect before rendering `FastBridge`.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is non-null.
- Ensure `bridgableBalance` has loaded.
- Pass connected wallet address as `connectedAddress`.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before allowing bridge actions.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import FastBridge from "@/components/fast-bridge/fast-bridge";
import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

export function BridgePanel({ address }: { address: `0x${string}` }) {
  return (
    <FastBridge
      connectedAddress={address}
      prefill={{
        token: "USDC",
        chainId: SUPPORTED_CHAINS.BASE,
      }}
      onStart={() => {
        // track pending state
      }}
      onComplete={() => {
        // show success state
      }}
      onError={(message) => {
        console.error(message);
      }}
    />
  );
}
```

## Live prop contract
- `connectedAddress` (required): connected wallet address.
- `prefill?`:
  - `token`, `chainId`, optional `amount`, optional `recipient`.
- `maxAmount?`: cap bridgeable amount.
- `onStart?`, `onComplete?`, `onError?(message)` callbacks.

## SDK flow details (under the hood)
- Primary execute call:
  - `sdk.bridge({ token, amount, toChainId, recipient, sourceChains }, { onEvent })`
- Pre-execution validation and limits:
  - input validation (token/chain/recipient/amount)
  - `sdk.calculateMaxForBridge(...)` for selected sources
  - source coverage checks before allow/execute
- Hook usage:
  - `intent.current` stores `OnIntentHookData`
  - `allowance.current` stores `OnAllowanceHookData`
  - flow calls `intent.refresh(selectedSources)` before accept
- Event mapping:
  - `NEXUS_EVENTS.STEPS_LIST` seeds progress steps
  - `NEXUS_EVENTS.STEP_COMPLETE` updates step completion and timer start

## Understand source selection behavior
- Widget computes available sources from token breakdown excluding destination chain.
- Widget tracks selected source chains and coverage against required amount.
- Widget blocks accept/execute when source coverage is insufficient.

## E2E verification
- Enter valid amount/recipient and confirm preview appears (intent hook received).
- Toggle sources and confirm max amount and coverage update.
- Accept flow and confirm allowance modal appears only when needed.
- Confirm transaction progresses through steps and returns explorer URL.
- Confirm balances refresh after success.

## Common failure cases
- `Nexus SDK not initialized`:
  - confirm `handleInit(provider)` ran.
- Source coverage errors:
  - increase amount coverage or add more source chains.
- Stuck preview:
  - ensure `allow()` or `deny()` is called from hook-driven UI.
