import type { UIBlock } from '@/features/agent/schema'

type IntentSummary = Extract<UIBlock, { type: 'intent_summary' }>

export function IntentSummaryBlock({ block }: { block: IntentSummary }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-sm font-semibold text-zinc-100">{block.title}</p>
      <div className="mt-2 space-y-1 text-sm text-zinc-300">
        {block.lines.map((line, index) => (
          <p key={`${block.title}-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  )
}

export default IntentSummaryBlock
