import { Note, type NoteFilterTypes } from '@miden-sdk/miden-sdk';
import {
  AllowedPrivateData,
  BaseMessageSignerWalletAdapter,
  EventEmitter,
  scopePollingDetectionStrategy,
  SignKind,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  PrivateDataPermission,
  WalletAdapterNetwork,
  MidenSendTransaction,
  MidenTransaction,
  MidenConsumeTransaction,
  TransactionType,
  WalletTransactionError,
  Asset,
  GuardianInfo,
  CreateAccountParams,
  InputNoteDetails,
  TransactionOutput,
  WalletTransactionOutput,
  b64ToU8,
} from '@miden-sdk/miden-wallet-adapter-base';

export interface MidenWalletEvents {
  connect(...args: unknown[]): unknown;
  disconnect(...args: unknown[]): unknown;
  accountChange(...args: unknown[]): unknown;
}

export interface MidenWallet extends EventEmitter<MidenWalletEvents> {
  address?: string;
  publicKey?: Uint8Array;
  requestSend(
    transaction: MidenSendTransaction
  ): Promise<{ transactionId?: string }>;
  requestConsume(
    transaction: MidenConsumeTransaction
  ): Promise<{ transactionId?: string }>;
  requestTransaction(
    transaction: MidenTransaction
  ): Promise<{ transactionId?: string }>;
  requestAssets(): Promise<{ assets: Asset[] }>;
  requestGuardianInfo(): Promise<{ guardianInfo: GuardianInfo }>;
  requestPrivateNotes(
    noteFilterType: NoteFilterTypes,
    noteIds?: string[]
  ): Promise<{
    privateNotes: InputNoteDetails[];
  }>;
  waitForTransaction(
    txId: string,
    timeout?: number
  ): Promise<WalletTransactionOutput>;
  signBytes(
    message: Uint8Array,
    kind: SignKind
  ): Promise<{ signature: Uint8Array }>;
  importPrivateNote(note: Uint8Array): Promise<{ noteId: string }>;
  requestConsumableNotes(): Promise<{ consumableNotes: InputNoteDetails[] }>;
  createAccount(params?: CreateAccountParams): Promise<{ accountId: string }>;
  connect(
    privateDataPermission: PrivateDataPermission,
    network: WalletAdapterNetwork,
    allowedPrivateData?: AllowedPrivateData
  ): Promise<void>;
  disconnect(): Promise<void>;
}

export interface MidenWindow extends Window {
  midenWallet?: MidenWallet;
  miden?: MidenWallet;
}

declare const window: MidenWindow;

export interface MidenWalletAdapterConfig {
  appName?: string;
}

export const MidenWalletName = 'Bread Wallet' as WalletName<'Bread Wallet'>;

export class MidenWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = MidenWalletName;
  url = 'https://chromewebstore.google.com/detail/Bread/coajhopfooegmaifelglfboehacldcbo';
  icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjExIiBoZWlnaHQ9IjIxNCIgdmlld0JveD0iMCAwIDIxMSAyMTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMDcuNDQgMC4xMjE3NjJDMTIxLjk5IC0wLjkwOTY1MiAxMzQuNzMzIDQuNjc0NjMgMTQ1LjE1NyAxNC40NzYxQzE4My41NjQgLTQuNjYzMDMgMjIyLjk2NSAzNS40NDAxIDIwNi4zNTIgNzMuOTk5MUMyMDQuNzcyIDEwMy4wMDcgMjA4LjUwNyAxMzQuMzIyIDIwNi4zOTUgMTYzLjA1NUMyMDUuNjAyIDE3My43OSAyMDAuMTgyIDE4Mi4yODUgMTkxLjkzNyAxODguODRDMTc5LjgyMiAxOTguNDY1IDE1Ny41MSAyMTEuNzUxIDE0Mi4wNTcgMjEyLjc1MkMxMDEuMzk4IDIxNS4zODggNTcuOTI2NCAyMTAuNjk1IDE2Ljk2ODkgMjEyLjc1MkM2LjQxMDYzIDIxMS45NjUgMS41NzA5MyAyMDUuNTE0IDAuODA4MDQ2IDE5NS4zN0MyLjc5NzY0IDE1NS44MzUgLTEuNzYxMzMgMTEzLjg0NiAwLjgwODA0NiA3NC41OTcyQzMuMjA2NTQgMzcuODgxMyA0MC4wNTY3IC0xLjcwMzA1IDc5LjA4NTcgMTIuNjUxM0M4Ni45MDk4IDUuNTcxNzggOTYuNzk2NyAwLjg3MjQzMSAxMDcuNDQ3IDAuMTE1NjUzTDEwNy40NCAwLjEyMTc2MlpNMTE2LjcxNyAxMjguNTk3QzEzNi45NDIgMTIzLjkyMiAxNDQuMDc3IDk5LjQ3OTMgMTM2LjUyMSA4MS42NTIzQzEzMC45MDcgNjguNDAyNiAxMTcuNDc0IDYxLjgxMTMgMTAzLjYyNiA2MC44ODM3Qzc5LjI3NDkgNTkuMjU0MiA1My4xMjk1IDYyLjE0NyAyOC41ODkxIDYwLjkxNDJDMTguNzAyMiA2Mi4zNDIzIDEwLjQ1MDkgNjcuOTY5MyA4Ljc2MDMzIDc4LjI4MzRMOS4xNzUzIDE5Ny4zNzhDMTAuNTA1OCAyMDAuOTQ5IDEzLjcyODIgMjAzLjgwNSAxNy42MDk3IDIwNC4xODlDNDcuNjE4NCAyMDIuNTIzIDgwLjAwMTEgMjA2LjQwNSAxMDkuNzI5IDIwNC4yMTRDMTQ2LjI2OCAyMDEuNTIyIDE1Ny4wMDkgMTUyLjU2NCAxMjcuNDk1IDEzMy4zNjNMMTE2LjcyMyAxMjguNTk3SDExNi43MTdaIiBmaWxsPSIjRTc3NTM3Ii8+CjxwYXRoIGQ9Ik0xMTYuNzE3IDEyOC41OTdDMTM2Ljk0MiAxMjMuOTIyIDE0NC4wNzcgOTkuNDc5MyAxMzYuNTIxIDgxLjY1MjNDMTMwLjkwNyA2OC40MDI2IDExNy40NzQgNjEuODExMyAxMDMuNjI2IDYwLjg4MzdDNzkuMjc0OSA1OS4yNTQyIDUzLjEyOTUgNjIuMTQ3IDI4LjU4OTEgNjAuOTE0MkMxOC43MDIyIDYyLjM0MjMgMTAuNDUwOSA2Ny45NjkzIDguNzYwMzMgNzguMjgzNEw5LjE3NTMgMTk3LjM3OEMxMC41MDU4IDIwMC45NDkgMTMuNzI4MiAyMDMuODA1IDE3LjYwOTcgMjA0LjE4OUM0Ny42MTg0IDIwMi41MjMgODAuMDAxMSAyMDYuNDA1IDEwOS43MjkgMjA0LjIxNEMxNDYuMjY4IDIwMS41MjIgMTU3LjAwOSAxNTIuNTY0IDEyNy40OTUgMTMzLjM2M0wxMTYuNzIzIDEyOC41OTdIMTE2LjcxN1oiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+Cg==';
  readonly supportedTransactionVersions = null;

  private _connecting: boolean;
  private _wallet: MidenWallet | null;
  private _address: string | null;
  private _publicKey: Uint8Array | null;
  private _privateDataPermission: string;
  private _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;

  constructor({ appName = 'sample' }: MidenWalletAdapterConfig = {}) {
    super();
    this._connecting = false;
    this._wallet = null;
    this._address = null;
    this._publicKey = null;
    this._privateDataPermission = PrivateDataPermission.UponRequest;

    if (this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (window?.midenWallet || window?.miden) {
          this._readyState = WalletReadyState.Installed;
          this.emit('readyStateChange', this._readyState);
          return true;
        }
        return false;
      });
    }
  }

  get address() {
    return this._address;
  }

  get publicKey() {
    return this._publicKey;
  }

  get privateDataPermission() {
    return this._privateDataPermission;
  }

  get connecting() {
    return this._connecting;
  }

  get readyState() {
    return this._readyState;
  }

  set readyState(readyState) {
    this._readyState = readyState;
  }

  async requestSend(transaction: MidenSendTransaction): Promise<string> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.requestSend(transaction);
        return result.transactionId!;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestConsume(transaction: MidenConsumeTransaction): Promise<string> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.requestConsume(transaction);
        return result.transactionId!;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestTransaction(transaction: MidenTransaction): Promise<string> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        // The wallet's generalized `requestTransaction` endpoint only accepts
        // a custom-transaction payload, so a `send`/`consume` transaction must
        // be routed to its dedicated endpoint — otherwise the wallet rejects
        // it with "Invalid CustomTransaction payload". Dispatching by `type`
        // here is what lets the typed `Transaction` / `TransactionType` API
        // (incl. `Transaction.createConsumeTransaction`) work for every type.
        let result: { transactionId?: string };
        switch (transaction.type) {
          case TransactionType.Send:
            result = await wallet.requestSend(
              transaction.payload as MidenSendTransaction
            );
            break;
          case TransactionType.Consume:
            result = await wallet.requestConsume(
              transaction.payload as MidenConsumeTransaction
            );
            break;
          default:
            // Custom transactions — and legacy callers that pass a bare
            // `CustomTransaction` payload — go through the generalized endpoint.
            result = await wallet.requestTransaction(transaction);
            break;
        }
        return result.transactionId!;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestAssets(): Promise<Asset[]> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.requestAssets();
        return result.assets;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestGuardianInfo(): Promise<GuardianInfo> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.requestGuardianInfo();
        return result.guardianInfo;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestPrivateNotes(
    noteFilterType: NoteFilterTypes,
    noteIds?: string[]
  ): Promise<InputNoteDetails[]> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.requestPrivateNotes(
          noteFilterType,
          noteIds
        );
        return result.privateNotes;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signBytes(message: Uint8Array, kind: SignKind): Promise<Uint8Array> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.signBytes(message, kind);
        return result.signature;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async importPrivateNote(note: Uint8Array): Promise<string> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      const result = await wallet.importPrivateNote(note);
      return result.noteId;
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async requestConsumableNotes(): Promise<InputNoteDetails[]> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      const result = await wallet.requestConsumableNotes();
      return result.consumableNotes;
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async waitForTransaction(
    txId: string,
    timeout?: number
  ): Promise<TransactionOutput> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      const result = await wallet.waitForTransaction(txId, timeout);
      if ('errorMessage' in result) {
        throw new WalletTransactionError(result.errorMessage);
      }
      const notes = result.outputNotes.map((serNote) => {
        const u8Arr = b64ToU8(serNote);
        return Note.deserialize(u8Arr);
      });
      return {
        txHash: result.txHash,
        outputNotes: notes,
      };
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async createAccount(params?: CreateAccountParams): Promise<string> {
    try {
      const wallet = this._wallet;
      if (!wallet || !this.address) throw new WalletNotConnectedError();
      try {
        const result = await wallet.createAccount(params);
        return result.accountId;
      } catch (error: any) {
        throw new WalletTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async connect(
    privateDataPermission: PrivateDataPermission,
    network: WalletAdapterNetwork,
    allowedPrivateData?: AllowedPrivateData
  ): Promise<void> {
    try {
      // Guard only against a *concurrent* connect — NOT against being
      // already connected. The in-app wallet browser preserves this
      // adapter's JS context across a park/restore (a dApp is minimized and
      // reopened without a page reload), so a re-opened dApp finds this
      // instance with `connected === true`. An early-return-when-connected
      // made a second connect() a silent no-op, so a re-mounted consumer
      // that re-subscribed to events never received its account back —
      // "Connect Wallet works only once" (0xMiden/wallet#470). Re-driving
      // the handshake below is cheap for the common case — the wallet
      // returns the current account for an existing permission without
      // re-prompting — and re-emits `connect`, so repeated connect() calls
      // repopulate the account instead of being suppressed by stale session
      // state. (If the wallet has since locked, the re-drive can surface an
      // unlock prompt where the old code was a silent no-op; that's the
      // intended trade-off — a locked wallet genuinely needs to be unlocked
      // to hand back the account.)
      if (this.connecting) return;
      if (this._readyState !== WalletReadyState.Installed)
        throw new WalletNotReadyError();

      this._connecting = true;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const wallet = window.midenWallet! || window.miden!;

      try {
        await wallet.connect(
          privateDataPermission,
          network,
          allowedPrivateData
        );
        if (!wallet.address) {
          throw new WalletConnectionError();
        }
        this._address = wallet.address;
        this._publicKey = wallet.publicKey!;
      } catch (error: any) {
        throw new WalletConnectionError(error?.message, error);
      }

      this._wallet = wallet;
      this._privateDataPermission = privateDataPermission;

      this.emit('connect', this._address);
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    if (wallet) {
      this._wallet = null;
      this._address = null;
      this._publicKey = null;

      try {
        await wallet.disconnect();
      } catch (error: any) {
        this.emit('error', new WalletDisconnectionError(error?.message, error));
      }
    }

    this.emit('disconnect');
  }
}
