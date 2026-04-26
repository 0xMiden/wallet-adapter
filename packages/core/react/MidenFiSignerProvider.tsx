import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
  type FC,
  type ReactNode,
} from 'react';
import {
  SignerContext,
  type SignerContextValue,
  type IngestStateCallback,
} from '@miden-sdk/react';
import {
  type Adapter,
  AllowedPrivateData,
  type MessageSignerWalletAdapterProps,
  type MidenTransaction,
  PrivateDataPermission,
  SignKind,
  WalletAdapterNetwork,
  WalletError,
  type WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletNotSelectedError,
  WalletReadyState,
  type MidenSendTransaction,
  type MidenConsumeTransaction,
  type Asset,
  type CreateAccountParams,
  type InputNoteDetails,
  type TransactionOutput,
} from '@miden-sdk/miden-wallet-adapter-base';
import type { NoteFilterTypes, AccountComponent } from '@miden-sdk/miden-sdk';
import { MidenWalletAdapter } from '@miden-sdk/miden-wallet-adapter-miden';
import { useLocalStorage } from './useLocalStorage';

// TYPES
// ================================================================================================

export interface Wallet {
  adapter: Adapter;
  readyState: WalletReadyState;
}

export interface WalletContextState {
  autoConnect: boolean;
  wallets: Wallet[];
  wallet: Wallet | null;
  address: string | null;
  publicKey: Uint8Array | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;

  select(walletName: WalletName): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  requestTransaction?: MessageSignerWalletAdapterProps['requestTransaction'];
  requestAssets?: MessageSignerWalletAdapterProps['requestAssets'];
  requestPrivateNotes?: MessageSignerWalletAdapterProps['requestPrivateNotes'];
  signBytes?: MessageSignerWalletAdapterProps['signBytes'];
  importPrivateNote?: MessageSignerWalletAdapterProps['importPrivateNote'];
  requestConsumableNotes?: MessageSignerWalletAdapterProps['requestConsumableNotes'];
  waitForTransaction?: MessageSignerWalletAdapterProps['waitForTransaction'];
  requestSend?: MessageSignerWalletAdapterProps['requestSend'];
  requestConsume?: MessageSignerWalletAdapterProps['requestConsume'];
  createAccount?: MessageSignerWalletAdapterProps['createAccount'];
}

const WalletContext = createContext<WalletContextState>({} as WalletContextState);

// MIDENFI SIGNER PROVIDER
// ================================================================================================

export type SignerAccountType =
  | 'RegularAccountImmutableCode'
  | 'RegularAccountUpdatableCode'
  | 'FungibleFaucet'
  | 'NonFungibleFaucet';

export interface MidenFiSignerProviderProps {
  children: ReactNode;
  /** Wallet adapters to use. Defaults to [MidenWalletAdapter] */
  wallets?: Adapter[];
  /** App name passed to the default MidenWalletAdapter */
  appName?: string;
  /** Network to connect to */
  network?: WalletAdapterNetwork;
  /** Auto-connect to previously selected wallet on mount. Defaults to false */
  autoConnect?: boolean;
  /** Private data permission level */
  privateDataPermission?: PrivateDataPermission;
  /** Allowed private data types */
  allowedPrivateData?: AllowedPrivateData;
  /** Error handler */
  onError?: (error: WalletError) => void;
  /** LocalStorage key for persisting wallet selection */
  localStorageKey?: string;
  /** Account type for the signer account. Defaults to 'RegularAccountImmutableCode' */
  accountType?: SignerAccountType;
  /** Storage mode for the signer account ('private' | 'public' | 'network'). Defaults to 'public' */
  storageMode?: 'private' | 'public' | 'network';
  /** Custom account components to include in the account (e.g. from a compiled .masp package) */
  customComponents?: AccountComponent[];
  /** Existing account ID to import instead of creating a new account */
  importAccountId?: string;
}

const initialState: {
  wallet: Wallet | null;
  adapter: Adapter | null;
  address: string | null;
  publicKey: Uint8Array | null;
  connected: boolean;
} = {
  wallet: null,
  adapter: null,
  address: null,
  publicKey: null,
  connected: false,
};

/**
 * MidenFiSignerProvider bridges the MidenFi wallet with MidenProvider.
 *
 * This is a unified provider that handles both wallet connection and signer context.
 *
 * @example
 * ```tsx
 * // Simplest usage - uses MidenWalletAdapter by default
 * <MidenFiSignerProvider>
 *   <MidenProvider config={{ rpcUrl: "testnet" }}>
 *     <App />
 *   </MidenProvider>
 * </MidenFiSignerProvider>
 *
 * // With custom options
 * <MidenFiSignerProvider
 *   appName="My DApp"
 *   network={WalletAdapterNetwork.Testnet}
 *   autoConnect={true}
 * >
 *   <MidenProvider config={{ rpcUrl: "testnet" }}>
 *     <App />
 *   </MidenProvider>
 * </MidenFiSignerProvider>
 *
 * // With custom wallets
 * <MidenFiSignerProvider wallets={[new CustomWalletAdapter()]}>
 *   <MidenProvider config={{ rpcUrl: "testnet" }}>
 *     <App />
 *   </MidenProvider>
 * </MidenFiSignerProvider>
 * ```
 *
 * For wallet operations, use the useMidenFiWallet hook:
 *
 * @example
 * ```tsx
 * const { connected, connect, disconnect, select, wallets } = useMidenFiWallet();
 *
 * // If multiple wallets, select one first
 * select(wallets[0].adapter.name);
 *
 * // Then connect
 * await connect();
 * ```
 */
export const MidenFiSignerProvider: FC<MidenFiSignerProviderProps> = ({
  children,
  wallets: walletsProp,
  appName = 'Miden DApp',
  network = WalletAdapterNetwork.Testnet,
  autoConnect = false,
  privateDataPermission = PrivateDataPermission.UponRequest,
  allowedPrivateData = AllowedPrivateData.None,
  onError,
  localStorageKey = 'walletName',
  accountType = 'RegularAccountImmutableCode',
  storageMode = 'public',
  customComponents,
  importAccountId,
}) => {
  // Create default wallets if not provided
  const adapters = useMemo(
    () => walletsProp ?? [new MidenWalletAdapter({ appName })],
    [walletsProp, appName]
  );

  const [name, setName] = useLocalStorage<WalletName | null>(
    localStorageKey,
    null
  );
  const [{ wallet, adapter, address, publicKey, connected }, setState] =
    useState(initialState);
  const readyState = adapter?.readyState || WalletReadyState.Unsupported;
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnecting = useRef(false);
  const isDisconnecting = useRef(false);
  const isUnloading = useRef(false);

  // Wrap adapters to conform to the `Wallet` interface
  const [wallets, setWallets] = useState(() =>
    adapters.map((adapter) => ({
      adapter,
      readyState: adapter.readyState,
    }))
  );

  // When the adapters change, start to listen for changes to their `readyState`
  useEffect(() => {
    setWallets((wallets) =>
      adapters.map((adapter, index) => {
        const wallet = wallets[index];
        return wallet &&
          wallet.adapter === adapter &&
          wallet.readyState === adapter.readyState
          ? wallet
          : {
              adapter: adapter,
              readyState: adapter.readyState,
            };
      })
    );

    function handleReadyStateChange(
      this: Adapter,
      readyState: WalletReadyState
    ) {
      setWallets((prevWallets) => {
        const index = prevWallets.findIndex(({ adapter }) => adapter === this);
        if (index === -1) return prevWallets;

        const { adapter } = prevWallets[index]!;
        return [
          ...prevWallets.slice(0, index),
          { adapter, readyState },
          ...prevWallets.slice(index + 1),
        ];
      });
    }

    adapters.forEach((adapter) =>
      adapter.on('readyStateChange', handleReadyStateChange, adapter)
    );
    return () =>
      adapters.forEach((adapter) =>
        adapter.off('readyStateChange', handleReadyStateChange, adapter)
      );
  }, [adapters]);

  // When the selected wallet changes, initialize the state.
  // Use a functional update to bail out when nothing has actually changed,
  // preventing unnecessary re-renders that cause WASM concurrency races.
  useEffect(() => {
    const found = name && wallets.find(({ adapter }) => adapter.name === name);
    if (found) {
      setState((prev) => {
        if (
          prev.wallet === found &&
          prev.adapter === found.adapter &&
          prev.connected === found.adapter.connected &&
          prev.address === found.adapter.address &&
          prev.publicKey === found.adapter.publicKey
        )
          return prev;
        return {
          wallet: found,
          adapter: found.adapter,
          connected: found.adapter.connected,
          address: found.adapter.address,
          publicKey: found.adapter.publicKey,
        };
      });
    } else {
      setState((prev) => (prev === initialState ? prev : initialState));
    }
  }, [name, wallets]);

  // If the window is closing or reloading, ignore disconnect and error events
  useEffect(() => {
    function listener() {
      isUnloading.current = true;
    }

    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [isUnloading]);

  // Handle the adapter's connect event.
  // Functional update bails out when values haven't changed to prevent re-render loops.
  const handleConnect = useCallback(() => {
    if (!adapter) return;
    setState((prev) => {
      if (
        prev.connected === adapter.connected &&
        prev.address === adapter.address &&
        prev.publicKey === adapter.publicKey
      )
        return prev;
      return {
        ...prev,
        connected: adapter.connected,
        address: adapter.address,
        publicKey: adapter.publicKey,
      };
    });
  }, [adapter]);

  // Handle the adapter's disconnect event
  const handleDisconnect = useCallback(() => {
    if (!isUnloading.current) setName(null);
  }, [isUnloading, setName]);

  // Handle the adapter's error event
  const handleError = useCallback(
    (error: WalletError) => {
      if (!isUnloading.current) (onError || console.error)(error);
      return error;
    },
    [isUnloading, onError]
  );

  // Setup and teardown event listeners when the adapter changes
  useEffect(() => {
    if (adapter) {
      adapter.on('connect', handleConnect);
      adapter.on('disconnect', handleDisconnect);
      adapter.on('error', handleError);
      return () => {
        adapter.off('connect', handleConnect);
        adapter.off('disconnect', handleDisconnect);
        adapter.off('error', handleError);
      };
    }
  }, [adapter, handleConnect, handleDisconnect, handleError]);

  // When the adapter changes, disconnect the old one
  useEffect(() => {
    return () => {
      adapter?.disconnect();
    };
  }, [adapter]);

  // Auto-select the first wallet if only one is available and none selected
  useEffect(() => {
    if (!name && wallets.length === 1) {
      setName(wallets[0].adapter.name);
    }
  }, [name, wallets, setName]);

  // If autoConnect is enabled, try to connect when the adapter changes and is ready
  useEffect(() => {
    if (
      isConnecting.current ||
      connected ||
      !autoConnect ||
      !adapter ||
      !(
        readyState === WalletReadyState.Installed ||
        readyState === WalletReadyState.Loadable
      )
    )
      return;

    (async function () {
      isConnecting.current = true;
      setConnecting(true);
      try {
        await adapter.connect(
          privateDataPermission,
          network,
          allowedPrivateData
        );
      } catch (error: any) {
        setName(null);
      } finally {
        setConnecting(false);
        isConnecting.current = false;
      }
    })();
  }, [isConnecting, connected, autoConnect, adapter, readyState, setName, privateDataPermission, network, allowedPrivateData]);

  // Connect the adapter to the wallet
  const connect = useCallback(async () => {
    if (isConnecting.current || isDisconnecting.current || connected) return;
    if (!adapter) throw handleError(new WalletNotSelectedError());

    if (
      !(
        readyState === WalletReadyState.Installed ||
        readyState === WalletReadyState.Loadable
      )
    ) {
      setName(null);

      if (typeof window !== 'undefined') {
        window.open(adapter.url, '_blank');
      }

      throw handleError(new WalletNotReadyError());
    }

    isConnecting.current = true;
    setConnecting(true);
    try {
      await adapter.connect(privateDataPermission, network, allowedPrivateData);
    } catch (error: any) {
      setName(null);
      throw error;
    } finally {
      setConnecting(false);
      isConnecting.current = false;
    }
  }, [
    isConnecting,
    isDisconnecting,
    connected,
    adapter,
    readyState,
    handleError,
    setName,
    privateDataPermission,
    network,
    allowedPrivateData,
  ]);

  // Disconnect the adapter from the wallet
  const disconnect = useCallback(async () => {
    if (isDisconnecting.current) return;
    if (!adapter) return setName(null);

    isDisconnecting.current = true;
    setDisconnecting(true);
    try {
      await adapter.disconnect();
    } catch (error: any) {
      setName(null);
      throw error;
    } finally {
      setDisconnecting(false);
      isDisconnecting.current = false;
    }
  }, [isDisconnecting, adapter, setName]);

  // Request transaction
  const requestTransaction:
    | MessageSignerWalletAdapterProps['requestTransaction']
    | undefined = useMemo(
    () =>
      adapter && 'requestTransaction' in adapter
        ? async (transaction: MidenTransaction) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestTransaction(transaction);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  // Request assets
  const requestAssets:
    | MessageSignerWalletAdapterProps['requestAssets']
    | undefined = useMemo(
    () =>
      adapter && 'requestAssets' in adapter
        ? async () => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestAssets();
          }
        : undefined,
    [adapter, handleError, connected]
  );

  // Request private notes
  const requestPrivateNotes:
    | MessageSignerWalletAdapterProps['requestPrivateNotes']
    | undefined = useMemo(
    () =>
      adapter && 'requestPrivateNotes' in adapter
        ? async (noteFilterType: NoteFilterTypes, noteIds?: string[]) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestPrivateNotes(noteFilterType, noteIds);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  const signBytes: MessageSignerWalletAdapterProps['signBytes'] | undefined =
    useMemo(
      () =>
        adapter && 'signBytes' in adapter
          ? async (message: Uint8Array, kind: SignKind) => {
              if (!connected) throw handleError(new WalletNotConnectedError());
              return await adapter.signBytes(message, kind);
            }
          : undefined,
      [adapter, handleError, connected]
    );

  const importPrivateNote:
    | MessageSignerWalletAdapterProps['importPrivateNote']
    | undefined = useMemo(
    () =>
      adapter && 'importPrivateNote' in adapter
        ? async (note: Uint8Array) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.importPrivateNote(note);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  const requestConsumableNotes:
    | MessageSignerWalletAdapterProps['requestConsumableNotes']
    | undefined = useMemo(
    () =>
      adapter && 'requestConsumableNotes' in adapter
        ? async () => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestConsumableNotes();
          }
        : undefined,
    [adapter, handleError, connected]
  );

  // Pattern B: silent backfill primitive used by ingestState. Optional on the
  // adapter — older wallet builds without this method skip ingest entirely.
  // Never throws on permission denial; returns empty array (the wallet handler
  // enforces this contract). Internal to the React-adapter bridge; not
  // exposed on WalletContextState.
  const requestPrivateNoteBytes:
    | ((noteIds?: string[]) => Promise<Uint8Array[]>)
    | undefined = useMemo(
    () =>
      adapter && 'requestPrivateNoteBytes' in adapter &&
      typeof (adapter as any).requestPrivateNoteBytes === 'function'
        ? async (noteIds?: string[]) => {
            if (!connected) return [];
            return await (adapter as any).requestPrivateNoteBytes(noteIds);
          }
        : undefined,
    [adapter, connected]
  );

  const waitForTransaction:
    | MessageSignerWalletAdapterProps['waitForTransaction']
    | undefined = useMemo(
    () =>
      adapter && 'waitForTransaction' in adapter
        ? async (txId: string, timeout?: number) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.waitForTransaction(txId, timeout);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  const requestSend:
    | MessageSignerWalletAdapterProps['requestSend']
    | undefined = useMemo(
    () =>
      adapter && 'requestSend' in adapter
        ? async (transaction) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestSend(transaction);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  const requestConsume:
    | MessageSignerWalletAdapterProps['requestConsume']
    | undefined = useMemo(
    () =>
      adapter && 'requestConsume' in adapter
        ? async (transaction) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.requestConsume(transaction);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  const createAccount:
    | MessageSignerWalletAdapterProps['createAccount']
    | undefined = useMemo(
    () =>
      adapter && 'createAccount' in adapter
        ? async (params?: CreateAccountParams) => {
            if (!connected) throw handleError(new WalletNotConnectedError());
            return await adapter.createAccount(params);
          }
        : undefined,
    [adapter, handleError, connected]
  );

  // Build SignerContext value.
  //
  // CRITICAL: signerContext MUST be referentially stable.  MidenProvider's init
  // effect has signerContext in its deps — every new object re-triggers initClient
  // which does async WASM work.  Two concurrent initClient calls cause the
  // "recursive use of an object" crash.
  //
  // We keep a single mutable ref and only call setSignerContext when the ref
  // identity actually needs to change (disconnected ↔ connected, or address change).
  //
  // Initialise as {isConnected:false} rather than null so MidenProvider's init
  // effect hits the early-return path instead of creating a local-keystore client
  // that races with our buildContext's WASM operations.

  // Keep signBytes in a ref so buildContext doesn't re-run when its identity changes.
  const signBytesRef = useRef(signBytes);
  useEffect(() => { signBytesRef.current = signBytes; }, [signBytes]);
  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);
  const disconnectRef = useRef(disconnect);
  useEffect(() => { disconnectRef.current = disconnect; }, [disconnect]);
  // Pattern B: ref the bytes-export wrapper so the ingestState closure built
  // inside buildContext can pick up adapter swaps without rebuilding the ctx.
  const requestPrivateNoteBytesRef = useRef(requestPrivateNoteBytes);
  useEffect(() => {
    requestPrivateNoteBytesRef.current = requestPrivateNoteBytes;
  }, [requestPrivateNoteBytes]);

  const disconnectedCtx = useRef<SignerContextValue>({
    signCb: async () => { throw new Error('MidenFi wallet not connected'); },
    accountConfig: null as any,
    storeName: '',
    name: 'MidenFi',
    isConnected: false,
    connect: async () => { await connectRef.current(); },
    disconnect: async () => { await disconnectRef.current(); },
  });

  // The connected context ref — reused across renders to maintain referential identity.
  const connectedCtxRef = useRef<SignerContextValue | null>(null);

  const [signerContext, setSignerContext] = useState<SignerContextValue>(
    disconnectedCtx.current
  );

  useEffect(() => {
    let cancelled = false;

    async function buildContext() {
      if (!connected || !publicKey || !address || !signBytesRef.current) {
        // Already disconnected — don't set state again (same ref = no re-render).
        if (connectedCtxRef.current !== null) {
          connectedCtxRef.current = null;
          setSignerContext(disconnectedCtx.current);
        }
        return;
      }

      try {
        if (!cancelled) {
          // Hoist all SDK module imports here so ingestState (which fires every
          // ~15s on auto-sync) doesn't repeatedly cross the dynamic-import
          // microtask boundary.
          const { AccountStorageMode, NoteFile, NoteFilter, NoteFilterTypes } =
            await import('@miden-sdk/miden-sdk');

          const signCb = async (_: Uint8Array, signingInputs: Uint8Array) => {
            const result = await signBytesRef.current!(signingInputs, 'signingInputs');
            return result;
          };

          // Pattern B: top-level signBytes for useSignBytes consumers.
          // Mirrors the wallet's Vault.signData semantics — the adapter just
          // forwards (data, kind) to the wallet, which deserializes into
          // Word/SigningInputs and calls the WASM signer.
          const signBytesCallback = async (
            data: Uint8Array,
            kind: 'word' | 'signingInputs'
          ): Promise<Uint8Array> => {
            return await signBytesRef.current!(data, kind);
          };

          // Pattern B: ingestState backfills the dApp's local IndexedDB with
          // the user's private notes (which never appear in chain state).
          // Single silent round-trip: ask the wallet for all private-note
          // bytes (returns [] if no permission), dedup against local store,
          // import each missing note. Per-operation runExclusive — no
          // outer-wrap (would deadlock on the non-reentrant AsyncLock during
          // init).
          const ingestState: IngestStateCallback = async ({
            client,
            runExclusive,
          }) => {
            const reqBytes = requestPrivateNoteBytesRef.current;
            if (!reqBytes) return;

            let allBytes: Uint8Array[];
            try {
              allBytes = await reqBytes();
            } catch (err) {
              console.warn(
                '[MidenFiSigner] requestPrivateNoteBytes failed:',
                err
              );
              return;
            }
            if (allBytes.length === 0) return;

            // Snapshot local note IDs inside runExclusive for a coherent view.
            // NoteFilterTypes.All catches notes in every state so we don't
            // re-import a note already in flight.
            const localIds = await runExclusive(async () => {
              const localNotes = await client.getInputNotes(
                new NoteFilter(NoteFilterTypes.All)
              );
              return new Set(localNotes.map((n: any) => n.id().toString()));
            });

            // Per-note: deserialize, get the note ID via NoteFile.noteId()
            // (which IS exposed on the WASM type), skip if already in store,
            // import otherwise. Each import in its own runExclusive so other
            // hooks (account fetch, sync, send) can interleave between notes.
            // Per-note try/catch so one malformed blob doesn't lose the rest.
            for (const bytes of allBytes) {
              try {
                const noteFile = NoteFile.deserialize(bytes);
                const noteId = noteFile.noteId().toString();
                if (localIds.has(noteId)) continue;
                await runExclusive(() => client.importNoteFile(noteFile));
                localIds.add(noteId);
              } catch (err) {
                console.warn(
                  '[MidenFiSigner] failed to import private note:',
                  err
                );
              }
            }
          };

          const resolvedStorageMode = AccountStorageMode.tryFromStr(storageMode);

          // Always hand the wallet's existing account ID to `initializeSignerAccount`
          // so it takes the import-by-id branch. The wallet already owns the account
          // (the bech32 `address` IS the on-chain account ID); reconstructing it
          // locally would require knowing every creation parameter the wallet used
          // (seed, auth scheme, storage mode, components) and would also hit a
          // broken `AuthScheme.AuthEcdsaK256Keccak` lookup in `@miden-sdk/react`
          // <= 0.14.4. Consumers can still override by passing an explicit
          // `importAccountId` prop (e.g. to pin to a non-default account).
          const ctx: SignerContextValue = {
            signCb,
            accountConfig: {
              publicKeyCommitment: publicKey,
              accountType,
              storageMode: resolvedStorageMode,
              ...(customComponents?.length ? { customComponents } : {}),
              importAccountId: importAccountId ?? address,
            },
            storeName: `midenfi_${address}`,
            name: 'MidenFi',
            isConnected: true,
            address,
            publicKey,
            signBytes: signBytesCallback,
            ingestState,
            connect: connectRef.current,
            disconnect: disconnectRef.current,
          };

          connectedCtxRef.current = ctx;
          setSignerContext(ctx);
        }
      } catch (error) {
        console.error('Failed to build MidenFi signer context:', error);
        if (!cancelled) {
          connectedCtxRef.current = null;
          setSignerContext(disconnectedCtx.current);
        }
      }
    }

    buildContext();
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, address, accountType, storageMode, customComponents, importAccountId]);

  const walletContextValue = useMemo(
    () => ({
      autoConnect,
      wallets,
      wallet,
      address,
      publicKey,
      connected,
      connecting,
      disconnecting,
      select: setName,
      connect,
      disconnect,
      requestTransaction,
      requestAssets,
      requestPrivateNotes,
      signBytes,
      importPrivateNote,
      requestConsumableNotes,
      waitForTransaction,
      requestSend,
      requestConsume,
      createAccount,
    }),
    [
      autoConnect,
      wallets,
      wallet,
      address,
      publicKey,
      connected,
      connecting,
      disconnecting,
      setName,
      connect,
      disconnect,
      requestTransaction,
      requestAssets,
      requestPrivateNotes,
      signBytes,
      importPrivateNote,
      requestConsumableNotes,
      waitForTransaction,
      requestSend,
      requestConsume,
      createAccount,
    ]
  );

  return (
    <WalletContext.Provider value={walletContextValue}>
      <SignerContext.Provider value={signerContext}>
        {children}
      </SignerContext.Provider>
    </WalletContext.Provider>
  );
};

/**
 * @deprecated Prefer the unified `@miden-sdk/react` hooks, which work against
 * any connected signer (MidenFi, Para, Turnkey, ...) without coupling your
 * dApp to a specific adapter:
 *
 *   - Connection state / address: `useSigner()` (`isConnected`, `address`,
 *     `publicKey`, `connect`, `disconnect`)
 *   - Read notes (incl. private notes the wallet holds): `useNotes({ accountId })`
 *     — Pattern B's `ingestState` backfills private notes into the local
 *     store automatically.
 *   - Sign arbitrary bytes: `useSignBytes()`
 *   - Send / consume / wait: `useSend()`, `useConsume()`, `useWaitForCommit()`
 *
 * `useMidenFiWallet` remains supported for capabilities not yet on the SDK
 * surface (multi-wallet discovery via `wallets` / `select`, transitional
 * `connecting` / `disconnecting` flags). It will be removed in a future major
 * release.
 */
export function useMidenFiWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context || Object.keys(context).length === 0) {
    throw new Error('useMidenFiWallet must be used within MidenFiSignerProvider');
  }
  if (!useMidenFiWalletWarned) {
    useMidenFiWalletWarned = true;
    // One-shot console warning so consumers notice during dev without spamming
    // production logs on every render.
    console.warn(
      '[miden-wallet-adapter] useMidenFiWallet is deprecated. ' +
        'Use @miden-sdk/react hooks (useSigner, useNotes, useSignBytes) instead. ' +
        'See JSDoc for the migration map.'
    );
  }
  return context;
}

let useMidenFiWalletWarned = false;

// Re-export for backward compatibility
export { WalletContext };
export type { WalletContextState as MidenFiWalletContextState };
