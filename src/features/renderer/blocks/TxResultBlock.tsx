import type { UIBlock } from '@/features/agent/schema'

type TxResult = Extract<UIBlock, { type: 'tx_result' }>

export function TxResultBlock({ block }: { block: TxResult }) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        block.status === 'success'
          ? 'border-emerald-600/30 bg-emerald-950/20 text-emerald-200'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      }`}
    >
      <p>{block.status === 'success' ? 'Transaction succeeded.' : 'Transaction failed.'}</p>
      {block.explorer_urls && block.explorer_urls.length > 0 ? (
        <div className="mt-2 space-y-1">
          {block.explorer_urls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block underline"
            >
              {url}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default TxResultBlock
