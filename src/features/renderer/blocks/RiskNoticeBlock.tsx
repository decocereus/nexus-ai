import type { UIBlock } from '@/features/agent/schema'

type RiskNotice = Extract<UIBlock, { type: 'risk_notice' }>

export function RiskNoticeBlock({ block }: { block: RiskNotice }) {
  const className =
    block.level === 'warning'
      ? 'border-amber-600/30 bg-amber-950/20 text-amber-200'
      : 'border-sky-600/30 bg-sky-950/20 text-sky-200'

  return (
    <div className={`rounded-xl border p-4 text-sm ${className}`}>
      {block.text}
    </div>
  )
}

export default RiskNoticeBlock
