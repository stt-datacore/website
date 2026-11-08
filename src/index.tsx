import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/semantic.slate.css';
import './styles/custom.css';
import './styles/theming.js';

const queryClient = new QueryClient();

// Keep open tabs in sync; localStorage below only covers newly opened tabs.
broadcastQueryClient({ queryClient, broadcastChannel: 'stt_query_cache' });

// Only queries that opt in with `meta: { persist: true }` survive a reload.
const persistOptions = {
  persister: createAsyncStoragePersister({ storage: localStorage, key: 'stt_query_cache' }),
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.meta?.persist === true && defaultShouldDehydrateQuery(query)
  }
} satisfies React.ComponentProps<typeof PersistQueryClientProvider>['persistOptions'];

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
