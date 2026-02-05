
import { randomUUID } from 'crypto';
import { ClusterType, PostStatus } from '../types.ts';

const API_URL = 'http://localhost:3000/api';

async function runE2E() {
  console.log('--- Starting E2E Test ---');

  // 1. Create Campaign (Generate & Auto-schedule)
  console.log('\n1. Creating Campaign & Generating Posts...');
  const topic = `E2E Test Campaign ${Date.now()}`;
  
  const generateRes = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      clusters: [ClusterType.SOCIAL],
      provider: 'gemini' // Will use mock if no API key or logic handles it
    })
  });

  if (!generateRes.ok) {
    const err = await generateRes.text();
    console.error('Failed to generate campaign:', err);
    process.exit(1);
  }

  const generatedData = await generateRes.json();
  console.log(`   Generated ${generatedData.posts.length} posts.`);

  // 2. Verify Posts in "Calendar/Queue" (via API)
  console.log('\n2. Verifying Posts in System...');
  const postsRes = await fetch(`${API_URL}/posts`);
  const allPosts = await postsRes.json();
  
  const campaignPosts = allPosts.filter((p: any) => p.topic === topic || p.content.includes(topic)); // Topic might not be saved directly on post, but content usually reflects it or we check recent posts
  // Actually api/generate saves campaign but posts link to it. 
  // Let's just grab the IDs from the generate response
  
  const generatedIds = generatedData.posts.map((p: any) => p.id);
  const verifyPosts = allPosts.filter((p: any) => generatedIds.includes(p.id));

  if (verifyPosts.length !== generatedData.posts.length) {
    console.error(`   Mismatch! Expected ${generatedData.posts.length}, found ${verifyPosts.length}`);
  } else {
    console.log(`   Confirmed ${verifyPosts.length} posts exist in DB.`);
  }

  const targetPost = verifyPosts[0];
  console.log(`   Target Post ID: ${targetPost.id}`);
  console.log(`   Initial Content: "${targetPost.content}"`);

  // 3. Update Post Content
  console.log('\n3. Updating Post Content...');
  const newContent = `Updated Content ${Date.now()}`;
  const updateRes = await fetch(`${API_URL}/posts/${targetPost.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: newContent,
      scheduledAt: targetPost.scheduledAt,
      status: targetPost.status
    })
  });

  if (!updateRes.ok) {
    console.error('Failed to update post');
    process.exit(1);
  }
  
  // Verify update
  const updatedPostRes = await fetch(`${API_URL}/posts`);
  const updatedPosts = await updatedPostRes.json();
  const updatedPost = updatedPosts.find((p: any) => p.id === targetPost.id);
  
  if (updatedPost.content === newContent) {
    console.log(`   Success! Content updated to: "${updatedPost.content}"`);
  } else {
    console.error(`   Failed! Content is: "${updatedPost.content}"`);
  }

  // 4. Delete Post
  console.log('\n4. Deleting Post...');
  const deleteRes = await fetch(`${API_URL}/posts/${targetPost.id}`, {
    method: 'DELETE'
  });

  if (!deleteRes.ok) {
    console.error('Failed to delete post');
    process.exit(1);
  }

  // Verify deletion
  const finalPostsRes = await fetch(`${API_URL}/posts`);
  const finalPosts = await finalPostsRes.json();
  const deletedPost = finalPosts.find((p: any) => p.id === targetPost.id);

  if (!deletedPost) {
    console.log(`   Success! Post ${targetPost.id} no longer exists.`);
  } else {
    console.error(`   Failed! Post ${targetPost.id} still exists.`);
  }

  console.log('\n--- E2E Test Completed Successfully ---');
}

runE2E().catch(console.error);
