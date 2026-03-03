import type { UIBlock } from '@/features/agent/schema'

type ErrorBlockType = Extract<UIBlock, { type: 'error' }>

export function ErrorBlock({ block }: { block: ErrorBlockType }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <p>{block.message}</p>
      {block.code ? <p className="mt-1 text-xs opacity-80">Code: {block.code}</p> : null}
    </div>
  )
}

export default ErrorBlock
