import type { UIBlock } from '@/features/agent/schema'
import { Badge } from '@/components/ui/badge'

type MissingInfo = Extract<UIBlock, { type: 'missing_info' }>

export function MissingInfoBlock({ block }: { block: MissingInfo }) {
  return (
    <div className="rounded-xl border border-amber-600/30 bg-amber-950/20 p-4">
      <p className="text-sm text-amber-200">{block.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {block.fields.map((field) => (
          <Badge
            key={field}
            variant="outline"
            className="border-amber-500/40 text-amber-200"
          >
            {field}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export default MissingInfoBlock
