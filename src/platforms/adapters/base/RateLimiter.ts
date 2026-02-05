type Window = { start: number; count: number; limit: number; intervalMs: number };

export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(private defaults: Record<string, { limit: number; intervalMs: number }>) {}

  private key(platformId: string) {
    return platformId.toLowerCase();
  }

  canProceed(platformId: string): boolean {
    const k = this.key(platformId);
    const def = this.defaults[k];
    if (!def) return true;
    const now = Date.now();
    const w = this.windows.get(k);
    if (!w || now - w.start >= def.intervalMs) {
      this.windows.set(k, { start: now, count: 0, limit: def.limit, intervalMs: def.intervalMs });
      return true;
    }
    return w.count < w.limit;
  }

  record(platformId: string) {
    const k = this.key(platformId);
    const def = this.defaults[k];
    if (!def) return;
    const w = this.windows.get(k);
    if (!w) {
      this.windows.set(k, { start: Date.now(), count: 1, limit: def.limit, intervalMs: def.intervalMs });
    } else {
      w.count += 1;
      this.windows.set(k, w);
    }
  }
}
