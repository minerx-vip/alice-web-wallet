'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { decryptWalletPayload, createWalletPayload } from '@/lib/crypto';
import { shortAddress } from '@/lib/utils';
import AppShell from '@/components/AppShell';
import PasswordDialog from '@/components/PasswordDialog';
import { usePathname } from 'next/navigation';
import { getActiveLang } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';
import {
  Loader2, Eye, EyeOff, Copy, Check, Trash2,
  Key, Shield, Edit3, Download, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

function SettingsPage() {
  const pathname = usePathname();
  const lang = getActiveLang(pathname);
  const {
    wallets, activeWalletId, unlockedSeed, unlockedMnemonic,
    unlock, lock, removeWallet, renameWallet, updateWalletPayload,
  } = useWalletStore();
  const wallet = wallets.find(w => w.id === activeWalletId);

  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwDialogAction, setPwDialogAction] = useState<'unlock' | 'export' | 'changePassword'>('unlock');

  // Export mnemonic
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [mnemonicCountdown, setMnemonicCountdown] = useState(0);

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Rename
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Copied
  const [copied, setCopied] = useState(false);

  const handleUnlock = async (password: string) => {
    if (!wallet) return;
    const result = await decryptWalletPayload(wallet.payload, password);
    unlock(result.seed, result.mnemonic);
    setShowPwDialog(false);
    toast.success(uiText(lang, 'toast.wallet_unlocked'));

    if (pwDialogAction === 'export') {
      if (result.mnemonic) {
        setMnemonicWords(result.mnemonic.split(' '));
        setShowMnemonic(true);
        // Auto-hide after 60s
        setMnemonicCountdown(60);
        const interval = setInterval(() => {
          setMnemonicCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setShowMnemonic(false);
              setMnemonicWords([]);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error('No mnemonic backup in this wallet');
      }
    }

    if (pwDialogAction === 'changePassword') {
      setShowChangePw(true);
    }
  };

  const handleExportMnemonic = () => {
    if (unlockedMnemonic) {
      setMnemonicWords(unlockedMnemonic.split(' '));
      setShowMnemonic(true);
      setMnemonicCountdown(60);
      const interval = setInterval(() => {
        setMnemonicCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowMnemonic(false);
            setMnemonicWords([]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPwDialogAction('export');
      setShowPwDialog(true);
    }
  };

  const handleChangePassword = async () => {
    if (!unlockedMnemonic || !wallet) {
      toast.error('Wallet must be unlocked with mnemonic backup');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPw) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      const payload = await createWalletPayload(unlockedMnemonic, newPassword);
      updateWalletPayload(wallet.id, payload);
      toast.success(uiText(lang, 'toast.password_updated'));
      setShowChangePw(false);
      setNewPassword('');
      setConfirmNewPw('');
      lock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleStartChangePw = () => {
    if (!unlockedSeed) {
      setPwDialogAction('changePassword');
      setShowPwDialog(true);
    } else {
      setShowChangePw(true);
    }
  };

  const handleRename = () => {
    if (!wallet || !editName.trim()) return;
    renameWallet(wallet.id, editName.trim());
    setEditing(false);
    toast.success(uiText(lang, 'toast.wallet_renamed'));
  };

  const handleDelete = () => {
    if (!wallet) return;
    removeWallet(wallet.id);
    setConfirmDelete(false);
    toast.success(uiText(lang, 'toast.wallet_removed'));
  };

  const handleExportJson = () => {
    if (!wallet) return;
    const json = JSON.stringify(wallet.payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-${wallet.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(uiText(lang, 'toast.wallet_json_exported'));
  };

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!wallet) {
    return <p className="text-muted">{uiText(lang, 'settings.select_wallet_first')}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{uiText(lang, 'settings.title')}</h1>

      {/* Wallet info */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="flex-1"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRename()}
              />
              <button onClick={handleRename} className="btn-primary text-sm py-1.5 px-3">{uiText(lang, 'common.save')}</button>
              <button onClick={() => setEditing(false)} className="btn-outline text-sm py-1.5 px-3">{uiText(lang, 'common.cancel')}</button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{wallet.name}</h2>
              <button
                onClick={() => { setEditName(wallet.name); setEditing(true); }}
                className="text-muted hover:text-foreground"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-mono break-all">{wallet.address}</span>
          <button onClick={copyAddress} className="shrink-0">
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-xs text-muted">
          Public Key: {shortAddress(wallet.publicKey, 10)}
        </div>
      </div>

      {/* Security */}
      <div className="card space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> {uiText(lang, 'settings.security')}</h3>

        <div className="space-y-3">
          <button onClick={handleExportMnemonic} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover text-left">
            <Key className="w-5 h-5 text-muted" />
            <div>
              <div className="text-sm font-medium">{uiText(lang, 'settings.export_mnemonic')}</div>
              <div className="text-xs text-muted">{uiText(lang, 'settings.view_recovery_phrase')}</div>
            </div>
          </button>

          <button onClick={handleStartChangePw} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover text-left">
            <Shield className="w-5 h-5 text-muted" />
            <div>
              <div className="text-sm font-medium">{uiText(lang, 'settings.change_password')}</div>
              <div className="text-xs text-muted">{uiText(lang, 'settings.update_wallet_password')}</div>
            </div>
          </button>

          <button onClick={handleExportJson} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover text-left">
            <Download className="w-5 h-5 text-muted" />
            <div>
              <div className="text-sm font-medium">{uiText(lang, 'settings.export_wallet_json')}</div>
              <div className="text-xs text-muted">{uiText(lang, 'settings.download_encrypted_wallet_file')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Show mnemonic */}
      {showMnemonic && mnemonicWords.length > 0 && (
        <div className="card border-danger/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-danger flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {uiText(lang, 'settings.mnemonic_phrase')}
            </h3>
            <span className="text-xs text-muted">{uiText(lang, 'settings.auto_hide_in')} {mnemonicCountdown}s</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {mnemonicWords.map((word, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card-hover text-sm">
                <span className="text-muted w-6 text-right">{i + 1}.</span>
                <span>{word}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(mnemonicWords.join(' '));
                toast.success(uiText(lang, 'toast.mnemonic_copied'));
              }}
              className="btn-outline flex-1 text-sm flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> {uiText(lang, 'common.copy')}
            </button>
            <button onClick={() => { setShowMnemonic(false); setMnemonicWords([]); }} className="btn-outline flex-1 text-sm">
              {uiText(lang, 'common.hide_now')}
            </button>
          </div>
        </div>
      )}

      {/* Change password form */}
      {showChangePw && (
        <div className="card space-y-4">
          <h3 className="font-semibold">{uiText(lang, 'settings.change_password')}</h3>
          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'settings.new_password')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={uiText(lang, 'settings.at_least_8')}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-muted mb-1 block">{uiText(lang, 'settings.confirm_new_password')}</label>
            <input
              type="password"
              value={confirmNewPw}
              onChange={e => setConfirmNewPw(e.target.value)}
              placeholder={uiText(lang, 'settings.repeat_new_password')}
              className="w-full"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowChangePw(false)} className="btn-outline flex-1">{uiText(lang, 'common.cancel')}</button>
            <button onClick={handleChangePassword} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={changingPw}>
              {changingPw && <Loader2 className="w-4 h-4 animate-spin" />}
              {uiText(lang, 'settings.update_password')}
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="card border-danger/20 space-y-3">
        <h3 className="font-semibold text-danger flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> {uiText(lang, 'settings.danger_zone')}
        </h3>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
            {uiText(lang, 'settings.remove_wallet')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-danger">
              {uiText(lang, 'settings.remove_wallet_warning')}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1">{uiText(lang, 'common.cancel')}</button>
              <button onClick={handleDelete} className="btn-danger flex-1">{uiText(lang, 'settings.yes_remove')}</button>
            </div>
          </div>
        )}
      </div>

      <PasswordDialog
        open={showPwDialog}
        title={
          pwDialogAction === 'export' ? uiText(lang, 'settings.enter_password_to_export_mnemonic') :
          pwDialogAction === 'changePassword' ? uiText(lang, 'settings.enter_current_password') :
          uiText(lang, 'pw.unlock_wallet')
        }
        onSubmit={handleUnlock}
        onCancel={() => setShowPwDialog(false)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  );
}
