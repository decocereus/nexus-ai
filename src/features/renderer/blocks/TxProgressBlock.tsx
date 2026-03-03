import type { UIBlock } from '@/features/agent/schema'

type TxProgress = Extract<UIBlock, { type: 'tx_progress' }>

export function TxProgressBlock({ block }: { block: TxProgress }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-sm font-medium text-zinc-200">Transaction progress</p>
      <div className="mt-2 space-y-1 text-sm text-zinc-400">
        {block.step_labels.map((stepLabel, index) => (
          <p key={`${stepLabel}-${index}`}>{`${index + 1}. ${stepLabel}`}</p>
        ))}
      </div>
    </div>
  )
}

export default TxProgressBlock
