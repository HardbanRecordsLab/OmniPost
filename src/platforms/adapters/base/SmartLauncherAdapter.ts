import { BaseAdapter, PublishResult } from './PlatformAdapter';
import { PlatformConfig } from '../PlatformRegistry';
import { Post } from '../../../types';

export class SmartLauncherAdapter extends BaseAdapter {
  constructor(private readonly platformConfig: PlatformConfig) {
    super();
  }

  async publish(post: Post): Promise<PublishResult> {
    const clipboardy = await import('clipboardy');
    const openPkg = await import('open');

    await clipboardy.default.write(post.content);
    await openPkg.default(this.platformConfig.postUrl);

    return { externalId: 'launched' };
  }
}
