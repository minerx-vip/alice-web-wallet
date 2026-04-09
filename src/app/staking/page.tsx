'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { decryptWalletPayload } from '@/lib/crypto';
import {
  getStakeStatus, stakeAsScorer, stakeAsAggregator,
  unstakeScorer, unstakeAggregator,
} from '@/lib/chain';
import type { StakeInfo } from '@/lib/chain';
import AppShell from '@/components/AppShell';
import PasswordDialog from '@/components/PasswordDialog';
import { Loader2, RefreshCw, Landmark, Zap, Server } from 'lucide-react';
import { toast } from 'sonner';

function StakingPage() {
  const { wallets, activeWalletId, unlockedSeed, unlock } = useWalletStore();
  const wallet = wallets.find(w => w.id === activeWalletId);

  const [balance, setBalance] = useState<number>(0);
  const [scorer, setScorer] = useState<StakeInfo | null>(null);
  const [aggregator, setAggregator] = useState<StakeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwDialog, setShowPwDialog] = useState(false);

  // Stake form
  const [stakeRole, setStakeRole] = useState<'scorer' | 'aggregator'>('scorer');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeEndpoint, setStakeEndpoint] = useState('');
  const [staking, setStaking] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const status = await getStakeStatus(wallet.address);
      setBalance(status.balance);
      setScorer(status.scorer);
      setAggregator(status.aggregator);
    } catch (err) {
      console.error('Stake status error:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleUnlock = async (password: string) => {
    if (!wallet) return;
    const result = await decryptWalletPayload(wallet.payload, password);
    unlock(result.seed, result.mnemonic);
    setShowPwDialog(false);
    toast.success('Wallet unlocked');
  };

  const handleStake = async () => {
    if (!unlockedSeed) { setShowPwDialog(true); return; }
    if (!stakeAmount || parseInt(stakeAmount) <= 0) { setError('Enter a valid amount'); return; }
    if (!stakeEndpoint.trim()) { setError('Enter your service endpoint'); return; }

    setStaking(true);
    setError('');
    try {
      const amt = parseInt(stakeAmount);
      if (stakeRole === 'scorer') {
        await stakeAsScorer(unlockedSeed, amt, stakeEndpoint.trim());
      } else {
        await stakeAsAggregator(unlockedSeed, amt, stakeEndpoint.trim());
      }
      toast.success(`Staked ${amt.toLocaleString()} ALICE as ${stakeRole}`);
      fetchStatus();
      setStakeAmount('');
      setStakeEndpoint('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stake failed');
      toast.error('Stake failed');
    } finally {
      setStaking(false);
    }
  };

  const handleUnstake = async (role: 'scorer' | 'aggregator') => {
    if (!unlockedSeed) { setShowPwDialog(true); return; }
    setStaking(true);
    try {
      if (role === 'scorer') {
        await unstakeScorer(unlockedSeed);
      } else {
        await unstakeAggregator(unlockedSeed);
      }
      toast.success(`Unstake cooldown started (${role})`);
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unstake failed');
    } finally {
      setStaking(false);
    }
  };

  if (!wallet) {
    return <p className="text-muted">Select a wallet first.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staking</h1>
        <button onClick={fetchStatus} className="text-muted hover:text-foreground" disabled={loading}>
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Current status */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-muted mb-1">Balance</div>
          <div className="text-xl font-bold">{balance.toLocaleString()} <span className="text-sm text-muted font-normal">ALICE</span></div>
        </div>
        <div className="card">
          <div className="text-sm text-muted mb-1 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Scorer</div>
          {scorer ? (
            <>
              <div className="text-xl font-bold">{scorer.stake.toLocaleString()} <span className="text-sm text-muted font-normal">ALICE</span></div>
              <div className="text-xs text-accent mt-1">{scorer.status}</div>
              {scorer.endpoint && <div className="text-xs text-muted truncate mt-0.5">{scorer.endpoint}</div>}
              <button onClick={() => handleUnstake('scorer')} className="btn-outline text-xs mt-2 py-1 px-2" disabled={staking}>Unstake</button>
            </>
          ) : (
            <div className="text-muted text-sm">Not staked</div>
          )}
        </div>
        <div className="card">
          <div className="text-sm text-muted mb-1 flex items-center gap-1"><Server className="w-3.5 h-3.5" /> Aggregator</div>
          {aggregator ? (
            <>
              <div className="text-xl font-bold">{aggregator.stake.toLocaleString()} <span className="text-sm text-muted font-normal">ALICE</span></div>
              <div className="text-xs text-accent mt-1">{aggregator.status}</div>
              {aggregator.endpoint && <div className="text-xs text-muted truncate mt-0.5">{aggregator.endpoint}</div>}
              <button onClick={() => handleUnstake('aggregator')} className="btn-outline text-xs mt-2 py-1 px-2" disabled={staking}>Unstake</button>
            </>
          ) : (
            <div className="text-muted text-sm">Not staked</div>
          )}
        </div>
      </div>

      {/* Stake form */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" /> Stake ALICE
        </h2>

        <div className="flex gap-2">
          {(['scorer', 'aggregator'] as const).map(role => (
            <button
              key={role}
              onClick={() => setStakeRole(role)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                stakeRole === role ? 'bg-primary text-white' : 'bg-card-hover text-muted'
              }`}
            >
              {role === 'scorer' ? 'Scorer (min 5,000)' : 'Aggregator (min 20,000)'}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">Amount (ALICE)</label>
          <input
            type="number"
            value={stakeAmount}
            onChange={e => { setStakeAmount(e.target.value); setError(''); }}
            placeholder={stakeRole === 'scorer' ? '5000' : '20000'}
            className="w-full"
            min="1"
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">Service Endpoint</label>
          <input
            type="text"
            value={stakeEndpoint}
            onChange={e => { setStakeEndpoint(e.target.value); setError(''); }}
            placeholder="http://YOUR_IP:8090"
            className="w-full"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          onClick={handleStake}
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={staking}
        >
          {staking && <Loader2 className="w-4 h-4 animate-spin" />}
          Stake as {stakeRole}
        </button>
      </div>

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
      <StakingPage />
    </AppShell>
  );
}
