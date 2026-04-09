'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/lib/store';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isHydrated = useWalletStore(s => s.isHydrated);
  const hydrate = useWalletStore(s => s.hydrate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  if (!mounted || !isHydrated) {
    return (
      <div className="flex items-center justify-center w-full h-screen" suppressHydrationWarning>
        <div className="text-muted animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 md:pt-6 md:p-6 lg:p-8">
        {children}
      </main>
    </>
  );
}
