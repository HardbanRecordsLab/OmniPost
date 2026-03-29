import { SmartLauncherAdapter } from '../../../src/platforms/adapters/base/SmartLauncherAdapter';
import { PlatformConfig } from '../../../src/platforms/adapters/PlatformRegistry';
import { Post } from '../../../src/types';

export interface LaunchResult {
  platform: string;
  status: 'launched';
  message: string;
}

const DELAY_BETWEEN_LAUNCHES_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class SmartLauncherService {
  async launch(post: Post, platformConfig: PlatformConfig): Promise<LaunchResult> {
    const adapter = new SmartLauncherAdapter(platformConfig);
    await adapter.publish(post);
    return {
      platform: platformConfig.id,
      status: 'launched',
      message: `Launched ${platformConfig.displayName}: content copied to clipboard and browser opened.`
    };
  }

  async launchMultiple(post: Post, platformConfigs: PlatformConfig[]): Promise<LaunchResult[]> {
    const results: LaunchResult[] = [];
    for (let i = 0; i < platformConfigs.length; i++) {
      if (i > 0) {
        await delay(DELAY_BETWEEN_LAUNCHES_MS);
      }
      const result = await this.launch(post, platformConfigs[i]);
      results.push(result);
    }
    return results;
  }
}
