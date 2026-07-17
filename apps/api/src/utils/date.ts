/** Converts "30d" / "15m" / "24h" style duration strings into a future Date. */
export function durationToDate(duration: string): Date {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const [, amountStr, unit] = match;
  const amount = Number(amountStr);
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + amount * multipliers[unit]);
}
