/**
 * Polkadot.js chain interaction module for Alice Protocol.
 * Handles balance queries, transfers, and staking operations.
 */

const SS58_FORMAT = 300;
const DEFAULT_RPC = 'wss://rpc.aliceprotocol.org';
const UNIT = BigInt(10) ** BigInt(12);

type ApiPromise = import('@polkadot/api').ApiPromise;
type KeyringPair = import('@polkadot/keyring/types').KeyringPair;

let cachedApi: ApiPromise | null = null;
let cachedRpc: string = '';

export async function getApi(rpcUrl: string = DEFAULT_RPC): Promise<ApiPromise> {
  if (cachedApi && cachedRpc === rpcUrl && cachedApi.isConnected) {
    return cachedApi;
  }

  if (cachedApi) {
    try { await cachedApi.disconnect(); } catch { /* ignore */ }
    cachedApi = null;
  }

  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  const provider = new WsProvider(rpcUrl);
  const api = await ApiPromise.create({ provider });
  cachedApi = api;
  cachedRpc = rpcUrl;
  return api;
}

export async function disconnectApi(): Promise<void> {
  if (cachedApi) {
    try { await cachedApi.disconnect(); } catch { /* ignore */ }
    cachedApi = null;
  }
}

export function createKeypairFromSeed(seed: Uint8Array): Promise<KeyringPair> {
  return import('@polkadot/keyring').then(({ Keyring }) => {
    const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
    return keyring.addFromSeed(seed);
  });
}

// --- Balance ---

export async function getBalance(address: string, rpcUrl?: string): Promise<{
  free: bigint;
  reserved: bigint;
  frozen: bigint;
}> {
  const api = await getApi(rpcUrl);
  const result = await api.query.system.account(address);
  const data = (result as unknown as { data: { free: { toBigInt: () => bigint }; reserved: { toBigInt: () => bigint }; frozen: { toBigInt: () => bigint } } }).data;
  return {
    free: data.free.toBigInt(),
    reserved: data.reserved.toBigInt(),
    frozen: data.frozen.toBigInt(),
  };
}

export function formatBalance(raw: bigint): string {
  const whole = raw / UNIT;
  const frac = raw % UNIT;
  const fracStr = frac.toString().padStart(12, '0').slice(0, 4);
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function parseAmount(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  let frac = BigInt(0);
  if (parts[1]) {
    const fracStr = parts[1].padEnd(12, '0').slice(0, 12);
    frac = BigInt(fracStr);
  }
  return whole * UNIT + frac;
}

// --- Transfer ---

export async function transfer(
  seed: Uint8Array,
  to: string,
  amount: bigint,
  rpcUrl?: string,
): Promise<string> {
  const api = await getApi(rpcUrl);
  const keypair = await createKeypairFromSeed(seed);

  return new Promise((resolve, reject) => {
    api.tx.balances
      .transferAllowDeath(to, amount)
      .signAndSend(keypair, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
        if (status.isInBlock) {
          resolve(status.asInBlock.toHex());
        }
      })
      .catch(reject);
  });
}

// --- Staking ---

function endpointToHex(endpoint: string): string {
  return '0x' + Array.from(new TextEncoder().encode(endpoint))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function decodeEndpoint(raw: unknown): string {
  if (!raw) return '';
  try {
    const hexStr = String(raw).startsWith('0x') ? String(raw).slice(2) : String(raw);
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return String(raw);
  }
}

function decodeStatus(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    return Object.keys(raw)[0] || 'Unknown';
  }
  return String(raw);
}

export interface StakeInfo {
  stake: number;
  status: string;
  endpoint: string;
}

export async function getStakeStatus(address: string, rpcUrl?: string): Promise<{
  balance: number;
  scorer: StakeInfo | null;
  aggregator: StakeInfo | null;
}> {
  const api = await getApi(rpcUrl);
  const unitNum = Number(UNIT);

  // Balance
  const acct = await api.query.system.account(address);
  const acctData = (acct as unknown as { data: { free: { toBigInt: () => bigint } } }).data;
  const balance = Number(acctData.free.toBigInt()) / unitNum;

  // Scorer stakes
  let scorer: StakeInfo | null = null;
  try {
    const scorerRaw = await (api.query as Record<string, Record<string, (addr: string) => Promise<{ value?: Record<string, unknown>; isEmpty?: boolean }>>>)
      .proofOfGradient.scorerStakes(address);
    if (scorerRaw && !scorerRaw.isEmpty) {
      const v = scorerRaw.value || (scorerRaw as unknown as { toJSON: () => Record<string, unknown> }).toJSON?.();
      if (v) {
        scorer = {
          stake: Number(BigInt(String(v.staked || 0))) / unitNum,
          status: decodeStatus(v.status),
          endpoint: decodeEndpoint(v.endpoint),
        };
      }
    }
  } catch { /* pallet may not exist */ }

  // Aggregator stakes
  let aggregator: StakeInfo | null = null;
  try {
    const aggRaw = await (api.query as Record<string, Record<string, (addr: string) => Promise<{ value?: Record<string, unknown>; isEmpty?: boolean }>>>)
      .proofOfGradient.aggregatorStakes(address);
    if (aggRaw && !aggRaw.isEmpty) {
      const v = aggRaw.value || (aggRaw as unknown as { toJSON: () => Record<string, unknown> }).toJSON?.();
      if (v) {
        aggregator = {
          stake: Number(BigInt(String(v.staked || 0))) / unitNum,
          status: decodeStatus(v.status),
          endpoint: decodeEndpoint(v.endpoint),
        };
      }
    }
  } catch { /* pallet may not exist */ }

  return { balance, scorer, aggregator };
}

export async function stakeAsScorer(
  seed: Uint8Array,
  amount: number,
  endpoint: string,
  rpcUrl?: string,
): Promise<string> {
  const api = await getApi(rpcUrl);
  const keypair = await createKeypairFromSeed(seed);
  const amountRaw = BigInt(amount) * UNIT;

  return new Promise((resolve, reject) => {
    (api.tx as Record<string, Record<string, (...args: unknown[]) => { signAndSend: (kp: KeyringPair, cb: (result: { status: { isInBlock: boolean; asInBlock: { toHex: () => string } }; dispatchError?: unknown }) => void) => Promise<() => void> }>>)
      .proofOfGradient.stakeAsScorer(amountRaw, endpointToHex(endpoint))
      .signAndSend(keypair, ({ status, dispatchError }) => {
        if (dispatchError) reject(new Error(String(dispatchError)));
        if (status.isInBlock) resolve(status.asInBlock.toHex());
      })
      .catch(reject);
  });
}

export async function stakeAsAggregator(
  seed: Uint8Array,
  amount: number,
  endpoint: string,
  rpcUrl?: string,
): Promise<string> {
  const api = await getApi(rpcUrl);
  const keypair = await createKeypairFromSeed(seed);
  const amountRaw = BigInt(amount) * UNIT;

  return new Promise((resolve, reject) => {
    (api.tx as Record<string, Record<string, (...args: unknown[]) => { signAndSend: (kp: KeyringPair, cb: (result: { status: { isInBlock: boolean; asInBlock: { toHex: () => string } }; dispatchError?: unknown }) => void) => Promise<() => void> }>>)
      .proofOfGradient.stakeAsAggregator(amountRaw, endpointToHex(endpoint))
      .signAndSend(keypair, ({ status, dispatchError }) => {
        if (dispatchError) reject(new Error(String(dispatchError)));
        if (status.isInBlock) resolve(status.asInBlock.toHex());
      })
      .catch(reject);
  });
}

export async function unstakeScorer(seed: Uint8Array, rpcUrl?: string): Promise<string> {
  const api = await getApi(rpcUrl);
  const keypair = await createKeypairFromSeed(seed);

  return new Promise((resolve, reject) => {
    (api.tx as Record<string, Record<string, () => { signAndSend: (kp: KeyringPair, cb: (result: { status: { isInBlock: boolean; asInBlock: { toHex: () => string } }; dispatchError?: unknown }) => void) => Promise<() => void> }>>)
      .proofOfGradient.unstakeScorer()
      .signAndSend(keypair, ({ status, dispatchError }) => {
        if (dispatchError) reject(new Error(String(dispatchError)));
        if (status.isInBlock) resolve(status.asInBlock.toHex());
      })
      .catch(reject);
  });
}

export async function unstakeAggregator(seed: Uint8Array, rpcUrl?: string): Promise<string> {
  const api = await getApi(rpcUrl);
  const keypair = await createKeypairFromSeed(seed);

  return new Promise((resolve, reject) => {
    (api.tx as Record<string, Record<string, () => { signAndSend: (kp: KeyringPair, cb: (result: { status: { isInBlock: boolean; asInBlock: { toHex: () => string } }; dispatchError?: unknown }) => void) => Promise<() => void> }>>)
      .proofOfGradient.unstakeAggregator()
      .signAndSend(keypair, ({ status, dispatchError }) => {
        if (dispatchError) reject(new Error(String(dispatchError)));
        if (status.isInBlock) resolve(status.asInBlock.toHex());
      })
      .catch(reject);
  });
}
