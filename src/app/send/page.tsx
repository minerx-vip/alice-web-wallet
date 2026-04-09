'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { decryptWalletPayload } from '@/lib/crypto';
import { transfer, parseAmount, getBalance, formatBalance } from '@/lib/chain';
import AppShell from '@/components/AppShell';
import PasswordDialog from '@/components/PasswordDialog';
import { Loader2, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { getActiveLang } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';

function SendPage() {
  const pathname = usePathname();
  const lang = getActiveLang(pathname);
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
    if (!to.trim()) { setError(uiText(lang, 'send.enter_recipient')); return; }
    if (!amount || parseFloat(amount) <= 0) { setError(uiText(lang, 'send.enter_valid_amount')); return; }

    setSending(true);
    setError('');
    setTxHash('');
    try {
      const raw = parseAmount(amount);
      const hash = await transfer(seed, to.trim(), raw);
      setTxHash(hash);
      toast.success(uiText(lang, 'send.transfer_sent_toast'));
    } catch (err) {
      setError(err instanceof Error ? err.message : uiText(lang, 'send.transfer_failed'));
      toast.error(uiText(lang, 'send.transfer_failed'));
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
      if (!to.trim()) { setError(uiText(lang, 'send.enter_recipient')); return; }
      if (!amount || parseFloat(amount) <= 0) { setError(uiText(lang, 'send.enter_valid_amount')); return; }
      setShowPwDialog(true);
      return;
    }
    doTransfer(unlockedSeed);
  };

  if (!wallet) {
    return <p className="text-muted">{uiText(lang, 'settings.select_wallet_first')}</p>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{uiText(lang, 'send.title')}</h1>

      {txHash ? (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold">{uiText(lang, 'send.transfer_sent')}</h2>
          <div className="text-sm text-muted break-all">
            <p className="mb-1">{uiText(lang, 'send.transaction_hash')}</p>
            <code className="text-xs bg-card-hover p-2 rounded block">{txHash}</code>
          </div>
          <button onClick={() => { setTxHash(''); setTo(''); setAmount(''); }} className="btn-primary">
            {uiText(lang, 'send.send_another')}
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <div className="text-sm text-muted">
            {uiText(lang, 'send.available')} {loadingBalance ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
            ) : balance !== null ? (
              <span className="text-foreground font-medium">{formatBalance(balance)} ALICE</span>
            ) : (
              <span className="text-foreground font-medium">--</span>
            )}
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'send.recipient_address')}</label>
            <input
              type="text"
              value={to}
              onChange={e => { setTo(e.target.value); setError(''); }}
              placeholder="a2..."
              className="w-full font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'send.amount')}</label>
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
            {sending ? uiText(lang, 'send.sending') : uiText(lang, 'send.send')}
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
