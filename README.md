## Overview

The **Miden Wallet Adapter** is a modular TypeScript library that provides wallet integration capabilities for Miden blockchain applications. It's designed to connect Miden-compatible wallets to decentralized applications (dApps) in a standardized way.

## Usage Pattern

1. **Setup**: Wrap your app with `WalletProvider` and specify available wallet adapters
2. **Connection**: Use `WalletMultiButton` to connect or do so programmatically (see [Notes](#notes))
3. **Interaction**: Use the `useWallet` hook to access wallet state and methods, such as the wallet's address
4. **Transactions**: Use [transaction types](https://github.com/0xMiden/miden-wallet-adapter/blob/main/packages/core/base/transaction.ts) to submit a consume or send transaction via the wallet, or a generic transaction using a Miden `TransactionRequest` object

### Connecting a wallet
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
  const { wallet, address, connected } = useWallet();

  const handleSend = async () => {
    if (!wallet || !address) return;

    const transaction = new SendTransaction(
      address,
      'recipient_address_here',
      'faucet_id_here',
      'public', // or 'private'
      BigInt(1000) // amount
    );

    try {
      await (wallet.adapter as MidenWalletAdapter).requestSend(transaction);
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

  const getAssetsAndNotes = async () => {
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

### Notes

* When using the provided React Components (WalletMultiButton, WalletModal, etc.), the code must either import the `styles.css` stylesheet provided or specify custom styles

```
require('@miden-sdk/miden-wallet-adapter/styles.css');

// or

import '@miden-sdk/miden-wallet-adapter/styles.css';
```

## MidenFiSignerProvider

`MidenFiSignerProvider` is a higher-level React provider that bridges the wallet adapter with `MidenProvider` from `@miden-sdk/react`. It handles signer account creation and management automatically using the connected wallet's keys.

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

Use `accountType` and `storageMode` to control how the signer account is created on-chain:

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

The `customComponents` prop attaches custom logic to the signer account. Components are compiled from `.masp` (Miden Assembly Package) files and passed as `AccountComponent` objects from `@miden-sdk/miden-sdk`.

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

`customComponents` is applied when the signer account is first created. If the array is empty or not provided, the account is created with default components only. Components are stable across re-renders — only create new `AccountComponent` instances when the desired account logic changes.

### Accessing signer state

Use the `useMidenFiWallet` hook inside the provider to read wallet and signer state:

```tsx
import { useMidenFiWallet } from '@miden-sdk/miden-wallet-adapter-react';

function WalletStatus() {
  const { connected, address, connect, disconnect } = useMidenFiWallet();

  return connected
    ? <button onClick={disconnect}>Disconnect ({address})</button>
    : <button onClick={connect}>Connect Wallet</button>;
}
```

## Architecture & Structure

### **Main Package**: `@miden-sdk/miden-wallet-adapter`

For consumers looking to integrate their React app with the Miden Wallet, the `@miden-sdk/miden-wallet-adapter` package contains all necessary components
- **Purpose**: Provides all components necessary to integrate with the Miden Wallet in a React context
- **Key Components**:
  - **Wallet detection and connection**: Detects and handles connections to Miden Wallet
  - **Persistence and state management**: Automatic wallet reconnects across sessions
  - **React Context Providers and UI Components**: Provides useful hooks, context providers, and components to make UI integration simple

For other use cases, including different front-end libraries and other wallets in the Miden ecosystem, this repository also exposes composable and extensible packages that can be used as building blocks:

### 1. **Core Base Package** (`@miden-sdk/miden-wallet-adapter-base`)
- **Purpose**: Provides the foundational infrastructure and interfaces
- **Key Components**:
  - **`BaseWalletAdapter`**: Abstract base class that all wallet adapters must extend
  - **`WalletAdapter` interface**: Defines the contract for wallet adapters
  - **Event system**: Uses `EventEmitter3` for wallet state changes (connect, disconnect, error, readyStateChange)
  - **Type definitions**: Network types (`Testnet`, `Localnet`), decrypt permissions, transaction types
  - **Error handling**: Comprehensive error classes for different failure scenarios

### 2. **React Integration Package** (`@miden-sdk/miden-wallet-adapter-react`)
- **Purpose**: React-specific hooks and context providers
- **Key Components**:
  - **`WalletProvider`**: React context provider that manages wallet state
  - **`useWallet` hook**: Provides wallet state and methods to React components
  - **Auto-connection**: Handles automatic wallet reconnection on page load
  - **Local storage**: Persists wallet selection across sessions

### 3. **UI Components Package** (`@miden-sdk/miden-wallet-adapter-reactui`)
- **Purpose**: Pre-built React UI components for wallet interaction
- **Key Components**:
  - **`WalletModal`**: Modal dialog for wallet selection and connection
  - **`WalletConnectButton`**: Button component for initiating wallet connection
  - **`WalletMultiButton`**: Multi-purpose button that handles connect/disconnect states
  - **`WalletListItem`**: Individual wallet option in the selection modal

## Wallet Adapters

### Miden Wallet Adapter (`@miden-sdk/miden-wallet-adapter-miden`)
- **Purpose**: Specific implementation for the Miden Wallet
- **Features**:
  - **Detection**: Automatically detects if Miden Wallet is installed
  - **Connection management**: Handles wallet connection/disconnection
  - **Transaction support**: Supports Miden-specific transaction types:
    - `MidenSendTransaction`
    - `MidenConsumeTransaction`
    - Generic `MidenTransaction`
  - **Permission management**: Handles permissions for private accounts
  - **Error handling**: Comprehensive error handling for wallet operations