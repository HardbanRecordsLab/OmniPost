import { getRegistry, getAdapter } from '../../src/platforms/adapters/AdapterLoader';
import { PostStatus, Post } from '../../types';

globalThis.fetch = async () => ({ ok: true }) as any;

process.env.X_ACCESS_TOKEN = 'token';
process.env.X_API_URL = 'http://localhost/mock';

function makePost(): Post {
  return {
    id: 'p1',
    content: 'Hello world',
    status: PostStatus.DRAFT,
    scheduledAt: new Date().toISOString(),
    platformIds: [],
    mediaUrls: []
  };
}

async function run() {
  process.env.USE_NEW_PLATFORM_ADAPTERS = 'false';
  let reg = getRegistry();
  console.log('FLAG=false registry:', !!reg);

  process.env.USE_NEW_PLATFORM_ADAPTERS = 'true';
  reg = getRegistry();
  console.log('FLAG=true registry:', !!reg);

  const twitter = getAdapter('twitter');
  if (!twitter) {
    console.log('Adapter not found');
    process.exit(1);
  }

  const post = makePost();
  post.content = 'Short tweet';

  // Simulate hitting rate limit
  let ok = 0, fail = 0;
  for (let i = 0; i < 305; i++) {
    try {
      const r = await twitter.publish(post);
      if (r?.externalId) ok++;
    } catch (e: any) {
      if (e?.code === 368) fail++;
    }
  }

  console.log(`Twitter publish ok=${ok} fail=${fail}`);
  if (ok === 0 || fail === 0) process.exit(1);
}

run();
