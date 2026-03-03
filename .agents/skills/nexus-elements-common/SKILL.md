---
name: nexus-elements-common
description: Use shared Nexus Elements hooks, transaction-step helpers, and constants to build custom Nexus UX. Use when extending widgets or implementing custom bridge/transfer/swap/deposit flows that need debouncing, polling, step orchestration, or Nexus error normalization.
---

# Nexus Elements - Common

## Understand scope
- `common` is not a standalone widget.
- Use it to build custom flows on top of a working `NexusProvider` + SDK initialization path.

## Set up foundation first
- Install and wire `nexus-provider` before using `common` hooks.
- Ensure `useNexus().nexusSDK` is initialized before calling SDK-dependent helpers.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before invoking SDK-backed flow helpers.
- Re-run init after reconnect if wallet session resets.

## Install source files
- `common` is bundled via other widget installs.
- If needed manually, copy from:
  - `registry/nexus-elements/common/*`

## Use core exports
```ts
import {
  usePolling,
  useStopwatch,
  useDebouncedValue,
  useDebouncedCallback,
  useTransactionSteps,
  useNexusError,
  SHORT_CHAIN_NAME,
  SWAP_EXPECTED_STEPS,
  WidgetErrorBoundary,
} from "@/components/common";
```

## Build custom flow state machines
- Use `useTransactionSteps` to seed expected steps and mark completions from SDK events.
- Use `usePolling` for intent/simulation refresh loops.
- Use `useDebouncedValue`/`useDebouncedCallback` before simulation calls.
- Use `useNexusError` to normalize SDK exceptions into user-facing messages.

## SDK events this package is designed around
- Bridge/transfer/bridge-deposit flows:
  - `NEXUS_EVENTS.STEPS_LIST`
  - `NEXUS_EVENTS.STEP_COMPLETE`
- Swap/deposit flows:
  - `NEXUS_EVENTS.SWAP_STEP_COMPLETE`

## E2E checklist for custom components
- Ensure wallet connects and SDK initializes.
- Seed steps before starting execution.
- Attach event handlers and map them into step state.
- Clear intent/allowance/swapIntent refs on cancel/error.
- Refresh balances after success.
- Reset timers and step state on completion/cancel.
