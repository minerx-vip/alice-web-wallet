'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { decryptWalletPayload } from '@/lib/crypto';
import { transfer, parseAmount, getBalance, formatBalance } from '@/lib/chain';
import AppShell from '@/components/AppShell';
import PasswordDialog from '@/components/PasswordDialog';
import { Loader2, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

function SendPage() {
  const { wallets, activeWalletId, unlockedSeed, unlock } = useWalletStore();
  const wallet = wallets.find(w => w.id === activeWalletId);

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!wallet) return;
    setLoadingBalance(true);
    try {
      const bal = await getBalance(wallet.address);
      setBalance(bal.free);
    } catch { /* ignore */ }
    finally { setLoadingBalance(false); }
  }, [wallet]);

  useEffect(() => {
    setBalance(null);
    fetchBalance();
  }, [fetchBalance]);

  const doTransfer = async (seed: Uint8Array) => {
    if (!to.trim()) { setError('Enter recipient address'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }

    setSending(true);
    setError('');
    setTxHash('');
    try {
      const raw = parseAmount(amount);
      const hash = await transfer(seed, to.trim(), raw);
      setTxHash(hash);
      toast.success('Transfer sent!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
      toast.error('Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const handleUnlock = async (password: string) => {
    if (!wallet) return;
    const result = await decryptWalletPayload(wallet.payload, password);
    unlock(result.seed, result.mnemonic);
    setShowPwDialog(false);
    // Auto-send after unlock
    doTransfer(result.seed);
  };

  const handleSend = async () => {
    if (!unlockedSeed) {
      if (!to.trim()) { setError('Enter recipient address'); return; }
      if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
      setShowPwDialog(true);
      return;
    }
    doTransfer(unlockedSeed);
  };

  if (!wallet) {
    return <p className="text-muted">Select a wallet first.</p>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Send ALICE</h1>

      {txHash ? (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold">Transfer Sent!</h2>
          <div className="text-sm text-muted break-all">
            <p className="mb-1">Transaction Hash:</p>
            <code className="text-xs bg-card-hover p-2 rounded block">{txHash}</code>
          </div>
          <button onClick={() => { setTxHash(''); setTo(''); setAmount(''); }} className="btn-primary">
            Send Another
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <div className="text-sm text-muted">
            Available: {loadingBalance ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
            ) : balance !== null ? (
              <span className="text-foreground font-medium">{formatBalance(balance)} ALICE</span>
            ) : (
              <span className="text-foreground font-medium">--</span>
            )}
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">Recipient Address</label>
            <input
              type="text"
              value={to}
              onChange={e => { setTo(e.target.value); setError(''); }}
              placeholder="a2..."
              className="w-full font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">Amount (ALICE)</label>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); }}
              placeholder="0.00"
              className="w-full"
              min="0"
              step="0.0001"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            onClick={handleSend}
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={sending}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      )}

      <PasswordDialog
        open={showPwDialog}
        onSubmit={handleUnlock}
        onCancel={() => setShowPwDialog(false)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <SendPage />
    </AppShell>
  );
}
