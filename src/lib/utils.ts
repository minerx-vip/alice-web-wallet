export function shortAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function formatAlice(rawAmount: string | bigint | number): string {
  const val = BigInt(String(rawAmount));
  const unit = BigInt(10) ** BigInt(12);
  const whole = val / unit;
  const frac = val % unit;
  const absFrac = frac < BigInt(0) ? -frac : frac;
  const fracStr = absFrac.toString().padStart(12, '0').slice(0, 4);
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
