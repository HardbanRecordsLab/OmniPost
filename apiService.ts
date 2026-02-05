
import { Post, ClusterType, Campaign, PlatformConnection } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = {
  // Health Check
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Platforms
  getPlatforms: async (): Promise<PlatformConnection[]> => {
    const res = await fetch(`${API_BASE}/platforms`);
    if (!res.ok) throw new Error('Failed to fetch platforms');
    return res.json();
  },

  updatePlatformStatus: async (id: string, isActive: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/platforms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error('Failed to update platform status');
  },

  connectPlatform: async (platformId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/platforms/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId }),
    });
    if (!res.ok) throw new Error('Failed to connect platform');
  },

  disconnectPlatform: async (platformId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/platforms/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformId }),
    });
    if (!res.ok) throw new Error('Failed to disconnect platform');
  },

  // Settings
  getSettings: async (): Promise<Record<string, string>> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings: Record<string, string>): Promise<void> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
  },

  // Posts
  getPosts: async (): Promise<Post[]> => {
    const res = await fetch(`${API_BASE}/posts`);
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  },

  createPost: async (post: Partial<Post>): Promise<Post> => {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    if (!res.ok) throw new Error('Failed to create post');
    return res.json();
  },

  deletePost: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete post');
  },

  updatePost: async (id: string, post: Partial<Post>): Promise<Post> => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    if (!res.ok) throw new Error('Failed to update post');
    return res.json();
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE}/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },

  createCampaign: async (campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });
    if (!res.ok) throw new Error('Failed to create campaign');
    return res.json();
  },

  generateCampaign: async (topic: string, clusters: ClusterType[], provider: 'gemini' | 'grok' = 'gemini') => {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, clusters, provider }),
    });
    if (!res.ok) throw new Error('Failed to generate campaign');
    return res.json();
  }
};
