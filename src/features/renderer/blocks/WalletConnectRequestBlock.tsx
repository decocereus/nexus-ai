import type { UIBlock } from '@/features/agent/schema'
import { Button } from '@/components/ui/button'

type WalletConnectRequest = Extract<UIBlock, { type: 'wallet_connect_request' }>

interface WalletConnectRequestBlockProps {
  block: WalletConnectRequest
  disabled?: boolean
  onConnectConfirm?: () => void
}

export function WalletConnectRequestBlock({
  block,
  disabled = false,
  onConnectConfirm,
}: WalletConnectRequestBlockProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-sm text-zinc-300">{block.reason}</p>
      <Button
        className="mt-3"
        onClick={onConnectConfirm}
        disabled={disabled || !onConnectConfirm}
      >
        Connect wallet
      </Button>
    </div>
  )
}

export default WalletConnectRequestBlock
