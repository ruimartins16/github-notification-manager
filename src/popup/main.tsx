import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import App from './App.tsx'
import '../index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - background worker handles periodic fetching
      gcTime: 5 * 60 * 1000, // 5 minutes - cache persists 5min after last use
      refetchOnWindowFocus: true, // Refresh when user focuses popup
      refetchOnReconnect: true, // Refresh after network reconnect
      retry: 3, // Retry failed requests 3 times
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
