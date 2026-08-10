# Miden Wallet Adapter

[![npm version](https://badge.fury.io/js/@miden-sdk%2Fmiden-wallet-adapter.svg)](https://badge.fury.io/js/@miden-sdk%2Fmiden-wallet-adapter)

The **Miden Wallet Adapter** package provides everything you need to integrate the Miden Wallet into your decentralized application (dApp) using React. This package bundles all the core functionality, React integration, UI components, and adapter implementation in a single convenient package.

## Installation

```bash
# npm
npm install @miden-sdk/miden-wallet-adapter

# yarn
yarn add @miden-sdk/miden-wallet-adapter

# pnpm
pnpm add @miden-sdk/miden-wallet-adapter
```

### Peer Dependencies

This package requires React as a peer dependency:

```bash
npm install react react-dom
```

## Quick Start

### 1. Setup Wallet Provider

Wrap your app with the `WalletProvider` and `WalletModalProvider`:

```tsx
import React from 'react';
import {
  WalletProvider,
  WalletModalProvider,
  MidenWalletAdapter,
} from '@miden-sdk/miden-wallet-adapter';

import '@miden-sdk/miden-wallet-adapter/styles.css';

const wallets = [
  new MidenWalletAdapter({ appName: 'Your Miden App' }),
];

function App() {
  return (
    <WalletProvider wallets={wallets}>
      <WalletModalProvider>
        <YourAppComponents />
      </WalletModalProvider>
    </WalletProvider>
  );
}
```
**Note**: Either the stylesheet must be imported or custom styles must be defined

### 2. Add Wallet Connection UI

Use the `WalletMultiButton` for a complete wallet connection experience:

```tsx
import { WalletMultiButton } from '@miden-sdk/miden-wallet-adapter';

function Header() {
  return (
    <header>
      <h1>My Miden dApp</h1>
      <WalletMultiButton />
    </header>
  );
}
```

### 3. Use Wallet in Components

Access wallet state and functionality with the `useWallet` hook:

#### Send Transaction

```tsx
import { useWallet, SendTransaction } from '@miden-sdk/miden-wallet-adapter';

function SendComponent() {
  const { wallet, address, connected, requestSend } = useWallet();

  const handleSend = async () => {
    if (!wallet || !address || !requestSend) return;

    const transaction = new SendTransaction(
      address,
      'recipient_address_here',
      'faucet_id_here',
      'public', // or 'private'
      BigInt(1000) // amount
    );

    try {
      await requestSend(transaction);
      console.log('Transaction sent successfully!');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  if (!connected) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>Connected: {address}</p>
      <button onClick={handleSend}>Send Transaction</button>
    </div>
  );
}
```

#### Custom Transaction

```tsx
import { useWallet, CustomTransaction } from '@miden-sdk/miden-wallet-adapter';

function CustomTransactionComponent() {
  const { wallet, address, requestTransaction } = useWallet();

  const handleCustomTransaction = async () => {
    if (!wallet || !address) return;

    const customTransaction = new CustomTransaction(
      address,
      transactionRequest // TransactionRequest from Miden Web SDK
    );

    await requestTransaction(customTransaction);
  };

  return <button onClick={handleCustomTransaction}>Execute Custom Transaction</button>;
}
```

#### Requesting assets and private notes

```tsx
import { useWallet } from '@miden-sdk/miden-wallet-adapter';

function AssetsAndNotesComponent() {
  const { wallet, address, requestAssets, requestPrivateNotes } = useWallet();

  const getAssetsAndNotes() = async () => {
    if (!wallet || !address) return;

    // { faucetId: string, amount: string }[]
    const assets = await requestAssets();

    // { noteId: string, noteType: NoteType, senderAccountId: string, assets: Asset[] }
    const notes = await requestPrivateNotes();

    return { assets, notes };
  };

  return <button onClick={getAssetsAndNotes}>Get Assets and Notes</button>
}
```

## MidenFiSignerProvider

`MidenFiSignerProvider` is a higher-level alternative to `WalletProvider` that integrates the wallet adapter directly with `MidenProvider` from `@miden-sdk/react`. It automatically creates and manages a Miden signer account using the connected wallet's keys, and exposes it to the `@miden-sdk/react` hooks (`useSigner`, `useMiden`, etc.).

### Basic setup

```tsx
import { MidenFiSignerProvider } from '@miden-sdk/miden-wallet-adapter-react';
import { WalletAdapterNetwork } from '@miden-sdk/miden-wallet-adapter-base';
import { MidenProvider } from '@miden-sdk/react';

function App() {
  return (
    <MidenFiSignerProvider
      appName="My Miden dApp"
      network={WalletAdapterNetwork.Testnet}
    >
      <MidenProvider config={{ rpcUrl: 'testnet' }}>
        <YourApp />
      </MidenProvider>
    </MidenFiSignerProvider>
  );
}
```

### Account type and storage mode

```tsx
<MidenFiSignerProvider
  appName="My Miden dApp"
  accountType="RegularAccountImmutableCode"
  storageMode="public"
>
  ...
</MidenFiSignerProvider>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `accountType` | `SignerAccountType` | `'RegularAccountImmutableCode'` | The type of on-chain signer account to create |
| `storageMode` | `'private' \| 'public' \| 'network'` | `'public'` | Where the account state is stored |

### Custom account components

Pass `customComponents` to attach custom on-chain logic — compiled from `.masp` (Miden Assembly Package) files — to the signer account at creation time.

```tsx
import type { AccountComponent } from '@miden-sdk/miden-sdk';
import { myComponent } from '@myorg/my-masp-package'; // compiled AccountComponent

function App() {
  return (
    <MidenFiSignerProvider
      appName="My Miden dApp"
      accountType="RegularAccountImmutableCode"
      storageMode="public"
      customComponents={[myComponent]}
    >
      <MidenProvider config={{ rpcUrl: 'testnet' }}>
        <YourApp />
      </MidenProvider>
    </MidenFiSignerProvider>
  );
}
```

`customComponents` is only applied during account creation. Changing the prop after the account exists has no effect on the deployed account. If the array is empty or omitted, the account is created with default components only.

### Props reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `appName` | `string` | — | App name passed to the default wallet adapter |
| `wallets` | `Adapter[]` | `[MidenWalletAdapter]` | Wallet adapters to use |
| `network` | `WalletAdapterNetwork` | — | Network to connect to |
| `autoConnect` | `boolean` | `true` | Auto-connect to previously selected wallet on mount |
| `accountType` | `SignerAccountType` | `'RegularAccountImmutableCode'` | Type of signer account to create |
| `storageMode` | `'private' \| 'public' \| 'network'` | `'public'` | Account storage mode |
| `customComponents` | `AccountComponent[]` | — | Custom components from a compiled `.masp` package |
| `onError` | `(error: WalletError) => void` | — | Error handler |
| `localStorageKey` | `string` | — | Key for persisting wallet selection |

### Accessing signer and wallet state

```tsx
import { useMidenFiWallet } from '@miden-sdk/miden-wallet-adapter-react';
import { useMiden, useSigner } from '@miden-sdk/react';

function WalletStatus() {
  const { connected, address, connect, disconnect } = useMidenFiWallet();
  const { isReady, signerAccountId } = useMiden();

  return connected
    ? <button onClick={disconnect}>Disconnect ({address})</button>
    : <button onClick={connect}>Connect Wallet</button>;
}
```

## UI Components

The package includes several pre-built React components:

- **`WalletMultiButton`** - All-in-one button for connect/disconnect/account display
- **`WalletConnectButton`** - Simple connect button
- **`WalletDisconnectButton`** - Simple disconnect button  
- **`WalletModal`** - Modal for wallet selection
- **`WalletModalButton`** - Button that opens the wallet modal

## API Reference

### Core Types

- `WalletAdapter` - Base wallet adapter interface
- `WalletAdapterNetwork` - Network types (Testnet, Localnet)
- `WalletReadyState` - Wallet readiness states
- `TransactionType` - Transaction type enumeration

### Transaction Classes

- `SendTransaction` - For sending assets
- `ConsumeTransaction` - For consuming notes
- `CustomTransaction` - For custom transaction requests

### Error Classes

- `WalletError` - Base wallet error
- `WalletConnectionError` - Connection-related errors
- `WalletSignTransactionError` - Transaction signing errors
- And many more specific error types

## Modular Usage

If you prefer more granular control, you can install individual packages:

```bash
# Core infrastructure only
npm install @miden-sdk/miden-wallet-adapter-base

# React integration
npm install @miden-sdk/miden-wallet-adapter-react

# UI components
npm install @miden-sdk/miden-wallet-adapter-reactui

# Miden wallet adapter
npm install @miden-sdk/miden-wallet-adapter-miden
```

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Generate documentation
yarn doc
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## License

MIT

## Support

- [GitHub Issues](https://github.com/0xMiden/miden-wallet-adapter/issues)
- [Documentation](https://github.com/0xMiden/miden-wallet-adapter) 