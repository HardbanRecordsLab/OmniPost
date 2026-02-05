import { publishWithAdapter, validateWithAdapter } from '../src/services/platformBridge';
import { PostStatus, Post } from '../types';

globalThis.fetch = async () => ({ ok: true }) as any;

function makePost(): Post {
  return {
    id: 'p1',
    content: 'Bridge test content',
    status: PostStatus.DRAFT,
    scheduledAt: new Date().toISOString(),
    platformIds: [],
    mediaUrls: []
  };
}

async function run() {
  process.env.USE_NEW_PLATFORM_ADAPTERS = 'false';
  let post = makePost();
  let v1 = validateWithAdapter('twitter', post);
  console.log('FLAG=false validate', v1);
  let p1 = await publishWithAdapter('twitter', post);
  console.log('FLAG=false publish', p1);

  process.env.USE_NEW_PLATFORM_ADAPTERS = 'true';
  process.env.X_ACCESS_TOKEN = 'token';
  process.env.X_API_URL = 'http://localhost/mock';
  process.env.IG_ACCESS_TOKEN = 'token';
  process.env.IG_API_URL = 'http://localhost/mock';

  post = makePost();
  let v2 = validateWithAdapter('twitter', post);
  console.log('FLAG=true twitter validate', v2);
  let p2 = await publishWithAdapter('twitter', post);
  console.log('FLAG=true twitter publish', p2);

  post = makePost();
  post.mediaUrls = ['https://example.com/a.jpg'];
  let v3 = validateWithAdapter('instagram', post);
  console.log('FLAG=true instagram validate', v3);
  let p3 = await publishWithAdapter('instagram', post);
  console.log('FLAG=true instagram publish', p3);
}

run();
