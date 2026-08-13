import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  EventEmitter,
  WalletReadyState,
  type Adapter,
  type WalletAdapterEvents,
  type WalletName,
} from '@miden-sdk/miden-wallet-adapter-base';
import { WalletProvider } from '../WalletProvider';
import { useWallet } from '../useWallet';

class StubAdapter extends EventEmitter<WalletAdapterEvents> {
  name = 'Stub Wallet' as WalletName<'Stub Wallet'>;
  url = 'https://example.com';
  icon = 'data:image/svg+xml;base64,';
  readyState = WalletReadyState.Installed;
  address: string | null = null;
  publicKey: Uint8Array | null = null;
  connecting = false;
  connected = false;
  supportedTransactionVersions = null;

  connect = vi.fn().mockResolvedValue(undefined);
  disconnect = vi.fn().mockResolvedValue(undefined);
  requestTransaction = vi.fn().mockResolvedValue('tx-id');
  requestAssets = vi.fn().mockResolvedValue([]);
  requestGuardianInfo = vi.fn().mockResolvedValue({
    isGuardianAccount: false,
    guardianEndpoint: null,
    guardianProvider: null,
    guardianSyncStatus: null,
  });
  requestPrivateNotes = vi.fn().mockResolvedValue([]);
  signBytes = vi.fn().mockResolvedValue(new Uint8Array());
  importPrivateNote = vi.fn().mockResolvedValue('note-id');
  requestConsumableNotes = vi.fn().mockResolvedValue([]);
  waitForTransaction = vi.fn().mockResolvedValue({ txHash: '', outputNotes: [] });
  requestSend = vi.fn().mockResolvedValue('tx-id');
  requestConsume = vi.fn().mockResolvedValue('tx-id');
  createAccount = vi.fn().mockResolvedValue('account-id');
}

const withWalletProvider = (adapter: Adapter) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <WalletProvider wallets={[adapter]}>{children}</WalletProvider>;
  };
};

describe('requestGuardianInfo wiring (useWallet)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('is undefined before a wallet is selected', () => {
    const stubAdapter = new StubAdapter();
    const { result } = renderHook(() => useWallet(), {
      wrapper: withWalletProvider(stubAdapter),
    });

    expect(result.current.requestGuardianInfo).toBeUndefined();
  });

  it('exposes requestGuardianInfo through the provider once selected', async () => {
    const stubAdapter = new StubAdapter();
    const { result } = renderHook(() => useWallet(), {
      wrapper: withWalletProvider(stubAdapter),
    });

    await act(() => result.current.select(stubAdapter.name));

    expect(typeof result.current.requestGuardianInfo).toBe('function');
  });

  it('rejects and does not reach the adapter when not connected', async () => {
    const stubAdapter = new StubAdapter();
    const { result } = renderHook(() => useWallet(), {
      wrapper: withWalletProvider(stubAdapter),
    });

    await act(() => result.current.select(stubAdapter.name));

    await expect(result.current.requestGuardianInfo!()).rejects.toThrow();
    expect(stubAdapter.requestGuardianInfo).not.toHaveBeenCalled();
  });
});

describe('connect re-drive when already connected (useWallet, 0xMiden/wallet#470)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('re-drives adapter.connect() when connect() is called again while already connected', async () => {
    const stubAdapter = new StubAdapter();
    // A successful connect flips the adapter to connected and emits `connect`,
    // so the provider transitions to connected (mirrors a real handshake).
    stubAdapter.connect = vi.fn().mockImplementation(async () => {
      stubAdapter.connected = true;
      stubAdapter.address = '0xabc';
      stubAdapter.publicKey = new Uint8Array([1, 2, 3]);
      stubAdapter.emit('connect', '0xabc');
    });

    const { result } = renderHook(() => useWallet(), {
      wrapper: withWalletProvider(stubAdapter),
    });

    await act(() => result.current.select(stubAdapter.name));

    await act(async () => {
      await result.current.connect();
    });
    expect(stubAdapter.connect).toHaveBeenCalledTimes(1);
    expect(result.current.connected).toBe(true);

    // The in-app browser preserves the dApp's JS context across a
    // park/restore, so a re-opened dApp is still connected. A second
    // connect() must re-drive instead of silently no-opping (#470).
    await act(async () => {
      await result.current.connect();
    });
    expect(stubAdapter.connect).toHaveBeenCalledTimes(2);
  });
});
