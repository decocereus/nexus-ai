import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  NexusSDK,
  type SUPPORTED_CHAINS_IDS,
  type ExactInSwapInput,
  type ExactOutSwapInput,
  NEXUS_EVENTS,
  type SwapStepType,
  type OnSwapIntentHookData,
  type Source as SwapSource,
  type UserAsset,
  parseUnits,
  formatTokenBalance,
} from "@avail-project/nexus-core";
import {
  useTransactionSteps,
  SWAP_EXPECTED_STEPS,
  useNexusError,
  useDebouncedCallback,
  usePolling,
} from "../../common";
import {
  buildSourceOptionKey,
  getIntentMatchedOptionKeys,
  getIntentSourcesSignature,
} from "../utils/source-matching";
import { DESTINATION_SWAP_TOKENS } from "../config/destination";

export type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  balance?: string;
  balanceInFiat?: string;
  chainId?: number;
};

export type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  chainId?: number;
  balance?: string;
  balanceInFiat?: string;
};

export type ExactOutSourceOption = {
  key: string;
  chainId: number;
  chainName: string;
  chainLogo: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenLogo: string;
  balance: string;
  decimals: number;
};

export type TransactionStatus =
  | "idle"
  | "simulating"
  | "swapping"
  | "success"
  | "error";

export type SwapMode = "exactIn" | "exactOut";

export interface SwapInputs {
  fromChainID?: SUPPORTED_CHAINS_IDS;
  fromToken?: SourceTokenInfo;
  fromAmount?: string;
  toChainID?: SUPPORTED_CHAINS_IDS;
  toToken?: DestinationTokenInfo;
  toAmount?: string;
}

export interface SwapPrefill {
  fromChainID: SUPPORTED_CHAINS_IDS;
  toChainID: SUPPORTED_CHAINS_IDS;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  fromAmount?: string;
}

export type SwapState = {
  inputs: SwapInputs;
  swapMode: SwapMode;
  status: TransactionStatus;
  error: string | null;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
};

type Action =
  | { type: "setInputs"; payload: Partial<SwapInputs> }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setError"; payload: string | null }
  | { type: "setSwapMode"; payload: SwapMode }
  | {
      type: "setExplorerUrls";
      payload: Partial<SwapState["explorerUrls"]>;
    }
  | { type: "reset" };

const initialState: SwapState = {
  inputs: {
    fromToken: undefined,
    toToken: undefined,
    fromAmount: undefined,
    toAmount: undefined,
    fromChainID: undefined,
    toChainID: undefined,
  },
  swapMode: "exactIn",
  status: "idle",
  error: null,
  explorerUrls: {
    sourceExplorerUrl: null,
    destinationExplorerUrl: null,
  },
};

function reducer(state: SwapState, action: Action): SwapState {
  switch (action.type) {
    case "setInputs": {
      return {
        ...state,
        inputs: {
          ...state.inputs,
          ...action.payload,
        },
      };
    }
    case "setStatus":
      return { ...state, status: action.payload };
    case "setError":
      return { ...state, error: action.payload };
    case "setSwapMode":
      return { ...state, swapMode: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

interface UseSwapsProps {
  nexusSDK: NexusSDK | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  swapBalance: UserAsset[] | null;
  fetchBalance: () => Promise<void>;
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  prefill?: SwapPrefill;
}

const useSwaps = ({
  nexusSDK,
  swapIntent,
  swapBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  prefill,
}: UseSwapsProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();
  const swapRunIdRef = useRef(0);
  const lastSyncedIntentSourcesSignatureRef = useRef("");
  const lastSyncedIntentSelectionKeyRef = useRef("");
  const prefillAppliedRef = useRef(false);

  const currentIntentSources = swapIntent.current?.intent?.sources ?? [];
  const currentIntentSourcesSignature = useMemo(
    () => getIntentSourcesSignature(currentIntentSources),
    [currentIntentSources],
  );

  const exactOutSourceOptions = useMemo<ExactOutSourceOption[]>(() => {
    const optionsByKey = new Map<string, ExactOutSourceOption>();
    const destinationChainId = state.inputs.toChainID;

    const upsertOption = (option: ExactOutSourceOption) => {
      optionsByKey.set(option.key, option);
    };

    for (const asset of swapBalance ?? []) {
      for (const entry of asset.breakdown ?? []) {
        const balance = entry.balance ?? "0";
        const parsed = Number.parseFloat(balance);
        if (!Number.isFinite(parsed) || parsed <= 0) continue;

        const tokenAddress = entry.contractAddress as `0x${string}`;
        const chainId = entry.chain.id;
        if (
          typeof destinationChainId === "number" &&
          chainId === destinationChainId
        ) {
          continue;
        }
        upsertOption({
          key: buildSourceOptionKey(chainId, tokenAddress),
          chainId,
          chainName: entry.chain.name,
          chainLogo: entry.chain.logo,
          tokenAddress,
          tokenSymbol: asset.symbol,
          tokenLogo: asset.icon ?? "",
          balance,
          decimals: entry.decimals ?? asset.decimals,
        });
      }
    }

    for (const source of currentIntentSources) {
      const chainId = source.chain.id;
      if (
        typeof destinationChainId === "number" &&
        chainId === destinationChainId
      ) {
        continue;
      }
      const tokenAddress = source.token.contractAddress as `0x${string}`;
      const key = buildSourceOptionKey(chainId, tokenAddress);
      if (optionsByKey.has(key)) continue;

      upsertOption({
        key,
        chainId,
        chainName: source.chain.name,
        chainLogo: source.chain.logo,
        tokenAddress,
        tokenSymbol: source.token.symbol,
        tokenLogo: "",
        balance: source.amount ?? "0",
        decimals: source.token.decimals,
      });
    }

    const options = [...optionsByKey.values()];

    options.sort((a, b) => {
      if (a.tokenSymbol === b.tokenSymbol) {
        return a.chainName.localeCompare(b.chainName);
      }
      return a.tokenSymbol.localeCompare(b.tokenSymbol);
    });

    return options;
  }, [
    currentIntentSources,
    currentIntentSourcesSignature,
    state.inputs.toChainID,
    swapBalance,
  ]);

  const exactOutAllSourceKeys = useMemo(
    () => exactOutSourceOptions.map((opt) => opt.key),
    [exactOutSourceOptions],
  );

  const [exactOutSelectedKeys, setExactOutSelectedKeys] = useState<
    string[] | null
  >(null);
  const [appliedExactOutSelectionKey, setAppliedExactOutSelectionKey] =
    useState("ALL");

  const effectiveExactOutSelectedKeys = useMemo(() => {
    const allKeys = exactOutAllSourceKeys;
    if (allKeys.length === 0) return [];

    const selectedKeys = exactOutSelectedKeys ?? allKeys;
    const selectedSet = new Set(selectedKeys);
    const filtered = allKeys.filter((key) => selectedSet.has(key));
    return filtered.length > 0 ? filtered : allKeys;
  }, [exactOutSelectedKeys, exactOutAllSourceKeys]);

  const isExactOutAllSelected = useMemo(() => {
    if (exactOutAllSourceKeys.length === 0) return true;
    return (
      effectiveExactOutSelectedKeys.length === exactOutAllSourceKeys.length
    );
  }, [exactOutAllSourceKeys, effectiveExactOutSelectedKeys]);

  const toggleExactOutSource = useCallback(
    (key: string) => {
      setExactOutSelectedKeys((prev) => {
        const allKeys = exactOutAllSourceKeys;
        if (allKeys.length === 0) return prev;

        const current = prev ?? allKeys;
        const set = new Set(current);
        if (set.has(key)) {
          set.delete(key);
        } else {
          set.add(key);
        }

        const next = allKeys.filter((k) => set.has(k));
        if (next.length === 0) return prev ?? allKeys; // keep at least 1
        if (next.length === allKeys.length) return null; // back to default "all"
        return next;
      });
    },
    [exactOutAllSourceKeys],
  );

  const applyExactOutSelectionKeys = useCallback(
    (keys: string[]) => {
      const allKeys = exactOutAllSourceKeys;
      if (allKeys.length === 0) return;

      const selectedSet = new Set(keys);
      const filtered = allKeys.filter((k) => selectedSet.has(k));
      const unique = [...new Set(filtered)];
      if (unique.length === 0) return;

      const isAllSelected = unique.length === allKeys.length;
      const selectionKey = isAllSelected ? "ALL" : [...unique].sort().join("|");

      setExactOutSelectedKeys(isAllSelected ? null : unique);
      setAppliedExactOutSelectionKey(selectionKey);
    },
    [exactOutAllSourceKeys],
  );

  const exactOutSelectionKey = useMemo(() => {
    if (isExactOutAllSelected) return "ALL";
    return [...effectiveExactOutSelectedKeys].sort().join("|");
  }, [effectiveExactOutSelectedKeys, isExactOutAllSelected]);

  const syncExactOutSelectionFromIntent = useCallback(
    (
      intentSources: NonNullable<OnSwapIntentHookData["intent"]>["sources"],
      force = false,
    ) => {
      if (intentSources.length === 0 || exactOutSourceOptions.length === 0) {
        return false;
      }

      const signature = getIntentSourcesSignature(intentSources);
      const usedKeys = getIntentMatchedOptionKeys(
        intentSources,
        exactOutSourceOptions,
      );
      if (usedKeys.length === 0) return false;
      const usedSelectionKey = [...new Set(usedKeys)].sort().join("|");
      if (
        !force &&
        signature === lastSyncedIntentSourcesSignatureRef.current &&
        usedSelectionKey === lastSyncedIntentSelectionKeyRef.current
      ) {
        return false;
      }

      applyExactOutSelectionKeys(usedKeys);
      lastSyncedIntentSourcesSignatureRef.current = signature;
      lastSyncedIntentSelectionKeyRef.current = usedSelectionKey;
      return true;
    },
    [applyExactOutSelectionKeys, exactOutSourceOptions],
  );

  const exactOutFromSources = useMemo<SwapSource[] | undefined>(() => {
    if (state.swapMode !== "exactOut") return undefined;
    if (exactOutSourceOptions.length === 0) return undefined;

    const selectedSet = new Set(effectiveExactOutSelectedKeys);
    const sources: SwapSource[] = [];
    const seen = new Set<string>();

    for (const opt of exactOutSourceOptions) {
      if (!selectedSet.has(opt.key)) continue;
      if (seen.has(opt.key)) continue;
      seen.add(opt.key);
      sources.push({ chainId: opt.chainId, tokenAddress: opt.tokenAddress });
    }

    return sources.length > 0 ? sources : undefined;
  }, [state.swapMode, effectiveExactOutSelectedKeys, exactOutSourceOptions]);
  const isExactOutSourceSelectionDirty = useMemo(() => {
    return (
      state.swapMode === "exactOut" &&
      exactOutSelectionKey !== appliedExactOutSelectionKey
    );
  }, [state.swapMode, exactOutSelectionKey, appliedExactOutSelectionKey]);

  const [updatingExactOutSources, setUpdatingExactOutSources] = useState(false);

  // Validation for exact-in mode
  const areExactInInputsValid = useMemo(() => {
    return (
      state?.inputs?.fromChainID !== undefined &&
      state?.inputs?.toChainID !== undefined &&
      state?.inputs?.fromToken &&
      state?.inputs?.toToken &&
      state?.inputs?.fromAmount &&
      Number(state.inputs.fromAmount) > 0
    );
  }, [state.inputs]);

  // Validation for exact-out mode
  const areExactOutInputsValid = useMemo(() => {
    return (
      state?.inputs?.toChainID !== undefined &&
      state?.inputs?.toToken &&
      state?.inputs?.toAmount &&
      Number(state.inputs.toAmount) > 0
    );
  }, [state.inputs]);

  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) return;
    const sourceAsset = (swapBalance ?? []).find(
      (asset) =>
        asset.symbol.toUpperCase() === prefill.fromTokenSymbol.toUpperCase(),
    );
    const sourceBreakdown = sourceAsset?.breakdown?.find(
      (entry) => entry.chain.id === prefill.fromChainID,
    );
    const destinationToken =
      DESTINATION_SWAP_TOKENS.get(prefill.toChainID)?.find(
        (token) =>
          token.symbol.toUpperCase() === prefill.toTokenSymbol.toUpperCase(),
      ) ?? null;

    if (!sourceAsset || !sourceBreakdown || !destinationToken) return;

    dispatch({ type: "setSwapMode", payload: "exactIn" });
    dispatch({
      type: "setInputs",
      payload: {
        fromChainID: prefill.fromChainID,
        toChainID: prefill.toChainID,
        fromAmount: prefill.fromAmount,
        fromToken: {
          contractAddress: sourceBreakdown.contractAddress as `0x${string}`,
          decimals: sourceBreakdown.decimals ?? sourceAsset.decimals,
          logo: sourceAsset.icon ?? "",
          name: sourceAsset.name,
          symbol: sourceAsset.symbol,
          chainId: sourceBreakdown.chain.id,
        },
        toToken: {
          tokenAddress: destinationToken.tokenAddress,
          decimals: destinationToken.decimals,
          logo: destinationToken.logo,
          name: destinationToken.name,
          symbol: destinationToken.symbol,
          chainId: prefill.toChainID,
        },
      },
    });
    prefillAppliedRef.current = true;
  }, [prefill, swapBalance]);

  // Combined validation based on current mode
  const areInputsValid = useMemo(() => {
    return state.swapMode === "exactIn"
      ? areExactInInputsValid
      : areExactOutInputsValid;
  }, [state.swapMode, areExactInInputsValid, areExactOutInputsValid]);

  const handleNexusError = useNexusError();

  // Event handler shared between exact-in and exact-out
  const handleSwapEvent = (event: { name: string; args: SwapStepType }) => {
    if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
      const step = event.args;
      if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
        dispatch({
          type: "setExplorerUrls",
          payload: { sourceExplorerUrl: step.explorerURL },
        });
      }
      if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
        dispatch({
          type: "setExplorerUrls",
          payload: { destinationExplorerUrl: step.explorerURL },
        });
      }
      onStepComplete(step);
    }
  };

  const handleExactInSwap = async (runId: number) => {
    const fromToken = state.inputs.fromToken;
    const toToken = state.inputs.toToken;
    const fromAmount = state.inputs.fromAmount;
    const toChainID = state.inputs.toChainID;
    const fromChainID = state.inputs.fromChainID;

    if (
      !nexusSDK ||
      !areExactInInputsValid ||
      !fromToken ||
      !toToken ||
      !fromAmount ||
      !toChainID ||
      !fromChainID
    )
      return;

    const sourceBalance = swapBalance
      ?.find((token) => token.symbol === fromToken.symbol)
      ?.breakdown?.find((chain) => chain.chain?.id === fromChainID);
    if (
      !sourceBalance ||
      Number.parseFloat(sourceBalance.balance ?? "0") <= 0
    ) {
      throw new Error(
        "No balance found for this wallet on supported source chains.",
      );
    }

    const amountBigInt = parseUnits(
      fromAmount,
      fromToken.decimals,
    );
    const swapInput: ExactInSwapInput = {
      from: [
        {
          chainId: fromChainID,
          amount: amountBigInt,
          tokenAddress: fromToken.contractAddress,
        },
      ],
      toChainId: toChainID,
      toTokenAddress: toToken.tokenAddress,
    };

    const result = await nexusSDK.swapWithExactIn(swapInput, {
      onEvent: (event) => {
        if (swapRunIdRef.current !== runId) return;
        handleSwapEvent(event as { name: string; args: SwapStepType });
      },
    });

    if (!result?.success) {
      throw new Error(result?.error || "Swap failed");
    }
  };

  const handleExactOutSwap = async (runId: number) => {
    const toToken = state.inputs.toToken;
    const toAmount = state.inputs.toAmount;
    const toChainID = state.inputs.toChainID;

    if (
      !nexusSDK ||
      !areExactOutInputsValid ||
      !toToken ||
      !toAmount ||
      !toChainID
    )
      return;
    if (swapBalance && exactOutSourceOptions.length === 0) {
      throw new Error(
        "No balance found for this wallet on supported source chains.",
      );
    }
    if (!exactOutFromSources || exactOutFromSources.length === 0) {
      throw new Error("Select at least one source with available balance.");
    }

    const amountBigInt = parseUnits(
      toAmount,
      toToken.decimals,
    );
    const swapInput: ExactOutSwapInput = {
      toAmount: amountBigInt,
      toChainId: toChainID,
      toTokenAddress: toToken.tokenAddress,
      ...(exactOutFromSources ? { fromSources: exactOutFromSources } : {}),
    };

    const result = await nexusSDK.swapWithExactOut(swapInput, {
      onEvent: (event) => {
        if (swapRunIdRef.current !== runId) return;
        handleSwapEvent(event as { name: string; args: SwapStepType });
      },
    });
    if (!result?.success) {
      throw new Error(result?.error || "Swap failed");
    }
  };

  const runSwap = async (runId: number) => {
    if (!nexusSDK || !areInputsValid || !swapBalance) return;

    try {
      onStart?.();
      dispatch({ type: "setStatus", payload: "simulating" });
      dispatch({ type: "setError", payload: null });
      seed(SWAP_EXPECTED_STEPS);

      if (state.swapMode === "exactOut") {
        setAppliedExactOutSelectionKey(exactOutSelectionKey);
      } else {
        setAppliedExactOutSelectionKey("ALL");
      }

      if (state.swapMode === "exactIn") {
        await handleExactInSwap(runId);
      } else {
        await handleExactOutSwap(runId);
      }

      if (swapRunIdRef.current !== runId) return;
      dispatch({ type: "setStatus", payload: "success" });
      onComplete?.(swapIntent.current?.intent?.destination?.amount);
      await fetchBalance();
    } catch (error) {
      if (swapRunIdRef.current !== runId) return;
      const { message } = handleNexusError(error);
      dispatch({ type: "setStatus", payload: "error" });
      dispatch({ type: "setError", payload: message });
      onError?.(message);
      swapIntent.current?.deny();
      swapIntent.current = null;
      setExactOutSelectedKeys(null);
      setAppliedExactOutSelectionKey("ALL");
      setUpdatingExactOutSources(false);
      lastSyncedIntentSourcesSignatureRef.current = "";
      lastSyncedIntentSelectionKeyRef.current = "";
      void fetchBalance();
    }
  };

  const startSwap = () => {
    swapRunIdRef.current += 1;
    const runId = swapRunIdRef.current;
    void runSwap(runId);
    return runId;
  };

  const debouncedSwapStart = useDebouncedCallback(startSwap, 1200);

  const reset = () => {
    // invalidate any in-flight swap run
    swapRunIdRef.current += 1;
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current?.deny();
    swapIntent.current = null;
    setExactOutSelectedKeys(null);
    setAppliedExactOutSelectionKey("ALL");
    setUpdatingExactOutSources(false);
    lastSyncedIntentSourcesSignatureRef.current = "";
    lastSyncedIntentSelectionKeyRef.current = "";
  };

  useEffect(() => {
    if (state.swapMode !== "exactOut") return;
    if (state.status !== "simulating") return;
    if (exactOutSourceOptions.length === 0) return;

    const runId = swapRunIdRef.current;
    let cancelled = false;

    void (async () => {
      const start = Date.now();
      while (!cancelled && Date.now() - start < 10000) {
        if (swapRunIdRef.current !== runId) return;

        const intentSources = swapIntent.current?.intent?.sources ?? [];
        if (intentSources.length > 0) {
          syncExactOutSelectionFromIntent(intentSources);
          return;
        }

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentIntentSourcesSignature,
    exactOutSourceOptions,
    state.status,
    state.swapMode,
    syncExactOutSelectionFromIntent,
    swapIntent,
  ]);

  const availableBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.fromToken ||
      !state.inputs?.fromChainID
    )
      return undefined;
    return (
      swapBalance
        ?.find((token) => token.symbol === state.inputs?.fromToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state.inputs?.fromChainID,
        ) ?? undefined
    );
  }, [
    state.inputs?.fromToken,
    state.inputs?.fromChainID,
    swapBalance,
    nexusSDK,
  ]);

  const destinationBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.toToken ||
      !state.inputs?.toChainID
    )
      return undefined;
    return (
      swapBalance
        ?.find((token) => token.symbol === state?.inputs?.toToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state?.inputs?.toChainID,
        ) ?? undefined
    );
  }, [state?.inputs?.toToken, state?.inputs?.toChainID, swapBalance, nexusSDK]);

  const availableStables = useMemo(() => {
    if (!nexusSDK || !swapBalance) return [];
    const filteredToken = swapBalance?.filter((token) => {
      if (["USDT", "USDC", "ETH", "DAI", "WBTC"].includes(token.symbol)) {
        return token;
      }
    });
    return filteredToken ?? [];
  }, [swapBalance, nexusSDK]);

  const formatBalance = (
    balance?: string | number,
    symbol?: string,
    decimals?: number,
  ) => {
    if (!balance || !symbol || !decimals) return undefined;
    return formatTokenBalance(balance, {
      symbol: symbol,
      decimals: decimals,
    });
  };

  useEffect(() => {
    if (!swapBalance) {
      fetchBalance();
    }
  }, [swapBalance]);

  useEffect(() => {
    // Check validity based on current swap mode
    const isValidForCurrentMode =
      state.swapMode === "exactIn"
        ? areExactInInputsValid &&
          state?.inputs?.fromAmount &&
          state?.inputs?.fromChainID &&
          state?.inputs?.fromToken &&
          state?.inputs?.toChainID &&
          state?.inputs?.toToken
        : areExactOutInputsValid &&
          state?.inputs?.toAmount &&
          state?.inputs?.toChainID &&
          state?.inputs?.toToken;

    if (!isValidForCurrentMode) {
      swapIntent.current?.deny();
      swapIntent.current = null;
      lastSyncedIntentSourcesSignatureRef.current = "";
      lastSyncedIntentSelectionKeyRef.current = "";
      return;
    }
    if (state.status === "idle") {
      debouncedSwapStart();
    }
  }, [
    state.inputs,
    state.swapMode,
    areExactInInputsValid,
    areExactOutInputsValid,
    state.status,
  ]);

  const refreshSimulation = async () => {
    try {
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
      }
    } catch (e) {
      console.error(e);
    }
  };

  usePolling(
    state.status === "simulating" && Boolean(swapIntent.current),
    async () => {
      await refreshSimulation();
    },
    15000,
  );

  const continueSwap = useCallback(async () => {
    if (state.status !== "simulating") return;

    if (state.swapMode !== "exactOut" || !isExactOutSourceSelectionDirty) {
      dispatch({ type: "setStatus", payload: "swapping" });
      swapIntent.current?.allow();
      return;
    }

    if (!nexusSDK || !areInputsValid) return;

    setUpdatingExactOutSources(true);
    try {
      const previousIntent = swapIntent.current;
      swapRunIdRef.current += 1;
      const runId = swapRunIdRef.current;

      previousIntent?.deny();

      void runSwap(runId);
      const start = Date.now();
      while (Date.now() - start < 10000) {
        if (swapRunIdRef.current !== runId) return;
        const nextIntent = swapIntent.current;
        const sourcesReady =
          nextIntent &&
          nextIntent !== previousIntent &&
          (nextIntent.intent.sources?.length ?? 0) > 0;
        if (sourcesReady) break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (swapRunIdRef.current !== runId) return;
      const nextIntent = swapIntent.current;
      if (!nextIntent || nextIntent === previousIntent) return;
      if ((nextIntent.intent.sources?.length ?? 0) === 0) return;
      syncExactOutSelectionFromIntent(nextIntent.intent.sources, true);
      // Updated sources are now reflected in the intent. Wait for explicit user
      // confirmation before proceeding.
      return;
    } finally {
      setUpdatingExactOutSources(false);
    }
  }, [
    areInputsValid,
    isExactOutSourceSelectionDirty,
    nexusSDK,
    runSwap,
    syncExactOutSelectionFromIntent,
    state.status,
    state.swapMode,
    swapIntent,
  ]);

  return {
    status: state.status,
    inputs: state.inputs,
    swapMode: state.swapMode,
    setSwapMode: (mode: SwapMode) =>
      dispatch({ type: "setSwapMode", payload: mode }),
    setStatus: (status: TransactionStatus) =>
      dispatch({ type: "setStatus", payload: status }),
    setInputs: (inputs: Partial<SwapInputs>) => {
      if (state.status === "error") {
        dispatch({ type: "setError", payload: null });
        dispatch({ type: "setStatus", payload: "idle" });
      }
      dispatch({ type: "setInputs", payload: inputs });
    },
    txError: state.error,
    setTxError: (error: string | null) =>
      dispatch({ type: "setError", payload: error }),
    availableBalance,
    availableStables,
    destinationBalance,
    formatBalance,
    steps,
    explorerUrls: state.explorerUrls,
    handleSwap: startSwap,
    continueSwap,
    exactOutSourceOptions,
    exactOutSelectedKeys: effectiveExactOutSelectedKeys,
    toggleExactOutSource,
    isExactOutSourceSelectionDirty,
    updatingExactOutSources,
    reset,
    areInputsValid,
  };
};

export default useSwaps;
