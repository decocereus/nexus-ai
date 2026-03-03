import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

const ChatCanvasPage = lazy(() => import('@/features/chat/ChatCanvasPage'))

export const Route = createFileRoute('/')({ component: App })

function App() {
  const fallback = <div className="min-h-screen bg-black" />

  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <ChatCanvasPage />
      </Suspense>
    </ClientOnly>
  )
}
