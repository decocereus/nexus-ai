import {
  ClientOnly,
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Suspense, lazy } from 'react'

import appCss from '../styles.css?url'

const Web3Provider = lazy(() => import('@/providers/Web3Provider'))

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const appShellFallback = (
    <div className="min-h-screen bg-background text-foreground" />
  )

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientOnly fallback={appShellFallback}>
          <Suspense fallback={appShellFallback}>
            <Web3Provider>{children}</Web3Provider>
          </Suspense>
        </ClientOnly>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
