'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { getBalance, formatBalance } from '@/lib/chain';
import { fetchHistory } from '@/lib/indexer';
import { shortAddress, formatAlice, formatTimestamp } from '@/lib/utils';
import type { TransactionRecord } from '@/lib/types';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPathname, withLang } from '@/lib/i18n';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Copy, Check,
  RefreshCw, Plus, Download, Send, Loader2,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';

const PAGE_SIZE = 10;

function Dashboard() {
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);

  const { wallets, activeWalletId } = useWalletStore();
  const wallet = wallets.find(w => w.id === activeWalletId);

  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [txns, setTxns] = useState<TransactionRecord[]>([]);
  const [txnsError, setTxnsError] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(0);

  // Reset all data immediately when switching wallets
  useEffect(() => {
    setBalance(null);
    setBalanceError(false);
    setTxns([]);
    setTxnsError(false);
    setPage(0);
  }, [activeWalletId]);

  const fetchData = useCallback(async () => {
    if (!wallet) return;
    const currentAddress = wallet.address;

    setLoadingBalance(true);
    setBalanceError(false);
    try {
      const bal = await getBalance(currentAddress);
      // Only update if still on the same wallet
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setBalance(bal.free);
      }
    } catch (err) {
      console.error('Balance error:', err);
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setBalanceError(true);
      }
    } finally {
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setLoadingBalance(false);
      }
    }

    setLoadingTxns(true);
    setTxnsError(false);
    try {
      const res = await fetchHistory(currentAddress, 200);
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setTxns(res.history.filter(t => t.entry_type === 'transfer'));
        setPage(0);
      }
    } catch {
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setTxnsError(true);
      }
    } finally {
      if (useWalletStore.getState().activeWalletId === wallet.id) {
        setLoadingTxns(false);
      }
    }
  }, [wallet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // No wallets yet
  if (wallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to Alice Wallet</h2>
          <p className="text-muted max-w-md">
            Create a new wallet or import an existing one to get started with Alice Protocol.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href={withLang('/create', lang)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Wallet
          </Link>
          <Link href={withLang('/import', lang)} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" /> Import
          </Link>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return <p className="text-muted">Select a wallet from the sidebar.</p>;
  }

  const totalPages = Math.ceil(txns.length / PAGE_SIZE);
  const pagedTxns = txns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Balance card */}
      <div className="card bg-gradient-to-br from-primary/10 to-card">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted">Balance</span>
          <button onClick={fetchData} className="text-muted hover:text-foreground" disabled={loadingBalance}>
            <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="text-3xl font-bold mb-4">
          {loadingBalance ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted" />
          ) : balanceError ? (
            <span className="text-danger text-base">Failed to load balance</span>
          ) : balance !== null ? (
            <>{formatBalance(balance)} <span className="text-lg text-muted font-normal">ALICE</span></>
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-muted" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-mono truncate">{wallet.address}</span>
          <button onClick={copyAddress} className="shrink-0 hover:text-foreground">
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick action */}
      <Link href={withLang('/send', lang)} className="card card-hover flex items-center gap-3 cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">Send</div>
          <div className="text-xs text-muted">Transfer ALICE</div>
        </div>
      </Link>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Transactions</h3>
          {loadingTxns && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
        </div>
        <div className="card p-0 divide-y divide-border overflow-hidden">
          {loadingTxns ? (
            <div className="p-6 flex items-center justify-center gap-2 text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading transactions...
            </div>
          ) : txnsError ? (
            <div className="p-6 text-center text-danger text-sm">Failed to load transactions</div>
          ) : txns.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">No transactions found</div>
          ) : (
            pagedTxns.map((tx, i) => {
              const isSend = tx.from_address === wallet.address;
              return (
                <div key={`${tx.extrinsic_hash}-${tx.event_index}-${i}`} className="flex items-center gap-3 p-4 hover:bg-card-hover transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isSend ? 'bg-danger/15' : 'bg-accent/15'
                  }`}>
                    {isSend
                      ? <ArrowUpRight className="w-4 h-4 text-danger" />
                      : <ArrowDownLeft className="w-4 h-4 text-accent" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {isSend ? 'Sent' : 'Received'}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {isSend
                        ? `To: ${shortAddress(tx.to_address || '')}`
                        : `From: ${shortAddress(tx.from_address || '')}`
                      }
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${isSend ? 'text-danger' : 'text-accent'}`}>
                      {isSend ? '-' : '+'}{tx.amount ? formatAlice(tx.amount) : '0'} ALICE
                    </div>
                    <div className="text-xs text-muted">
                      {formatTimestamp(tx.timestamp_ms)}
                    </div>
                  </div>
                  <a
                    href={`https://aliceprotocol.org/explorer.html?hash=${tx.extrinsic_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-primary shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-outline py-1.5 px-3 text-sm flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-muted">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-outline py-1.5 px-3 text-sm flex items-center gap-1 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
