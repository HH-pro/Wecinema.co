import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/tailwind.css'

import * as Sentry from "@sentry/react";
import { Replay } from "@sentry/replay"; // Optional, only if using session replay

// Initialize Sentry
Sentry.init({
  dsn: "https://ffba1b70eb56e50557f3a75a5899e7ab@o4509361947148288.ingest.us.sentry.io/4509361953177600", // Replace with your actual DSN
  integrations: [
    Sentry.browserTracingIntegration(), // Updated tracing integration
    new Replay(), // Optional
  ],
  tracesSampleRate: 1.0,
  release: "wecinema@1.0.0"
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
