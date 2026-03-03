---
name: nexus-elements-bridge-deposit
description: Integrate the Bridge Deposit element for bridge-plus-execute deposit flows in React/TypeScript apps. Use when installing or debugging source-chain constrained deposits, bridge+execute simulation, intent/allowance approvals, and `sdk.bridgeAndExecute` transaction execution.
---

# Nexus Elements - Bridge Deposit

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/bridge-deposit`
- Ensure `NexusProvider` is installed and initialized before rendering.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is initialized.
- Pass connected address (`address`) and destination chain (`chain`).
- Provide `depositExecute` callback returning execute parameters.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before simulation/execution.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import BridgeDeposit from "@/components/bridge-deposit/deposit";
import { SUPPORTED_CHAINS, TOKEN_METADATA } from "@avail-project/nexus-core";
import { parseUnits } from "viem";

export function BridgeDepositPanel({ address }: { address: `0x${string}` }) {
  return (
    <BridgeDeposit
      address={address}
      chain={SUPPORTED_CHAINS.BASE}
      token="USDC"
      heading="Deposit USDC"
      destinationLabel="Deposit to protocol"
      depositExecute={(token, amount, chainId, userAddress) => {
        const decimals = TOKEN_METADATA[token].decimals;
        const amountWei = parseUnits(amount, decimals);
        const contract = "0x0000000000000000000000000000000000000000" as const;

        return {
          to: contract,
          data: "0x",
          tokenApproval: {
            token,
            amount: amountWei,
            spender: contract,
          },
        };
      }}
    />
  );
}
```

## Live prop contract
- Required:
  - `address`
  - `chain`
  - `depositExecute(token, amount, chainId, userAddress)`
- Optional:
  - `token` (default `USDC`)
  - `chainOptions` (restrict selectable source chains)
  - `heading`, `embed`, `destinationLabel`

## SDK flow details (under the hood)
- Simulation:
  - debounced amount triggers `sdk.simulateBridgeAndExecute(...)`
- Execution:
  - `sdk.bridgeAndExecute({ token, amount, toChainId, sourceChains, execute, waitForReceipt: true }, { onEvent })`
- Hook usage:
  - `intent.current` for preview/allow
  - `allowance.current` for allowance decisions
- Event mapping:
  - `NEXUS_EVENTS.STEPS_LIST` seeds bridge steps
  - `NEXUS_EVENTS.STEP_COMPLETE` marks progress and transaction start

## Source selection behavior
- Widget tracks `inputs.selectedSources` and passes them to simulate/execute.
- Widget blocks simulation/execution if no source chains are selected.
- If you pass `chainOptions`, ensure they match chains that actually hold source liquidity.

## E2E verification
- Enter amount and confirm simulation response appears.
- Toggle source chains and confirm simulation + fee updates.
- Start transaction and verify intent/allowance flows resolve.
- Verify intent and execute explorer URLs on success.
- Verify balance refresh after completion.

## Common failure cases
- No source chains selected:
  - widget will error and block execution.
- Invalid execute builder output:
  - ensure `to`, `data`, and optional `tokenApproval` are correct.
- Simulation fails repeatedly:
  - reduce amount or update selected sources.
