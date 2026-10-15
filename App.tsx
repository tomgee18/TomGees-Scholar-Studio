import React from 'react';
import { Layout } from './components/Layout';
import { ContextStoreProvider } from './context/ContextStore';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ContextStoreProvider>
          <Layout />
        </ContextStoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
