export interface WalletPayloadV2 {
  version: number;
  address: string;
  public_key: string;
  encrypted_seed: string;
  encrypted_mnemonic: string;
  salt: string;
  nonce_seed: string;
  nonce_mnemonic: string;
  kdf: string;
  kdf_iterations: number;
}

export interface WalletEntry {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  payload: WalletPayloadV2;
  createdAt: number;
}

export interface DecryptedWallet {
  seed: Uint8Array;
  mnemonic: string | null;
  address: string;
  publicKey: string;
}

export interface TransactionRecord {
  block_number: number;
  extrinsic_index: number;
  event_index: number | null;
  extrinsic_hash: string;
  signer: string;
  module: string;
  call: string;
  success: boolean;
  timestamp_ms: number;
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  entry_type: string;
}

export interface HistoryResponse {
  address: string;
  history: TransactionRecord[];
  source: string;
}

export interface StakeInfo {
  stake: number;
  status: string;
  endpoint: string;
}

export interface StakeStatus {
  balance: number;
  scorer: StakeInfo | null;
  aggregator: StakeInfo | null;
}
