
import { randomUUID } from 'crypto';
import db, { queries } from '../db.ts';
import { PostStatus } from '../types.ts';

async function runTest() {
  console.log('--- Starting Scheduler Integration Test ---');

  const successPostId = randomUUID();
  const failPostId = randomUUID();
  const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 min ago

  // 1. Insert Test Posts
  console.log('1. Inserting test posts...');
  
  try {
    queries.insertPost.run({
      id: successPostId,
      platformId: 'twitter',
      campaignId: null,
      content: 'Integration Test: Success Post ' + new Date().toISOString(),
      mediaUrl: null,
      status: PostStatus.SCHEDULED,
      scheduledAt: pastDate
    });

    queries.insertPost.run({
      id: failPostId,
      platformId: 'twitter',
      campaignId: null,
      content: 'Integration Test: fail_twitter ' + new Date().toISOString(),
      mediaUrl: null,
      status: PostStatus.SCHEDULED,
      scheduledAt: pastDate
    });

    console.log(`   Inserted Success Post: ${successPostId}`);
    console.log(`   Inserted Fail Post:    ${failPostId}`);

  } catch (err) {
    console.error('Failed to insert posts:', err);
    process.exit(1);
  }

  // 2. Monitor Loop
  console.log('2. Waiting for Scheduler (max 70s)...');
  
  let successFinal = false;
  let failFinal = false;
  const startTime = Date.now();

  while (Date.now() - startTime < 70000) {
    const p1 = queries.getPostById.get(successPostId) as any;
    const p2 = queries.getPostById.get(failPostId) as any;

    console.log(`[${Math.floor((Date.now() - startTime) / 1000)}s] SuccessPost: ${p1?.status} | FailPost: ${p2?.status} (Retry: ${p2?.retry_count})`);

    if (p1?.status === PostStatus.PUBLISHED) successFinal = true;
    
    // Fail post should retry. It might stay 'scheduled' with retry_count > 0, or eventually 'failed'
    // The worker sets it back to 'scheduled' if retries < 3.
    // For this test, seeing retry_count increase is good enough proof of loop.
    if (p2?.status === PostStatus.FAILED || p2?.retry_count > 0) failFinal = true;

    if (successFinal && failFinal) {
      console.log('\n--- Test Passed! ---');
      console.log(`Success Post ended as: ${p1.status}`);
      console.log(`Fail Post ended as:    ${p2.status} (Retry: ${p2.retry_count})`);
      process.exit(0);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n--- Test Timed Out ---');
  console.log('Scheduler might not be running or interval is too long.');
  process.exit(1);
}

runTest();
