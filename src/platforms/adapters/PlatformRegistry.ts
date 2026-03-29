import * as fs from 'fs';
import * as path from 'path';
import { PlatformAdapter } from './base/PlatformAdapter';

export interface PlatformConfig {
  id: string;
  displayName: string;
  baseUrl: string;
  loginUrl: string;
  postUrl: string;
  adapterType: 'puppeteer' | 'smart_launcher';
  toneCategory: 'professional' | 'casual' | 'provocative' | 'crypto' | 'forum' | 'short_form';
  charLimit?: number;
  category: 'standard_social' | 'adult' | 'crypto_nostr' | 'forums' | 'creator_economy';
  supportsHashtags: boolean;
  logoUrl?: string;
}

export class PlatformRegistry {
  private adapters: Map<string, PlatformAdapter> = new Map();
  private configs: Map<string, PlatformConfig> = new Map();

  constructor() {
    this._loadRegistryJson();
  }

  private _loadRegistryJson(): void {
    try {
      const registryPath = path.resolve(__dirname, '../../registry.json');
      if (fs.existsSync(registryPath)) {
        const raw = fs.readFileSync(registryPath, 'utf-8');
        const entries: PlatformConfig[] = JSON.parse(raw);
        for (const entry of entries) {
          const validation = this.validateConfig(entry);
          if (validation.valid) {
            this.configs.set(entry.id.toLowerCase(), entry);
          }
        }
      }
    } catch {
      // Registry JSON is optional; silently skip on error
    }
  }

  // Adapter registration (existing)
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

  // Config registration
  validateConfig(config: PlatformConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.id || config.id.trim() === '') errors.push('id is required');
    if (!config.displayName || config.displayName.trim() === '') errors.push('displayName is required');
    if (!config.baseUrl || config.baseUrl.trim() === '') errors.push('baseUrl is required');
    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, errors: [] };
  }

  registerConfig(config: PlatformConfig): void {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid platform config: ${validation.errors.join(', ')}`);
    }
    this.configs.set(config.id.toLowerCase(), config);
  }

  getConfig(platformId: string): PlatformConfig | undefined {
    return this.configs.get(platformId.toLowerCase());
  }

  listByCategory(category: string): PlatformConfig[] {
    return Array.from(this.configs.values()).filter(c => c.category === category);
  }

  listAll(): PlatformConfig[] {
    return Array.from(this.configs.values());
  }
}
