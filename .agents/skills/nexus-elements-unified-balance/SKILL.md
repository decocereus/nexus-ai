---
name: nexus-elements-unified-balance
description: Integrate the UnifiedBalance element for cross-chain token balance views in React/TypeScript apps. Use when installing or debugging bridgeable/swappable balance aggregation, per-chain breakdown rendering, and formatting powered by Nexus SDK balance APIs.
---

# Nexus Elements - Unified Balance

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/unified-balance`
- Ensure `NexusProvider` is installed and initialized before rendering.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is initialized.
- Ensure provider has fetched bridge and swap balances.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before expecting balance data.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import UnifiedBalance from "@/components/unified-balance/unified-balance";

export function BalancePanel() {
  return <UnifiedBalance className="max-w-lg" />;
}
```

## Live prop contract
- `className?`: class passthrough for container styling.

## SDK flow details (under the hood)
- Data source:
  - `bridgableBalance` from `sdk.getBalancesForBridge()`
  - `swapBalance` from `sdk.getBalancesForSwap()`
- Formatting:
  - `nexusSDK.utils.formatTokenBalance(...)`
- Presentation behavior:
  - if swap balance is unavailable, render bridge breakdown only
  - if swap balance exists, render tabs for bridge vs swap balances

## E2E verification
- Confirm non-zero tokens show chain counts and per-chain rows.
- Confirm total fiat reflects aggregate `balanceInFiat` values.
- Confirm tab switch works when both bridge and swap balances exist.
- Confirm styles from `className` are applied in both render branches.

## Common failure cases
- Empty panel:
  - SDK not initialized or wallet has no supported assets.
- Incorrect formatting:
  - ensure token decimals/symbol values exist in returned balance data.
