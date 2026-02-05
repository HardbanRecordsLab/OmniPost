
import { queries } from './db';
import { processPost } from './worker';
import type { Post } from '../types';

export function startScheduler() {
  // Initial check on startup
  checkAndSchedule();

  setInterval(async () => {
    checkAndSchedule();
  }, 60000);
}

function checkAndSchedule() {
  const duePosts = queries.getDuePosts.all() as Post[];
  
  if (duePosts.length === 0) return;
  
  for (const post of duePosts) {
    // Optimistic lock: Mark as publishing so other workers (if any) don't grab it
    queries.markAsPublishing.run(post.id);
    
    // Execute in background (fire and forget for the loop, but worker handles it)
    processPost(post);
  }
}
