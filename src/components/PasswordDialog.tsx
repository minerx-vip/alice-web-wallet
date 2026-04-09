'use client';

import { useState } from 'react';
import { Lock, X, Loader2 } from 'lucide-react';

interface PasswordDialogProps {
  open: boolean;
  title?: string;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
}

export default function PasswordDialog({ open, title = 'Unlock Wallet', onSubmit, onCancel }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {title}
          </h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter wallet password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full mb-3"
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="text-danger text-sm mb-3">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="btn-outline" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading || !password}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
