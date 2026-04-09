'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useWalletStore } from '@/lib/store';
import {
  validateMnemonic, createWalletPayload, addressFromMnemonic,
  decryptWalletPayload, isValidWalletPayload,
} from '@/lib/crypto';
import { generateId } from '@/lib/utils';
import type { WalletPayloadV2 } from '@/lib/types';
import { getLangFromPathname, withLang } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';
import AppShell from '@/components/AppShell';
import { Loader2, Upload, FileText, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function ImportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const { addWallet, unlock } = useWalletStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'select' | 'mnemonic' | 'json'>('select');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // JSON import state
  const [jsonPayload, setJsonPayload] = useState<WalletPayloadV2 | null>(null);
  const [jsonFilename, setJsonFilename] = useState('');
  const [jsonPassword, setJsonPassword] = useState('');
  const [jsonVerified, setJsonVerified] = useState(false);
  const [jsonDecrypted, setJsonDecrypted] = useState<{ seed: Uint8Array; mnemonic: string | null } | null>(null);

  // --- Mnemonic import ---

  const handleValidateMnemonic = async () => {
    setError('');
    const valid = await validateMnemonic(mnemonic.trim());
    if (!valid) {
      setError(uiText(lang, 'import.invalid_mnemonic'));
      return;
    }
    try {
      const info = await addressFromMnemonic(mnemonic.trim());
      setAddress(info.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : uiText(lang, 'import.failed_derive_address'));
    }
  };

  const handleImportMnemonic = async () => {
    if (!walletName.trim()) { setError(uiText(lang, 'import.enter_wallet_name')); return; }
    if (password.length < 8) { setError(uiText(lang, 'create.password_min_8')); return; }
    if (password !== confirmPw) { setError(uiText(lang, 'create.passwords_no_match')); return; }

    setLoading(true);
    setError('');
    try {
      const payload = await createWalletPayload(mnemonic.trim(), password);
      const { mnemonicToMiniSecret } = await import('@polkadot/util-crypto');
      const seed = mnemonicToMiniSecret(mnemonic.trim());
      addWallet({
        id: generateId(),
        name: walletName.trim(),
        address: payload.address,
        publicKey: payload.public_key,
        payload,
        createdAt: Date.now(),
      });
      unlock(seed, mnemonic.trim());
      toast.success(uiText(lang, 'toast.wallet_imported'));
      router.push(withLang('/', lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // --- JSON import ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonFilename(file.name);
    setError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!isValidWalletPayload(data)) {
        setError(uiText(lang, 'import.invalid_wallet_json_format'));
        return;
      }
      setJsonPayload(data);
      setAddress(data.address);
      if (!walletName) setWalletName(file.name.replace(/\.json$/, ''));
    } catch {
      setError(uiText(lang, 'import.failed_parse_json'));
    }
  };

  const handleVerifyJson = async () => {
    if (!jsonPayload || !jsonPassword) return;
    setLoading(true);
    setError('');
    try {
      const result = await decryptWalletPayload(jsonPayload, jsonPassword);
      setJsonDecrypted(result);
      setJsonVerified(true);
      toast.success(uiText(lang, 'import.password_verified_ready'));
    } catch {
      setError(uiText(lang, 'import.invalid_password_or_corrupt'));
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = () => {
    if (!jsonPayload || !walletName.trim()) {
      setError(uiText(lang, 'import.enter_wallet_name'));
      return;
    }
    addWallet({
      id: generateId(),
      name: walletName.trim(),
      address: jsonPayload.address,
      publicKey: jsonPayload.public_key,
      payload: jsonPayload,
      createdAt: Date.now(),
    });
    if (jsonDecrypted) {
      unlock(jsonDecrypted.seed, jsonDecrypted.mnemonic);
    }
    toast.success(uiText(lang, 'toast.wallet_imported'));
    router.push(withLang('/', lang));
  };

  // --- Render ---

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{uiText(lang, 'import.title')}</h1>

      {mode === 'select' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('mnemonic')}
            className="card card-hover text-left space-y-3"
          >
            <FileText className="w-8 h-8 text-primary" />
            <div className="font-semibold">{uiText(lang, 'import.mnemonic_phrase')}</div>
            <p className="text-sm text-muted">{uiText(lang, 'import.mnemonic_desc')}</p>
          </button>
          <button
            onClick={() => setMode('json')}
            className="card card-hover text-left space-y-3"
          >
            <Upload className="w-8 h-8 text-primary" />
            <div className="font-semibold">{uiText(lang, 'import.wallet_json_file')}</div>
            <p className="text-sm text-muted">{uiText(lang, 'import.wallet_json_desc')}</p>
          </button>
        </div>
      )}

      {mode === 'mnemonic' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{uiText(lang, 'import.import_from_mnemonic')}</h2>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.wallet_name')}</label>
            <input
              type="text"
              value={walletName}
              onChange={e => setWalletName(e.target.value)}
              placeholder={uiText(lang, 'import.wallet_name_placeholder')}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.mnemonic_input')}</label>
            <textarea
              value={mnemonic}
              onChange={e => { setMnemonic(e.target.value); setAddress(''); setError(''); }}
              placeholder={uiText(lang, 'import.mnemonic_placeholder')}
              className="w-full h-28 resize-none"
            />
          </div>

          {!address && mnemonic.trim().split(/\s+/).length >= 12 && (
            <button onClick={handleValidateMnemonic} className="btn-outline text-sm">
              {uiText(lang, 'import.validate_show_address')}
            </button>
          )}

          {address && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-sm">
              <span className="text-muted">{uiText(lang, 'import.address')} </span>
              <span className="font-mono">{address}</span>
            </div>
          )}

          {address && (
            <>
              <div>
                <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={uiText(lang, 'settings.at_least_8')}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.confirm_password')}</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                  placeholder={uiText(lang, 'settings.repeat_new_password')}
                  className="w-full"
                />
              </div>
            </>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setMode('select')} className="btn-outline">{uiText(lang, 'common.back')}</button>
            {address && (
              <button
                onClick={handleImportMnemonic}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uiText(lang, 'import.import_wallet')}
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'json' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{uiText(lang, 'import.import_from_wallet_json')}</h2>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-muted">{uiText(lang, 'import.only_v2_supported')}</span>
          </div>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.wallet_name')}</label>
            <input
              type="text"
              value={walletName}
              onChange={e => setWalletName(e.target.value)}
              placeholder={uiText(lang, 'import.wallet_name_placeholder')}
              className="w-full"
            />
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors"
            >
              {jsonPayload ? (
                <div className="flex items-center justify-center gap-2 text-accent">
                  <Check className="w-5 h-5" />
                  <span>{jsonFilename} — {jsonPayload.address.slice(0, 12)}...</span>
                </div>
              ) : (
                <div className="text-muted">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p>{uiText(lang, 'import.click_select_wallet_json')}</p>
                </div>
              )}
            </button>
          </div>

          {jsonPayload && !jsonVerified && (
            <div>
              <label className="text-sm text-muted mb-1 block">{uiText(lang, 'import.wallet_password')}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={jsonPassword}
                  onChange={e => { setJsonPassword(e.target.value); setError(''); }}
                  placeholder={uiText(lang, 'import.enter_wallet_password')}
                  className="flex-1"
                />
                <button
                  onClick={handleVerifyJson}
                  className="btn-primary flex items-center gap-2"
                  disabled={loading || !jsonPassword}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uiText(lang, 'import.verify')}
                </button>
              </div>
            </div>
          )}

          {jsonVerified && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-accent" />
              <span>{uiText(lang, 'import.password_verified_ready')}</span>
            </div>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setMode('select')} className="btn-outline">{uiText(lang, 'common.back')}</button>
            {jsonVerified && (
              <button onClick={handleImportJson} className="btn-primary flex-1">{uiText(lang, 'import.import_wallet')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <ImportPage />
    </AppShell>
  );
}
