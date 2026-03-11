import './polyfills';
import { createRoot } from 'react-dom/client';
import { WalletProvider } from '@miden-sdk/miden-wallet-adapter-react';
import { WalletModalProvider } from '@miden-sdk/miden-wallet-adapter-reactui';
import { MidenWalletAdapter } from '@miden-sdk/miden-wallet-adapter-miden';
import '@miden-sdk/miden-wallet-adapter-reactui/styles.css';
import App from './App';

const wallets = [new MidenWalletAdapter()];

createRoot(document.getElementById('root')!).render(
  <WalletProvider wallets={wallets}>
    <WalletModalProvider>
      <App />
    </WalletModalProvider>
  </WalletProvider>
);
