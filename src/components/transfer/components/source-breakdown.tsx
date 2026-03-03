import {
  formatTokenBalance,
  type ReadableIntent,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from '@avail-project/nexus-core'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion'
import { Skeleton } from '../../ui/skeleton'
import { useMemo } from 'react'
import { useNexus } from '../../../providers/NexusProvider'
import { Checkbox } from '../../ui/checkbox'
import { cn } from '@/lib/utils'

type SourceCoverageState = 'healthy' | 'warning' | 'error'

interface SourceBreakdownProps {
  intent?: ReadableIntent
  tokenSymbol: SUPPORTED_TOKENS
  isLoading?: boolean
  requiredAmount?: string
  availableSources: UserAsset['breakdown']
  selectedSourceChains: number[]
  onToggleSourceChain: (chainId: number) => void
  onSourceMenuOpenChange?: (open: boolean) => void
  isSourceSelectionInsufficient?: boolean
  sourceCoverageState?: SourceCoverageState
  sourceCoveragePercent?: number
  missingToProceed?: string
  missingToSafety?: string
  selectedTotal?: string
  requiredTotal?: string
  requiredSafetyTotal?: string
}

const SourceBreakdown = ({
  intent,
  tokenSymbol,
  isLoading = false,
  requiredAmount,
  availableSources,
  selectedSourceChains,
  onToggleSourceChain,
  onSourceMenuOpenChange,
  isSourceSelectionInsufficient = false,
  sourceCoverageState = 'healthy',
  sourceCoveragePercent = 100,
  missingToProceed,
  selectedTotal,
  requiredTotal,
  requiredSafetyTotal,
}: SourceBreakdownProps) => {
  const { nexusSDK } = useNexus()
  const normalizedCoverage = Math.max(0, Math.min(100, sourceCoveragePercent))
  const progressRadius = 16
  const progressCircumference = 2 * Math.PI * progressRadius
  const progressOffset =
    progressCircumference - (normalizedCoverage / 100) * progressCircumference
  const showCoverageFeedback = Boolean(
    selectedTotal && requiredTotal && requiredSafetyTotal,
  )
  const shouldShowProceedMessage =
    sourceCoverageState === 'error' &&
    Number.parseFloat(missingToProceed ?? '0') > 0

  const coverageToneClass =
    sourceCoverageState === 'error'
      ? 'text-rose-500'
      : sourceCoverageState === 'warning'
        ? 'text-amber-500'
        : 'text-emerald-500'

  const coverageSurfaceClass =
    sourceCoverageState === 'error'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200'
      : sourceCoverageState === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'

  const spendOnSources = useMemo(() => {
    if (!intent || (intent?.sources?.length ?? 0) < 2)
      return `1 asset on 1 chain`
    return `${intent?.sources?.length} Assets on ${intent?.sources?.length} chains`
  }, [intent])

  const amountSpend = useMemo(() => {
    const base = Number(requiredAmount ?? '0')
    if (!intent) return base
    const fees = Number.parseFloat(intent?.fees?.total ?? '0')
    return base + fees
  }, [requiredAmount, intent])

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      onValueChange={(value) => onSourceMenuOpenChange?.(value === 'sources')}
    >
      <AccordionItem value="sources">
        <div className="flex items-start justify-between gap-x-4 w-full">
          {isLoading ? (
            <>
              <div className="flex flex-col items-start gap-y-1 min-w-fit">
                <p className="text-base font-light">You Spend</p>
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex flex-col items-end gap-y-1 min-w-fit">
                <Skeleton className="h-5 w-24" />
                <div className="w-fit">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </>
          ) : (
            intent && (
              <>
                <div className="flex flex-col items-start gap-y-1 min-w-fit">
                  <p className="text-base font-light">You Spend</p>
                  <p className="text-sm font-light">{spendOnSources}</p>
                </div>

                <div className="flex flex-col items-end gap-y-1 min-w-fit">
                  <p className="text-base font-light">
                    {formatTokenBalance(amountSpend, {
                      symbol: tokenSymbol,
                      decimals: intent?.token?.decimals,
                    })}
                  </p>

                  <AccordionTrigger
                    containerClassName="w-fit"
                    className="py-0 items-center gap-x-1"
                    hideChevron={false}
                  >
                    <p className="text-sm font-medium">View Sources</p>
                  </AccordionTrigger>
                </div>
              </>
            )
          )}
        </div>
        {!isLoading && (
          <AccordionContent className="my-4 bg-muted pb-0 px-4 py-2 rounded-lg w-full">
            {showCoverageFeedback && (
              <div
                className={cn(
                  'mb-3 rounded-md border px-3 py-2 text-sm',
                  coverageSurfaceClass,
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0">
                    <svg
                      className="-rotate-90 size-10"
                      viewBox="0 0 40 40"
                      aria-hidden="true"
                    >
                      <circle
                        cx="20"
                        cy="20"
                        r={progressRadius}
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted-foreground/30"
                        fill="none"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r={progressRadius}
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={coverageToneClass}
                        fill="none"
                        strokeDasharray={progressCircumference}
                        strokeDashoffset={progressOffset}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                      {Math.round(normalizedCoverage)}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-y-0.5">
                    <p className="font-medium">
                      Available on selected chains:{' '}
                      <span className="font-semibold">
                        {selectedTotal} {tokenSymbol}
                      </span>
                    </p>
                    <p className="font-medium">
                      Required for this transaction:{' '}
                      <span className="font-semibold">
                        {requiredSafetyTotal} {tokenSymbol}
                      </span>
                    </p>
                    {shouldShowProceedMessage && (
                      <p>
                        Need{' '}
                        <span className="font-semibold">
                          {missingToProceed} {tokenSymbol}
                        </span>{' '}
                        more on selected chains to continue.
                      </p>
                    )}
                    {!isSourceSelectionInsufficient &&
                      sourceCoverageState === 'healthy' && (
                        <p>
                          You&apos;re all set. We&apos;ll only use what&apos;s
                          needed from these selected chains.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {availableSources.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No source balances available for this token.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-y-3">
                {availableSources.map((source) => {
                  const chainId = source.chain.id
                  const isSelected = selectedSourceChains.includes(chainId)
                  const isLastSelected = isSelected
                    ? selectedSourceChains.length === 1
                    : false

                  const willUseFromIntent = intent?.sources?.find(
                    (s) => s.chainID === chainId,
                  )?.amount

                  return (
                    <div
                      key={chainId}
                      className={cn(
                        'flex items-center justify-between w-full gap-x-2 select-none',
                        isLastSelected
                          ? 'opacity-80 cursor-not-allowed'
                          : 'cursor-pointer',
                      )}
                      onClick={() => {
                        if (isLastSelected) return
                        onToggleSourceChain(chainId)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (isLastSelected) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onToggleSourceChain(chainId)
                        }
                      }}
                    >
                      <div className="flex items-center gap-x-2">
                        <Checkbox
                          checked={isSelected}
                          disabled={isLastSelected}
                          onCheckedChange={() => {
                            if (isLastSelected) return
                            onToggleSourceChain(chainId)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${source.chain.name} as a source`}
                        />
                        <img
                          src={source.chain.logo}
                          alt={source.chain.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <p className="text-sm font-light">
                          {source.chain.name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-y-0.5 min-w-fit">
                        <p className="text-sm font-light">
                          {formatTokenBalance(source.balance, {
                            symbol: tokenSymbol,
                            decimals: source.decimals,
                          })}
                        </p>
                        {willUseFromIntent && (
                          <p className="text-xs text-muted-foreground">
                            Estimated to use:{' '}
                            {formatTokenBalance(willUseFromIntent, {
                              symbol: tokenSymbol,
                              decimals: intent?.token?.decimals,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {availableSources.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Keep at least 1 chain selected.</p>
              </div>
            )}
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  )
}

export default SourceBreakdown
