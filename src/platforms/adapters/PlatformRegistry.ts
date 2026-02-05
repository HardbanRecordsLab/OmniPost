import { PlatformAdapter } from './base/PlatformAdapter';

export class PlatformRegistry {
  private adapters: Map<string, PlatformAdapter> = new Map();

  register(platformId: string, adapter: PlatformAdapter) {
    this.adapters.set(platformId.toLowerCase(), adapter);
  }

  get(platformId: string): PlatformAdapter | undefined {
    return this.adapters.get(platformId.toLowerCase());
  }

  has(platformId: string): boolean {
    return this.adapters.has(platformId.toLowerCase());
  }

  isEnabled(): boolean {
    const flag = process.env.USE_NEW_PLATFORM_ADAPTERS;
    return String(flag).toLowerCase() === 'true';
  }
}
