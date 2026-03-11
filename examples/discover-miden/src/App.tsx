import { useWalletModal, WalletModalButton } from '@miden-sdk/miden-wallet-adapter-reactui';
import { useWallet } from '@miden-sdk/miden-wallet-adapter-react';

export default function App() {
  const { setVisible } = useWalletModal();
  const { connected, wallet, disconnect } = useWallet();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '24px',
      padding: '24px',
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600 }}>
        Wallet Adapter Test
      </h1>

      <p style={{ color: '#656565', fontSize: '14px' }}>
        Status: {connected ? `Connected to ${wallet?.adapter.name}` : 'Not connected'}
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <WalletModalButton />

        <button
          onClick={() => setVisible(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '32px',
            border: '1px solid #E5E5E5',
            background: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Open Modal Directly
        </button>

        {connected && (
          <button
            onClick={() => disconnect()}
            style={{
              padding: '12px 24px',
              borderRadius: '32px',
              border: '1px solid #E5E5E5',
              background: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
