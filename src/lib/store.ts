import { create } from 'zustand';
import type { WalletEntry, WalletPayloadV2 } from './types';

const STORAGE_KEY = 'alice-wallets';
const ACTIVE_KEY = 'alice-active-wallet';

interface WalletState {
  wallets: WalletEntry[];
  activeWalletId: string | null;
  unlockedSeed: Uint8Array | null;
  unlockedMnemonic: string | null;
  isHydrated: boolean;

  hydrate: () => void;
  addWallet: (entry: WalletEntry) => void;
  removeWallet: (id: string) => void;
  renameWallet: (id: string, name: string) => void;
  setActiveWallet: (id: string) => void;
  unlock: (seed: Uint8Array, mnemonic: string | null) => void;
  lock: () => void;
  getActiveWallet: () => WalletEntry | null;
  updateWalletPayload: (id: string, payload: WalletPayloadV2) => void;
}

function loadWallets(): WalletEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveWallets(wallets: WalletEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function saveActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  activeWalletId: null,
  unlockedSeed: null,
  unlockedMnemonic: null,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const wallets = loadWallets();
    let activeId = loadActiveId();
    if (activeId && !wallets.find(w => w.id === activeId)) {
      activeId = wallets.length > 0 ? wallets[0].id : null;
    }
    set({ wallets, activeWalletId: activeId, isHydrated: true });
  },

  addWallet: (entry) => {
    const wallets = [...get().wallets, entry];
    saveWallets(wallets);
    saveActiveId(entry.id);
    set({ wallets, activeWalletId: entry.id, unlockedSeed: null, unlockedMnemonic: null });
  },

  removeWallet: (id) => {
    const wallets = get().wallets.filter(w => w.id !== id);
    saveWallets(wallets);
    const newActive = get().activeWalletId === id
      ? (wallets.length > 0 ? wallets[0].id : null)
      : get().activeWalletId;
    saveActiveId(newActive);
    set({
      wallets,
      activeWalletId: newActive,
      unlockedSeed: get().activeWalletId === id ? null : get().unlockedSeed,
      unlockedMnemonic: get().activeWalletId === id ? null : get().unlockedMnemonic,
    });
  },

  renameWallet: (id, name) => {
    const wallets = get().wallets.map(w => w.id === id ? { ...w, name } : w);
    saveWallets(wallets);
    set({ wallets });
  },

  setActiveWallet: (id) => {
    saveActiveId(id);
    set({ activeWalletId: id, unlockedSeed: null, unlockedMnemonic: null });
  },

  unlock: (seed, mnemonic) => {
    set({ unlockedSeed: seed, unlockedMnemonic: mnemonic });
  },

  lock: () => {
    set({ unlockedSeed: null, unlockedMnemonic: null });
  },

  getActiveWallet: () => {
    const { wallets, activeWalletId } = get();
    return wallets.find(w => w.id === activeWalletId) ?? null;
  },

  updateWalletPayload: (id, payload) => {
    const wallets = get().wallets.map(w =>
      w.id === id ? { ...w, payload, address: payload.address, publicKey: payload.public_key } : w
    );
    saveWallets(wallets);
    set({ wallets });
  },
}));
