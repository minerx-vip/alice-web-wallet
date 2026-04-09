'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/store';
import { fetchHistory } from '@/lib/indexer';
import { shortAddress, formatAlice, formatTimestamp } from '@/lib/utils';
import type { TransactionRecord } from '@/lib/types';
import AppShell from '@/components/AppShell';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getActiveLang } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';

function HistoryPage() {
  const pathname = usePathname();
  const lang = getActiveLang(pathname);
  const { wallets, activeWalletId } = useWalletStore();
  const wallet = wallets.find(w => w.id === activeWalletId);

  const [txns, setTxns] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);

  const load = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await fetchHistory(wallet.address, limit);
      setTxns(res.history.filter(t => t.entry_type === 'transfer'));
    } catch (err) {
      console.error('History error:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet, limit]);

  useEffect(() => { load(); }, [load]);

  if (!wallet) {
    return <p className="text-muted">{uiText(lang, 'settings.select_wallet_first')}</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{uiText(lang, 'history.title')}</h1>
        <button onClick={load} className="text-muted hover:text-foreground" disabled={loading}>
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && txns.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      ) : txns.length === 0 ? (
        <div className="card text-center text-muted py-12">{uiText(lang, 'history.no_transactions')}</div>
      ) : (
        <>
          <div className="card p-0 divide-y divide-border overflow-hidden">
            {txns.map((tx, i) => {
              const isSend = tx.from_address === wallet.address;
              return (
                <div key={`${tx.extrinsic_hash}-${tx.event_index}-${i}`} className="flex items-center gap-3 p-4 hover:bg-card-hover transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isSend ? 'bg-danger/15' : 'bg-accent/15'
                  }`}>
                    {isSend
                      ? <ArrowUpRight className="w-5 h-5 text-danger" />
                      : <ArrowDownLeft className="w-5 h-5 text-accent" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{isSend ? uiText(lang, 'history.sent') : uiText(lang, 'history.received')}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${tx.success ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}>
                        {tx.success ? uiText(lang, 'history.success') : uiText(lang, 'history.failed')}
                      </span>
                    </div>
                    <div className="text-xs text-muted truncate mt-0.5">
                      {isSend
                        ? `${uiText(lang, 'history.to')} ${shortAddress(tx.to_address || '', 8)}`
                        : `${uiText(lang, 'history.from')} ${shortAddress(tx.from_address || '', 8)}`
                      }
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {uiText(lang, 'history.block')}{tx.block_number.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${isSend ? 'text-danger' : 'text-accent'}`}>
                      {isSend ? '-' : '+'}{tx.amount ? formatAlice(tx.amount) : '0'} ALICE
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {formatTimestamp(tx.timestamp_ms)}
                    </div>
                  </div>
                  <a
                    href={`https://aliceprotocol.org/explorer.html?hash=${tx.extrinsic_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-primary shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>

          {txns.length >= limit && (
            <button
              onClick={() => setLimit(l => l + 50)}
              className="btn-outline w-full mt-4"
            >
              {uiText(lang, 'history.load_more')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <HistoryPage />
    </AppShell>
  );
}
