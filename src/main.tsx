import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // keep data fresh for 1 minute before refetch
      staleTime: 1000 * 60,
      // refetch in background when window gets focus
      refetchOnWindowFocus: true,
      // don’t show an error/loading state when you re‑open a component
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
