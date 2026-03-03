import {
  type NexusSDK,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { type Address } from "viem";

export type TransactionFlowType = "bridge" | "transfer";

export interface TransactionFlowInputs {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

export interface TransactionFlowPrefill {
  token: string;
  chainId: number;
  amount?: string;
  recipient?: Address;
}

type BridgeOptions = NonNullable<Parameters<NexusSDK["bridge"]>[1]>;

export type TransactionFlowEvent =
  NonNullable<BridgeOptions["onEvent"]> extends (event: infer E) => void
    ? E
    : never;

export type TransactionFlowOnEvent = NonNullable<BridgeOptions["onEvent"]>;

export interface TransactionFlowExecuteParams {
  token: SUPPORTED_TOKENS;
  amount: bigint;
  toChainId: SUPPORTED_CHAINS_IDS;
  recipient: `0x${string}`;
  sourceChains?: number[];
  onEvent: TransactionFlowOnEvent;
}

export type TransactionFlowExecutor = (
  params: TransactionFlowExecuteParams,
) => Promise<{ explorerUrl: string } | null>;

export type SourceCoverageState = "healthy" | "warning" | "error";

export interface SourceSelectionValidation {
  coverageState: SourceCoverageState;
  isBelowRequired: boolean;
  missingToProceed: string;
  missingToSafety: string;
}
