---
name: nexus-elements-overview
description: End-to-end integration guide for Nexus Elements in any TypeScript/React codebase. Use when setting up Nexus Elements from scratch, choosing which widget to install, wiring NexusProvider + wallet initialization, or validating bridge/transfer/swap/deposit/history behavior in production-like flows.
---

# Nexus Elements Overview

## Integrate end-to-end in any TS/React app
- Install project deps:
  - `pnpm add @avail-project/nexus-core wagmi viem lucide-react`
- If using wagmi (recommended), also install:
  - `pnpm add @tanstack/react-query`
- Ensure shadcn/ui is initialized (`components.json` exists) if installing from registry.

## Configure registry
- Add this mapping in `components.json`:
```json
"registries": {
  "@nexus-elements/": "https://elements.nexus.availproject.org/r/{name}.json"
}
```

## Set up SDK + wallet foundation first
- Install and wire `nexus-provider` before any other element:
  - `npx shadcn@latest add @nexus-elements/nexus-provider`
- Wrap your app with `NexusProvider`.
- On wallet connect, resolve an EIP-1193 provider and call `handleInit(provider)`.
- Pass `config={{ network: "mainnet" | "testnet", debug?: boolean }}` to `NexusProvider` when needed.

### Minimal provider wrapper
```tsx
"use client";

import NexusProvider from "@/components/nexus/NexusProvider";

export function AppNexusProvider({ children }: { children: React.ReactNode }) {
  return <NexusProvider config={{ network: "mainnet" }}>{children}</NexusProvider>;
}
```

### Initialize SDK on connect
```tsx
"use client";

import { useEffect } from "react";
import { useAccount, useConnectorClient } from "wagmi";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useNexus } from "@/components/nexus/NexusProvider";

export function InitNexusOnConnect() {
  const { status, connector } = useAccount();
  const { data: walletClient } = useConnectorClient();
  const { handleInit } = useNexus();

  useEffect(() => {
    if (status !== "connected") return;

    void (async () => {
      const mobileProvider = walletClient
        ? ({ request: (args: unknown) => walletClient.request(args as never) } as EthereumProvider)
        : undefined;
      const desktopProvider = await connector?.getProvider();
      const provider = mobileProvider ?? (desktopProvider as EthereumProvider | undefined);
      if (!provider || typeof provider.request !== "function") return;
      await handleInit(provider);
    })();
  }, [status, connector, walletClient, handleInit]);

  return null;
}
```

## Install widgets
- Install all widgets:
  - `npx shadcn@latest add @nexus-elements/all`
- Or install individually:
  - `@nexus-elements/fast-bridge`
  - `@nexus-elements/transfer`
  - `@nexus-elements/swaps`
  - `@nexus-elements/deposit`
  - `@nexus-elements/bridge-deposit`
  - `@nexus-elements/unified-balance`
  - `@nexus-elements/view-history`

## SDK function map by widget
- `FastBridge`:
  - `sdk.bridge`
  - `sdk.calculateMaxForBridge`
  - hooks: `setOnIntentHook`, `setOnAllowanceHook`
  - events: `NEXUS_EVENTS.STEPS_LIST`, `NEXUS_EVENTS.STEP_COMPLETE`
- `FastTransfer`:
  - `sdk.bridgeAndTransfer`
  - `sdk.calculateMaxForBridge`
  - hooks: `setOnIntentHook`, `setOnAllowanceHook`
  - events: `NEXUS_EVENTS.STEPS_LIST`, `NEXUS_EVENTS.STEP_COMPLETE`
- `SwapWidget`:
  - `sdk.swapWithExactIn`, `sdk.swapWithExactOut`
  - hook: `setOnSwapIntentHook`
  - event: `NEXUS_EVENTS.SWAP_STEP_COMPLETE`
- `Deposit`:
  - `sdk.swapAndExecute`
  - hook: `setOnSwapIntentHook`
  - event: `NEXUS_EVENTS.SWAP_STEP_COMPLETE`
- `BridgeDeposit`:
  - `sdk.simulateBridgeAndExecute`
  - `sdk.bridgeAndExecute`
  - hooks: `setOnIntentHook`, `setOnAllowanceHook`
  - events: `NEXUS_EVENTS.STEPS_LIST`, `NEXUS_EVENTS.STEP_COMPLETE`
- `UnifiedBalance`:
  - `sdk.getBalancesForBridge`, `sdk.getBalancesForSwap`
- `ViewHistory`:
  - `sdk.getMyIntents`

## Pick the right widget
- Use `fast-bridge` for self-bridge UX (recipient defaults to connected address).
- Use `transfer` for bridge-to-recipient UX.
- Use `swaps` for exact-in and exact-out cross-chain swaps.
- Use `deposit` for swap + execute integrations where destination token/chain is fixed by product config.
- Use `bridge-deposit` for bridge + execute integrations with lighter UI and manual execute builder.
- Use `unified-balance` to show cross-chain balances.
- Use `view-history` for intent history.

## E2E readiness checklist
- Confirm wallet connects and `handleInit` runs once per session.
- Confirm `useNexus().nexusSDK` is non-null after connect.
- Confirm balances load (`bridgableBalance`, `swapBalance`).
- Confirm intent hooks are populated during preview states.
- Confirm every flow can reach success and emits explorer URLs.
- Confirm disconnect clears SDK state (`deinitializeNexus`).

## Common integration failures
- Invalid provider object:
  - Ensure provider has `request()`.
- Widget stuck in preview:
  - Ensure hook handlers eventually call `allow()` or `deny()`.
- Empty balances/history:
  - Ensure SDK init finished and wallet is connected on a supported network.
