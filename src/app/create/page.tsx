'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useWalletStore } from '@/lib/store';
import { generateMnemonic, createWalletPayload, addressFromMnemonic } from '@/lib/crypto';
import { generateId } from '@/lib/utils';
import { getLangFromPathname, withLang } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';
import AppShell from '@/components/AppShell';
import { Loader2, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function CreatePage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const { addWallet, unlock } = useWalletStore();

  const [step, setStep] = useState<'name' | 'mnemonic' | 'confirm' | 'password' | 'done'>('name');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [address, setAddress] = useState('');
  const [confirmWords, setConfirmWords] = useState<Record<number, string>>({});
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const words = mnemonic ? mnemonic.split(' ') : [];

  const handleGenerateMnemonic = async () => {
    if (!walletName.trim()) {
      setError(uiText(lang, 'create.enter_wallet_name'));
      return;
    }
    setLoading(true);
    try {
      const m = await generateMnemonic();
      setMnemonic(m);
      const info = await addressFromMnemonic(m);
      setAddress(info.address);
      // Pick 3 random indices for verification
      const indices: number[] = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * 24);
        if (!indices.includes(idx)) indices.push(idx);
      }
      setVerifyIndices(indices.sort((a, b) => a - b));
      setStep('mnemonic');
    } catch (err) {
      toast.error(uiText(lang, 'create.failed_generate_mnemonic'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMnemonic = () => {
    for (const idx of verifyIndices) {
      if (confirmWords[idx]?.trim().toLowerCase() !== words[idx].toLowerCase()) {
        setError(uiText(lang, 'create.word_incorrect', { num: idx + 1 }));
        return;
      }
    }
    setError('');
    setStep('password');
  };

  const handleCreateWallet = async () => {
    if (password.length < 8) {
      setError(uiText(lang, 'create.password_min_8'));
      return;
    }
    if (password !== confirmPw) {
      setError(uiText(lang, 'create.passwords_no_match'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await createWalletPayload(mnemonic, password);
      const { mnemonicToMiniSecret } = await import('@polkadot/util-crypto');
      const seed = mnemonicToMiniSecret(mnemonic);
      addWallet({
        id: generateId(),
        name: walletName.trim(),
        address: payload.address,
        publicKey: payload.public_key,
        payload,
        createdAt: Date.now(),
      });
      unlock(seed, mnemonic);
      setStep('done');
      toast.success(uiText(lang, 'toast.wallet_created'));
      setTimeout(() => router.push(withLang('/', lang)), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{uiText(lang, 'create.title')}</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          uiText(lang, 'create.step.name'),
          uiText(lang, 'create.step.backup'),
          uiText(lang, 'create.step.verify'),
          uiText(lang, 'create.step.password'),
        ].map((label, i) => {
          const steps = ['name', 'mnemonic', 'confirm', 'password'];
          const stepIdx = steps.indexOf(step);
          const isActive = i === stepIdx;
          const isDone = i < stepIdx || step === 'done';
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isDone ? 'bg-accent text-white' : isActive ? 'bg-primary text-white' : 'bg-card text-muted'
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted'}`}>
                {label}
              </span>
              {i < 3 && <div className="flex-1 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step: Name */}
      {step === 'name' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{uiText(lang, 'create.wallet_name')}</h2>
          <p className="text-sm text-muted">{uiText(lang, 'create.wallet_name_desc')}</p>
          <input
            type="text"
            placeholder={uiText(lang, 'create.wallet_name_placeholder')}
            value={walletName}
            onChange={e => { setWalletName(e.target.value); setError(''); }}
            className="w-full"
            autoFocus
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button onClick={handleGenerateMnemonic} className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uiText(lang, 'create.generate_mnemonic')}
          </button>
        </div>
      )}

      {/* Step: Mnemonic */}
      {step === 'mnemonic' && (
        <div className="card space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-danger">{uiText(lang, 'create.write_down_title')}</p>
              <p className="text-muted mt-1">{uiText(lang, 'create.write_down_desc')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{uiText(lang, 'create.your_mnemonic')}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMnemonic(!showMnemonic)} className="text-muted hover:text-foreground">
                {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copyMnemonic} className="text-muted hover:text-foreground">
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card-hover text-sm">
                <span className="text-muted w-6 text-right">{i + 1}.</span>
                <span className={showMnemonic ? '' : 'blur-sm select-none'}>{word}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted">{uiText(lang, 'create.address')} {address}</p>

          <button onClick={() => setStep('confirm')} className="btn-primary w-full">
            {uiText(lang, 'create.saved_mnemonic')}
          </button>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{uiText(lang, 'create.verify_backup')}</h2>
          <p className="text-sm text-muted">{uiText(lang, 'create.verify_backup_desc')}</p>

          <div className="space-y-3">
            {verifyIndices.map(idx => (
              <div key={idx}>
                <label className="text-sm text-muted mb-1 block">{uiText(lang, 'create.word_number', { num: idx + 1 })}</label>
                <input
                  type="text"
                  value={confirmWords[idx] || ''}
                  onChange={e => {
                    setConfirmWords(prev => ({ ...prev, [idx]: e.target.value }));
                    setError('');
                  }}
                  className="w-full"
                  placeholder={uiText(lang, 'create.enter_word_number', { num: idx + 1 })}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setStep('mnemonic')} className="btn-outline flex-1">{uiText(lang, 'common.back')}</button>
            <button onClick={handleConfirmMnemonic} className="btn-primary flex-1">{uiText(lang, 'create.verify')}</button>
          </div>
        </div>
      )}

      {/* Step: Password */}
      {step === 'password' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{uiText(lang, 'create.set_password')}</h2>
          <p className="text-sm text-muted">{uiText(lang, 'create.password_encrypt_desc')}</p>

          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'create.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full"
              placeholder={uiText(lang, 'settings.at_least_8')}
            />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'create.confirm_password')}</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setError(''); }}
              className="w-full"
              placeholder={uiText(lang, 'settings.repeat_new_password')}
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button onClick={handleCreateWallet} className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uiText(lang, 'create.create_wallet')}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold">{uiText(lang, 'create.wallet_created')}</h2>
          <p className="text-muted text-sm">{uiText(lang, 'create.redirecting')}</p>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <CreatePage />
    </AppShell>
  );
}
