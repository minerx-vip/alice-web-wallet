'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { detectBrowserLang, getStoredLang, withLang } from '@/lib/i18n';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const preferred = getStoredLang() ?? detectBrowserLang();
    router.replace(withLang('/', preferred));
  }, [router]);

  return (
    <div className="flex items-center justify-center w-full h-screen" suppressHydrationWarning>
      <div className="text-muted animate-pulse text-lg">Loading...</div>
    </div>
  );
}
