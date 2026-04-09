/**
 * Pure JS crypto implementation matching wallet.py's PBKDF2 + AES-GCM encryption.
 * Uses @noble/ciphers and @noble/hashes instead of Web Crypto API so it works
 * in non-secure contexts (HTTP + IP address).
 * Fully compatible with the CLI wallet's wallet.json format.
 */
import type { WalletPayloadV2 } from './types';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/ciphers/utils.js';

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 32;
const NONCE_BYTES = 12;
const SS58_FORMAT = 300;
const WALLET_VERSION = 2;

// --- Base64 helpers (matching Python's base64 module) ---

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function hexToUint8(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function uint8ToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Key derivation (matching wallet.py _derive_key) ---

function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Uint8Array {
  const enc = new TextEncoder();
  return pbkdf2(sha256, enc.encode(password), salt, { c: iterations, dkLen: 32 });
}

// --- Encryption (matching wallet.py _encrypt_blob) ---

function encryptBlob(
  plaintext: Uint8Array,
  key: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = randomBytes(NONCE_BYTES);
  const aes = gcm(key, nonce);
  const encrypted = aes.encrypt(plaintext);
  return {
    ciphertext: uint8ToBase64(encrypted),
    nonce: uint8ToBase64(nonce),
  };
}

// --- Decryption (matching wallet.py _decrypt_blob) ---

function decryptBlob(
  ciphertextB64: string,
  nonceB64: string,
  key: Uint8Array
): Uint8Array {
  const ciphertext = base64ToUint8(ciphertextB64);
  const nonce = base64ToUint8(nonceB64);
  const aes = gcm(key, nonce);
  return aes.decrypt(ciphertext);
}

// --- Create wallet payload (matching wallet.py create_wallet_payload_v2) ---

export async function createWalletPayload(
  mnemonic: string,
  password: string
): Promise<WalletPayloadV2> {
  const { Keyring } = await import('@polkadot/keyring');
  const { mnemonicToMiniSecret } = await import('@polkadot/util-crypto');

  const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
  const pair = keyring.addFromMnemonic(mnemonic);
  const seedBytes = mnemonicToMiniSecret(mnemonic);

  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const enc = new TextEncoder();
  const { ciphertext: encryptedSeed, nonce: nonceSeed } = await encryptBlob(seedBytes, key);
  const { ciphertext: encryptedMnemonic, nonce: nonceMnemonic } = await encryptBlob(
    enc.encode(mnemonic),
    key
  );

  return {
    version: WALLET_VERSION,
    address: pair.address,
    public_key: uint8ToHex(pair.publicKey),
    encrypted_seed: encryptedSeed,
    encrypted_mnemonic: encryptedMnemonic,
    salt: uint8ToBase64(salt),
    nonce_seed: nonceSeed,
    nonce_mnemonic: nonceMnemonic,
    kdf: 'pbkdf2-sha256',
    kdf_iterations: PBKDF2_ITERATIONS,
  };
}

// --- Decrypt wallet payload (matching wallet.py _unlock_v2) ---

export async function decryptWalletPayload(
  payload: WalletPayloadV2,
  password: string
): Promise<{ seed: Uint8Array; mnemonic: string | null }> {
  if (payload.version < 2) {
    throw new Error('Legacy wallet format not supported. Please migrate using the CLI first.');
  }

  const salt = base64ToUint8(payload.salt);
  const iterations = payload.kdf_iterations || PBKDF2_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);

  // Decrypt seed
  const seedBytes = await decryptBlob(payload.encrypted_seed, payload.nonce_seed, key);

  // Verify address matches
  const { Keyring } = await import('@polkadot/keyring');
  const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
  const pair = keyring.addFromSeed(seedBytes);

  if (pair.address !== payload.address) {
    throw new Error('Wallet address mismatch after decryption');
  }

  // Decrypt mnemonic
  let mnemonic: string | null = null;
  if (payload.encrypted_mnemonic && payload.nonce_mnemonic) {
    try {
      const dec = new TextDecoder();
      const mnemonicBytes = await decryptBlob(
        payload.encrypted_mnemonic,
        payload.nonce_mnemonic,
        key
      );
      mnemonic = dec.decode(mnemonicBytes);
    } catch {
      mnemonic = null;
    }
  }

  return { seed: seedBytes, mnemonic };
}

// --- Generate mnemonic ---

export async function generateMnemonic(): Promise<string> {
  const { mnemonicGenerate } = await import('@polkadot/util-crypto');
  return mnemonicGenerate(24);
}

// --- Validate mnemonic ---

export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  const { mnemonicValidate } = await import('@polkadot/util-crypto');
  const words = mnemonic.trim().split(/\s+/);
  if (![12, 15, 18, 21, 24].includes(words.length)) return false;
  return mnemonicValidate(mnemonic);
}

// --- Get address from mnemonic ---

export async function addressFromMnemonic(mnemonic: string): Promise<{
  address: string;
  publicKey: string;
}> {
  const { Keyring } = await import('@polkadot/keyring');
  const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
  const pair = keyring.addFromMnemonic(mnemonic);
  return {
    address: pair.address,
    publicKey: uint8ToHex(pair.publicKey),
  };
}

// --- Get address from seed ---

export async function addressFromSeed(seed: Uint8Array): Promise<{
  address: string;
  publicKey: string;
}> {
  const { Keyring } = await import('@polkadot/keyring');
  const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
  const pair = keyring.addFromSeed(seed);
  return {
    address: pair.address,
    publicKey: uint8ToHex(pair.publicKey),
  };
}

// --- Validate wallet.json format ---

export function isValidWalletPayload(data: unknown): data is WalletPayloadV2 {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === 2 &&
    typeof obj.address === 'string' &&
    typeof obj.encrypted_seed === 'string' &&
    typeof obj.salt === 'string' &&
    typeof obj.nonce_seed === 'string'
  );
}
