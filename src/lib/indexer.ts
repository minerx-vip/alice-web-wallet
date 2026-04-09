import type { HistoryResponse } from './types';

const INDEXER_BASE = 'https://aliceprotocol.org/api/indexer';

export async function fetchHistory(
  address: string,
  limit: number = 20,
): Promise<HistoryResponse> {
  const url = `${INDEXER_BASE}/accounts/${address}/history?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Indexer error: ${res.status}`);
  return res.json();
}
