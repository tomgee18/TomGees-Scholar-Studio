
import React from 'react';
import { Layout } from './components/Layout';
import { ContextStoreProvider } from './context/ContextStore';
import { ToastProvider } from './context/ToastContext';

const App = () => {
  return (
    <ToastProvider>
      <ContextStoreProvider>
          <Layout />
      </ContextStoreProvider>
    </ToastProvider>
  );
};

export default App;
