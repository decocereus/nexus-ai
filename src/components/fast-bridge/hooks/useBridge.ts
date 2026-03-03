import {
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { useCallback, type RefObject } from "react";
import { type Address } from "viem";
import {
  type TransactionFlowExecuteParams,
  type TransactionFlowInputs,
  type TransactionFlowPrefill,
  useTransactionFlow,
} from "../../common";
import { notifyIntentHistoryRefresh } from "../../view-history/history-events";

export type FastBridgeState = TransactionFlowInputs;

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress: Address;
  nexusSDK: NexusSDK | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  prefill?: {
    token: SUPPORTED_TOKENS;
    chainId: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: (explorerUrl?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
  maxAmount?: string | number;
  isSourceMenuOpen?: boolean;
}

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance,
  maxAmount,
  isSourceMenuOpen = false,
}: UseBridgeProps) => {
  const executeTransaction = useCallback(
    async ({
      token,
      amount,
      toChainId,
      recipient,
      sourceChains,
      onEvent,
    }: TransactionFlowExecuteParams) => {
      if (!nexusSDK) return null;
      return nexusSDK.bridge(
        {
          token,
          amount,
          toChainId,
          recipient: recipient ?? connectedAddress,
          sourceChains,
        },
        { onEvent },
      );
    },
    [connectedAddress, nexusSDK],
  );

  const flow = useTransactionFlow({
    type: "bridge",
    network,
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    prefill: prefill as TransactionFlowPrefill | undefined,
    onComplete,
    onStart,
    onError,
    fetchBalance,
    allowance,
    maxAmount,
    isSourceMenuOpen,
    notifyHistoryRefresh: notifyIntentHistoryRefresh,
    executeTransaction,
  });

  return {
    ...flow,
    inputs: flow.inputs as FastBridgeState,
    setInputs: flow.setInputs as (
      next: FastBridgeState | Partial<FastBridgeState>,
    ) => void,
  };
};

export default useBridge;
