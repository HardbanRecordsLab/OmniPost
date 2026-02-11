const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
    },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  async getPosts() {
    return request('/api/posts');
  },
  async updatePost(id: string, data: { content: string; scheduledAt?: string; status?: string; platformIds?: string[] }) {
    return request(`/api/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async createPost(data: { content: string; scheduledAt?: string; status?: string; platformIds?: string[]; mediaUrls?: string[]; }) {
    return request('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async deletePost(id: string) {
    return request(`/api/posts/${id}`, {
      method: 'DELETE'
    });
  },
  async getPlatforms() {
    return request('/api/platforms');
  },
  async getWindows() {
    return request('/api/windows');
  },
  async upsertWindow(data: { platformId: string; startHour: number; endHour: number; enabled?: number; minGapMinutes?: number }) {
    return request('/api/windows', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async updateWindow(platformId: string, data: { startHour: number; endHour: number; enabled?: number; minGapMinutes?: number }) {
    return request(`/api/windows/${platformId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async batchUpdatePosts(data: { ids: string[]; setPlatformIds?: string[]; shiftByMinutes?: number; setScheduledAt?: string }) {
    return request('/api/posts/batch', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  async batchDeletePosts(ids: string[]) {
    return request('/api/posts/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  },
  async togglePlatform(id: string, status?: 'enabled' | 'disabled') {
    return request('/api/platforms/toggle', {
      method: 'POST',
      body: JSON.stringify({ id, status })
    });
  },
  async getSettings() {
    return request('/api/settings');
  },
  async getPlans() {
    return request('/api/plans');
  },
  async getLicenseStatus() {
    return request('/api/license/status');
  },
  async activateTrial(data?: { months?: number; planId?: string }) {
    return request('/api/license/trial', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },
  async activateLicense(key: string, months?: number, planId?: string) {
    return request('/api/license/activate', {
      method: 'POST',
      body: JSON.stringify({ key, months, planId })
    });
  },
  async getPublishLogs() {
    return request('/api/logs/publish');
  },
  async updateSettings(data: Record<string, string>) {
    return request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async generate(data: { topic: string; clusters: string[]; provider?: 'gemini' | 'grok' }) {
    return request('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async getCampaigns() {
    return request('/api/campaigns');
  },
  async createCampaign(data: any) {
    return request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async updateCampaign(id: string, data: any) {
    return request(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async deleteCampaign(id: string) {
    return request(`/api/campaigns/${id}`, {
      method: 'DELETE'
    });
  }
};
