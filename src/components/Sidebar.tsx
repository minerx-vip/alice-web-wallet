'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wallet, Send, Settings,
  Plus, Download, LogOut, LayoutDashboard, Pencil, Check, Menu, X,
  // Landmark,  // Staking - temporarily disabled
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { shortAddress } from '@/lib/utils';
import { getLangFromPathname, setStoredLang, switchLangPath, withLang } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/send', label: 'Transfer', icon: Send },
  // { href: '/staking', label: 'Staking', icon: Landmark },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const lang = getLangFromPathname(pathname);
  const wallets = useWalletStore(s => s.wallets);
  const activeWalletId = useWalletStore(s => s.activeWalletId);
  const unlockedSeed = useWalletStore(s => s.unlockedSeed);
  const setActiveWallet = useWalletStore(s => s.setActiveWallet);
  const lock = useWalletStore(s => s.lock);
  const renameWallet = useWalletStore(s => s.renameWallet);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const startEdit = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      renameWallet(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Alice Wallet
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = lang === 'en' ? 'zh-CN' : 'en';
              setStoredLang(next);
              router.push(switchLangPath(pathname, next));
            }}
            className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-foreground hover:bg-card-hover"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Wallets list - always visible */}
      <div className="p-3 border-b border-border space-y-1 overflow-y-auto max-h-[40vh]">
        {wallets.map(w => (
          <div
            key={w.id}
            onClick={() => { setActiveWallet(w.id); if (pathname !== withLang('/', lang)) router.push(withLang('/', lang)); }}
            className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
              w.id === activeWalletId
                ? 'bg-primary/15 border border-primary/30'
                : 'hover:bg-card-hover'
            }`}
          >
            {editingId === w.id ? (
              <div className="flex items-center gap-1">
                <input
                  ref={editRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={saveEdit}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm px-1.5 py-0.5 rounded bg-card border border-primary/40"
                />
                <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-accent shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 group">
                <div className="font-medium truncate">{w.name}</div>
                <button
                  onClick={(e) => startEdit(w.id, w.name, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground shrink-0 transition-opacity"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="text-xs text-muted truncate mt-0.5">{shortAddress(w.address)}</div>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Link href={withLang('/create', lang)} className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-xs text-primary hover:bg-card-hover">
            <Plus className="w-3.5 h-3.5" /> Create
          </Link>
          <Link href={withLang('/import', lang)} className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-xs text-primary hover:bg-card-hover">
            <Download className="w-3.5 h-3.5" /> Import
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(item => {
          const href = withLang(item.href, lang);
          const isActive = pathname === href;
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:text-foreground hover:bg-card-hover'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Lock button */}
      {unlockedSeed && (
        <div className="p-3 border-t border-border">
          <button
            onClick={lock}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-card-hover"
          >
            <LogOut className="w-4 h-4" /> Lock Wallet
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-border flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Alice Wallet
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = lang === 'en' ? 'zh-CN' : 'en';
              setStoredLang(next);
              router.push(switchLangPath(pathname, next));
            }}
            className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-foreground hover:bg-card-hover"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-foreground">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <aside
            className="w-72 bg-sidebar flex flex-col h-full"
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-border flex-col h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
