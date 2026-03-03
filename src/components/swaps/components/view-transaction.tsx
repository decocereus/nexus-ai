import React, { FC, type RefObject, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../../ui/dialog";
import {
  NexusSDK,
  type SwapStepType,
  type OnSwapIntentHookData,
  formatTokenBalance,
} from "@avail-project/nexus-core";
import { MoveDown, XIcon } from "lucide-react";
import { TokenIcon } from "./token-icon";
import { StackedTokenIcons } from "./stacked-token-icons";
import { type GenericStep, usdFormatter } from "../../common";
import { TOKEN_IMAGES } from "../config/destination";
import { Button } from "../../ui/button";
import {
  type ExactOutSourceOption,
  type SwapMode,
  type TransactionStatus,
} from "../hooks/useSwaps";
import { getIntentMatchedOptionKeys } from "../utils/source-matching";
import TransactionProgress from "./transaction-progress";
import { Separator } from "../../ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Checkbox } from "../../ui/checkbox";
import { cn } from "@/lib/utils";

interface ViewTransactionProps {
  steps: GenericStep<SwapStepType>[];
  status: TransactionStatus;
  swapMode: SwapMode;
  nexusSDK: NexusSDK | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  getFiatValue: (amount: number, token: string) => number;
  continueSwap: () => void | Promise<void>;
  exactOutSourceOptions: ExactOutSourceOption[];
  exactOutSelectedKeys: string[];
  toggleExactOutSource: (key: string) => void;
  isExactOutSourceSelectionDirty: boolean;
  updatingExactOutSources: boolean;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
  reset: () => void;
  txError: string | null;
}

interface TokenBreakdownProps
  extends Omit<
    ViewTransactionProps,
    | "swapIntent"
    | "continueSwap"
    | "status"
    | "explorerUrls"
    | "steps"
    | "reset"
    | "txError"
    | "swapMode"
    | "exactOutSourceOptions"
    | "exactOutSelectedKeys"
    | "toggleExactOutSource"
    | "isExactOutSourceSelectionDirty"
    | "updatingExactOutSources"
  > {
  tokenLogo: string;
  chainLogo: string;
  symbol: string;
  amount: number;
  decimals: number;
}

const TokenBreakdown = ({
  nexusSDK,
  getFiatValue,
  tokenLogo,
  chainLogo,
  symbol,
  amount,
  decimals,
}: TokenBreakdownProps) => {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col items-start gap-y-1">
        <p className="text-xl font-medium ">
          {formatTokenBalance(amount, {
            symbol: symbol,
            decimals: decimals,
          })}
        </p>
        <p className="text-base text-muted-foreground font-medium ">
          {usdFormatter.format(getFiatValue(amount, symbol))}
        </p>
      </div>
      <TokenIcon
        symbol={symbol}
        chainLogo={chainLogo}
        tokenLogo={tokenLogo}
        size="lg"
      />
    </div>
  );
};

interface MultiSourceBreakdownProps {
  getFiatValue: (amount: number, token: string) => number;
  sources: NonNullable<OnSwapIntentHookData["intent"]>["sources"];
}

const MultiSourceBreakdown = ({
  getFiatValue,
  sources,
}: MultiSourceBreakdownProps) => {
  // Calculate summed USD value across all sources
  const totalUsdValue = useMemo(() => {
    return sources.reduce((sum, source) => {
      const amount = Number.parseFloat(source.amount);
      const fiatValue = getFiatValue(amount, source.token.symbol);
      return sum + fiatValue;
    }, 0);
  }, [sources, getFiatValue]);

  // Prepare sources for stacked icons
  const stackedSources = useMemo(() => {
    return sources.map((source) => ({
      tokenLogo: TOKEN_IMAGES[source.token.symbol] ?? "",
      chainLogo: source.chain.logo,
      symbol: source.token.symbol,
    }));
  }, [sources]);

  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col items-start gap-y-1">
        <p className="text-xl font-medium">
          {sources.length} source{sources.length > 1 ? "s" : ""}
        </p>
        <p className="text-base text-muted-foreground font-medium">
          {usdFormatter.format(totalUsdValue)}
        </p>
      </div>
      <StackedTokenIcons sources={stackedSources} size="lg" maxDisplay={4} />
    </div>
  );
};

const ViewTransaction: FC<ViewTransactionProps> = ({
  steps,
  status,
  swapMode,
  nexusSDK,
  swapIntent,
  getFiatValue,
  continueSwap,
  exactOutSourceOptions,
  exactOutSelectedKeys,
  toggleExactOutSource,
  isExactOutSourceSelectionDirty,
  updatingExactOutSources,
  explorerUrls,
  reset,
  txError,
}) => {
  const transactionIntent = swapIntent.current?.intent;
  const sources = transactionIntent?.sources ?? [];
  const hasSources = sources.length > 0;
  const hasMultipleSources = sources.length > 1;
  const usedSourceKeys = useMemo(
    () => getIntentMatchedOptionKeys(sources, exactOutSourceOptions),
    [sources, exactOutSourceOptions],
  );
  const usedSourceKeySet = useMemo(
    () => new Set(usedSourceKeys),
    [usedSourceKeys],
  );
  const { usedSourceOptions, otherSourceOptions } = useMemo(() => {
    const usedOrder = new Map(
      usedSourceKeys.map((key, index) => [key, index] as const),
    );
    const used: ExactOutSourceOption[] = [];
    const other: ExactOutSourceOption[] = [];
    for (const opt of exactOutSourceOptions) {
      if (usedSourceKeySet.has(opt.key)) {
        used.push(opt);
      } else {
        other.push(opt);
      }
    }
    used.sort((a, b) => {
      const aOrder = usedOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = usedOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
    return { usedSourceOptions: used, otherSourceOptions: other };
  }, [exactOutSourceOptions, usedSourceKeySet, usedSourceKeys]);

  // Prepare source info for TransactionProgress
  const sourceInfo = useMemo(() => {
    if (!hasSources || sources.length === 0) {
      return {
        symbol: "Multiple assets",
        logos: { token: "", chain: "" },
      };
    }
    if (hasMultipleSources) {
      return {
        symbol: `${sources.length} sources`,
        logos: {
          token: TOKEN_IMAGES[sources[0].token.symbol] ?? "",
          chain: sources[0].chain.logo,
        },
      };
    }
    return {
      symbol: sources[0].token.symbol,
      logos: {
        token: TOKEN_IMAGES[sources[0].token.symbol] ?? "",
        chain: sources[0].chain.logo,
      },
    };
  }, [sources, hasSources, hasMultipleSources]);

  const shouldShowExactOutSourceSelection =
    status === "simulating" && swapMode === "exactOut";

  const exactOutSelectedTotalUsd = useMemo(() => {
    if (!shouldShowExactOutSourceSelection) return 0;
    if (!exactOutSourceOptions.length || !exactOutSelectedKeys.length) return 0;

    const selectedSet = new Set(exactOutSelectedKeys);
    return exactOutSourceOptions.reduce((sum, opt) => {
      if (!selectedSet.has(opt.key)) return sum;
      const balance = Number.parseFloat(opt.balance);
      if (!Number.isFinite(balance) || balance <= 0) return sum;
      const fiatValue = getFiatValue(balance, opt.tokenSymbol);
      if (!Number.isFinite(fiatValue) || fiatValue <= 0) return sum;
      return sum + fiatValue;
    }, 0);
  }, [
    shouldShowExactOutSourceSelection,
    exactOutSourceOptions,
    exactOutSelectedKeys,
    getFiatValue,
  ]);

  const exactOutRequiredUsd = useMemo(() => {
    if (!shouldShowExactOutSourceSelection) return 0;
    const amount = Number.parseFloat(
      transactionIntent?.destination?.amount ?? "0",
    );
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const symbol = transactionIntent?.destination?.token?.symbol;
    if (!symbol) return 0;
    const base = getFiatValue(amount, symbol);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return base;
  }, [shouldShowExactOutSourceSelection, transactionIntent, getFiatValue]);

  const isExactOutSourceSelectionInsufficient = useMemo(() => {
    if (!shouldShowExactOutSourceSelection) return false;
    if (exactOutRequiredUsd <= 0) return false;
    return exactOutSelectedTotalUsd < exactOutRequiredUsd;
  }, [
    shouldShowExactOutSourceSelection,
    exactOutRequiredUsd,
    exactOutSelectedTotalUsd,
  ]);

  const continueLabel = !hasSources
    ? "Waiting for sources..."
    : updatingExactOutSources
      ? "Updating sources..."
      : shouldShowExactOutSourceSelection && isExactOutSourceSelectionDirty
        ? "Update sources"
        : "Continue";

  if (!transactionIntent) return null;

  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={(open) => {
        if (!open) {
          reset();
        }
      }}
    >
      <DialogContent className="max-w-md!" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between w-full">
          <p className="text-sm font-medium text-muted-foreground">
            You&apos;re Swapping
          </p>
          <DialogClose>
            <XIcon className="size-5 text-muted-foreground" />
          </DialogClose>
        </DialogHeader>
        <div className="flex flex-col items-start w-full gap-y-4">
          {/* Source section - handle empty, single, and multiple sources */}
          {!hasSources ? (
            <div className="flex items-center w-full justify-between">
              <p className="text-base text-muted-foreground">
                Calculating sources...
              </p>
            </div>
          ) : hasMultipleSources ? (
            <MultiSourceBreakdown
              getFiatValue={getFiatValue}
              sources={sources}
            />
          ) : (
            <TokenBreakdown
              nexusSDK={nexusSDK}
              getFiatValue={getFiatValue}
              tokenLogo={TOKEN_IMAGES[sources[0].token.symbol] ?? ""}
              chainLogo={sources[0].chain.logo}
              symbol={sources[0].token.symbol}
              amount={Number.parseFloat(sources[0].amount)}
              decimals={sources[0].token.decimals}
            />
          )}
          <MoveDown className="size-5 -ml-1.5 text-muted-foreground" />
          <TokenBreakdown
            nexusSDK={nexusSDK}
            getFiatValue={getFiatValue}
            tokenLogo={
              TOKEN_IMAGES[transactionIntent?.destination?.token.symbol]
            }
            chainLogo={transactionIntent?.destination?.chain.logo}
            symbol={transactionIntent?.destination?.token.symbol}
            amount={Number.parseFloat(transactionIntent?.destination?.amount)}
            decimals={transactionIntent?.destination?.token.decimals}
          />
        </div>
        {status === "error" && (
          <p className="text-destructive text-sm">{txError}</p>
        )}
        {shouldShowExactOutSourceSelection &&
          exactOutSourceOptions.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="source-selection">
                <AccordionTrigger hideChevron={false} className="py-0">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-sm font-medium">Choose sources</p>
                    <p className="text-xs text-muted-foreground">
                      {exactOutSelectedKeys.length} selected
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="mt-3 bg-muted pb-0 px-4 py-3 rounded-lg w-full">
                  {isExactOutSourceSelectionInsufficient && (
                    <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-200">
                      Insufficient selected sources balance. Selected{" "}
                      <span className="font-medium">
                        {usdFormatter.format(exactOutSelectedTotalUsd)}
                      </span>
                      , need at least{" "}
                      <span className="font-medium">
                        {usdFormatter.format(exactOutRequiredUsd)}
                      </span>{" "}
                      (required for {transactionIntent?.destination?.amount}{" "}
                      {transactionIntent?.destination?.token.symbol}).
                    </div>
                  )}
                  <p className="mb-3 text-xs text-muted-foreground">
                    {updatingExactOutSources
                      ? "Updating sources…"
                      : isExactOutSourceSelectionDirty
                        ? "Changes apply when you press Update sources."
                        : "Press Continue to proceed with these sources."}
                  </p>
                  <div className="flex max-h-56 flex-col gap-y-3 overflow-auto pr-1">
                    {usedSourceOptions.map((opt) => {
                      const isSelected = exactOutSelectedKeys.includes(opt.key);
                      const isLastSelected =
                        isSelected && exactOutSelectedKeys.length === 1;
                      const isUsed = usedSourceKeySet.has(opt.key);
                      const tokenLogo =
                        opt.tokenLogo || TOKEN_IMAGES[opt.tokenSymbol] || "";
                      const formattedBalance =
                        formatTokenBalance(opt.balance, {
                          symbol: opt.tokenSymbol,
                          decimals: opt.decimals,
                        }) ?? `${opt.balance} ${opt.tokenSymbol}`;

                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            "flex w-full select-none items-center justify-between gap-x-3",
                            isLastSelected || updatingExactOutSources
                              ? "opacity-80 cursor-not-allowed"
                              : "cursor-pointer",
                          )}
                          onClick={() => {
                            if (isLastSelected || updatingExactOutSources) {
                              return;
                            }
                            toggleExactOutSource(opt.key);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (isLastSelected || updatingExactOutSources) {
                              return;
                            }
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExactOutSource(opt.key);
                            }
                          }}
                        >
                          <div className="flex items-center gap-x-2">
                            <Checkbox
                              checked={isSelected}
                              disabled={
                                isLastSelected || updatingExactOutSources
                              }
                              onCheckedChange={() => {
                                if (isLastSelected || updatingExactOutSources) {
                                  return;
                                }
                                toggleExactOutSource(opt.key);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${opt.tokenSymbol} on ${opt.chainName} as a source`}
                            />
                            <TokenIcon
                              symbol={opt.tokenSymbol}
                              tokenLogo={tokenLogo}
                              chainLogo={opt.chainLogo}
                              size="sm"
                            />
                            <div className="flex flex-col leading-tight">
                              <p className="text-sm font-medium">
                                {opt.tokenSymbol}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {opt.chainName}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end leading-tight min-w-fit">
                            <p className="text-sm font-medium">
                              {formattedBalance}
                            </p>
                            {isUsed && (
                              <p className="text-xs text-muted-foreground">
                                Currently used
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {otherSourceOptions.length > 0 &&
                      usedSourceOptions.length > 0 && (
                        <Separator className="opacity-40" />
                      )}
                    {otherSourceOptions.map((opt) => {
                      const isSelected = exactOutSelectedKeys.includes(opt.key);
                      const isLastSelected =
                        isSelected && exactOutSelectedKeys.length === 1;
                      const isUsed = usedSourceKeySet.has(opt.key);
                      const tokenLogo =
                        opt.tokenLogo || TOKEN_IMAGES[opt.tokenSymbol] || "";
                      const formattedBalance =
                        formatTokenBalance(opt.balance, {
                          symbol: opt.tokenSymbol,
                          decimals: opt.decimals,
                        }) ?? `${opt.balance} ${opt.tokenSymbol}`;

                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            "flex w-full select-none items-center justify-between gap-x-3",
                            isLastSelected || updatingExactOutSources
                              ? "opacity-80 cursor-not-allowed"
                              : "cursor-pointer",
                          )}
                          onClick={() => {
                            if (isLastSelected || updatingExactOutSources) {
                              return;
                            }
                            toggleExactOutSource(opt.key);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (isLastSelected || updatingExactOutSources) {
                              return;
                            }
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExactOutSource(opt.key);
                            }
                          }}
                        >
                          <div className="flex items-center gap-x-2">
                            <Checkbox
                              checked={isSelected}
                              disabled={
                                isLastSelected || updatingExactOutSources
                              }
                              onCheckedChange={() => {
                                if (isLastSelected || updatingExactOutSources) {
                                  return;
                                }
                                toggleExactOutSource(opt.key);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${opt.tokenSymbol} on ${opt.chainName} as a source`}
                            />
                            <TokenIcon
                              symbol={opt.tokenSymbol}
                              tokenLogo={tokenLogo}
                              chainLogo={opt.chainLogo}
                              size="sm"
                            />
                            <div className="flex flex-col leading-tight">
                              <p className="text-sm font-medium">
                                {opt.tokenSymbol}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {opt.chainName}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end leading-tight min-w-fit">
                            <p className="text-sm font-medium">
                              {formattedBalance}
                            </p>
                            {isUsed && (
                              <p className="text-xs text-muted-foreground">
                                Currently used
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Select at least 1 source.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        {status === "simulating" && (
          <Button
            onClick={() => void continueSwap()}
            disabled={
              !hasSources ||
              updatingExactOutSources ||
              (shouldShowExactOutSourceSelection &&
                isExactOutSourceSelectionInsufficient)
            }
          >
            {continueLabel}
          </Button>
        )}

        {(status === "swapping" || status === "success") && (
          <>
            <Separator className="transition-opacity" />
            <TransactionProgress
              steps={steps}
              explorerUrls={explorerUrls}
              sourceSymbol={sourceInfo.symbol}
              destinationSymbol={transactionIntent.destination.token.symbol}
              sourceLogos={sourceInfo.logos}
              destinationLogos={{
                token: TOKEN_IMAGES[transactionIntent.destination.token.symbol],
                chain: transactionIntent.destination.chain.logo,
              }}
              hasMultipleSources={hasMultipleSources}
              sources={
                hasMultipleSources
                  ? sources.map((s) => ({
                      tokenLogo: TOKEN_IMAGES[s.token.symbol] ?? "",
                      chainLogo: s.chain.logo,
                      symbol: s.token.symbol,
                    }))
                  : undefined
              }
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewTransaction;
