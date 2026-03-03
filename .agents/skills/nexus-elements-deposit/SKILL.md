---
name: nexus-elements-deposit
description: Integrate the Deposit element for swap-plus-execute deposit flows in React/TypeScript apps. Use when installing or debugging destination-fixed deposits, execute call builders, swap-intent confirmation UX, and `sdk.swapAndExecute` progress from quote to completion.
---

# Nexus Elements - Deposit

## Install
- Install widget:
  - `npx shadcn@latest add @nexus-elements/deposit`
- Ensure `NexusProvider` is installed and initialized before rendering.

## Required setup before rendering
- Ensure `useNexus().nexusSDK` is initialized.
- Ensure `exchangeRate` contains destination token rate (widget requires it for amount simulation).
- Provide a correct `destination` config and `executeDeposit` builder.

## Initialize SDK (required once per app)
- On wallet connect, resolve an EIP-1193 provider and call `useNexus().handleInit(provider)`.
- Wait for `useNexus().nexusSDK` before allowing amount confirmation.
- Re-run init after reconnect if wallet session resets.

## Render widget
```tsx
"use client";

import NexusDeposit from "@/components/deposit/nexus-deposit";
import {
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { encodeFunctionData, type Abi } from "viem";

export function DepositPanel() {
  return (
    <NexusDeposit
      heading="Deposit USDC"
      destination={{
        chainId: SUPPORTED_CHAINS.BASE,
        tokenAddress: TOKEN_CONTRACT_ADDRESSES["USDC"][SUPPORTED_CHAINS.BASE],
        tokenSymbol: "USDC",
        tokenDecimals: TOKEN_METADATA["USDC"].decimals,
        tokenLogo: TOKEN_METADATA["USDC"].icon,
        label: "Deposit to protocol",
        gasTokenSymbol: CHAIN_METADATA[SUPPORTED_CHAINS.BASE].nativeCurrency.symbol,
        explorerUrl: CHAIN_METADATA[SUPPORTED_CHAINS.BASE].blockExplorerUrls[0],
        estimatedTime: "~30s",
      }}
      executeDeposit={(tokenSymbol, tokenAddress, amount, _chainId, user) => {
        const contract = "0x0000000000000000000000000000000000000000" as const;
        const abi: Abi = [
          {
            type: "function",
            name: "deposit",
            stateMutability: "nonpayable",
            inputs: [
              { name: "asset", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "beneficiary", type: "address" },
            ],
            outputs: [],
          },
        ];

        const data = encodeFunctionData({
          abi,
          functionName: "deposit",
          args: [tokenAddress, amount, user],
        });

        return {
          to: contract,
          data,
          tokenApproval: {
            token: tokenAddress,
            amount,
            spender: contract,
          },
        };
      }}
      onSuccess={() => {
        // success
      }}
      onError={(message) => {
        console.error(message);
      }}
    />
  );
}
```

## Live prop contract
- Required:
  - `destination: DestinationConfig`
  - `executeDeposit(tokenSymbol, tokenAddress, amount, chainId, user)`
- Optional:
  - `heading`, `embed`, `className`
  - `open`, `onOpenChange`, `defaultOpen` (dialog mode)
  - `onSuccess`, `onError`, `onClose`

## SDK flow details (under the hood)
- Main execute call:
  - `sdk.swapAndExecute({ toChainId, toTokenAddress, toAmount, fromSources?, execute }, { onEvent })`
- Step and status behavior:
  - amount step starts simulation-loading
  - waits for `swapIntent` hook to enter previewing state
  - confirm order calls `activeIntent.allow()` and moves to executing
- Event mapping:
  - listens to `NEXUS_EVENTS.SWAP_STEP_COMPLETE`
  - handles `DETERMINING_SWAP` and `SWAP_SKIPPED`
- Fee handling:
  - destination execute receipt computes actual gas USD in success path

## Important amount semantics
- Amount input is interpreted as USD in this widget flow.
- Widget converts USD amount to destination token amount via provider exchange rates.
- If destination token exchange rate is missing/invalid, widget shows error and blocks confirmation.

## E2E verification
- Enter amount and continue to confirmation.
- Confirm simulation appears and updates every polling cycle.
- Confirm order and verify status screen transitions.
- Verify both source and destination explorer links when available.
- Verify `onSuccess` and balance refresh after completion.
- Verify error screen appears on failed simulation/execution.

## Common failure cases
- `Nexus SDK is not initialized`:
  - ensure `handleInit(provider)` ran after wallet connect.
- `Unable to fetch pricing for <token>`:
  - ensure rates loaded in provider and token symbol is valid.
- Execute revert:
  - validate `executeDeposit` target, calldata, and token approval spender.
