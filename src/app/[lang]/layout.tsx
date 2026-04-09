import type { ReactNode } from 'react';
import type { AppLang } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams(): Array<{ lang: AppLang }> {
  return [{ lang: 'en' }, { lang: 'zh-CN' }];
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
