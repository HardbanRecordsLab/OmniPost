import type { GeneratedSocialContent } from "./services/ai-service";
import { useAuth } from "@/contexts/auth-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path: string, options?: RequestInit) {
  // Get tokens from localStorage for server-side requests
  let authHeaders: Record<string, string> = {};
  
  if (typeof window !== 'undefined') {
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      const { access_token } = JSON.parse(tokens);
      authHeaders['Authorization'] = `Bearer ${access_token}`;
    }
  }
  
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {}),
      ...authHeaders
    },
    ...options
  });
  
  // Handle 401 unauthorized - try to refresh token
  if (res.status === 401 && typeof window !== 'undefined') {
    const tokens = JSON.parse(localStorage.getItem('auth_tokens') || '{}');
    if (tokens.refresh_token) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.refresh_token}`,
            ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
          }
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newTokens = { ...tokens, ...refreshData };
          localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
          
          // Retry original request with new token
          return request(path, {
            ...options,
            headers: {
              ...(options?.headers || {}),
              'Authorization': `Bearer ${newTokens.access_token}`
            }
          });
        } else {
          // Refresh failed, clear tokens and reload
          localStorage.removeItem('auth_tokens');
          localStorage.removeItem('auth_user');
          window.location.reload();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        window.location.reload();
      }
    }
  }
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  async get(path: string) {
    return request(path);
  },
  async post(path: string, data?: any) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async put(path: string, data?: any) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async delete(path: string) {
    return request(path, {
      method: 'DELETE'
    });
  },
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
  async generate(data: { topic: string; clusters: string[]; provider?: 'gemini' | 'grok' }): Promise<{ success: boolean; posts?: GeneratedSocialContent[]; error?: string }> {
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
  },
  async reschedulePost(id: string, scheduledAt: string) {
    return request(`/api/posts/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt })
    });
  },
  async getMedia(params?: { type?: string; search?: string; folder?: string; page?: number; limit?: number }) {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request(`/api/media${qs}`);
  },
  async deleteMedia(id: string) {
    return request(`/api/media/${id}`, { method: 'DELETE' });
  },
  async attachMedia(id: string, postId: string) {
    return request(`/api/media/${id}/attach`, {
      method: 'POST',
      body: JSON.stringify({ postId })
    });
  },
  async getLinks() {
    return request('/api/links');
  },
  async createLink(data: { originalUrl: string; customAlias?: string }) {
    return request('/api/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteLink(id: string) {
    return request(`/api/links/${id}`, { method: 'DELETE' });
  },
  async getLinkStats(id: string) {
    return request(`/api/links/${id}/stats`);
  },
  async uploadMedia(formData: FormData) {
    let authHeaders: Record<string, string> = {};
    
    if (typeof window !== 'undefined') {
      const tokens = localStorage.getItem('auth_tokens');
      if (tokens) {
        const { access_token } = JSON.parse(tokens);
        authHeaders['Authorization'] = `Bearer ${access_token}`;
      }
    }
    
    const res = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {}),
        ...authHeaders
      },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
  },
  // Auth endpoints
  async login(email: string, password: string) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  async register(email: string, username: string, password: string, confirmPassword: string) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, confirmPassword })
    });
  },
  async logout() {
    return request('/api/auth/logout', {
      method: 'POST'
    });
  },
  async refreshToken() {
    const tokens = JSON.parse(localStorage.getItem('auth_tokens') || '{}');
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.refresh_token}`,
        ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': String(process.env.NEXT_PUBLIC_API_KEY) } : {})
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }
    return response.json();
  },
  // Integration endpoints
  async getIntegrations() {
    return request('/api/integrations');
  },
  async connectPlatform(platform: string) {
    return request(`/api/integrations/${platform}/connect`, {
      method: 'POST'
    });
  },
  async disconnectPlatform(platform: string, accountId: string) {
    return request(`/api/integrations/${platform}/${accountId}/disconnect`, {
      method: 'POST'
    });
  },
  // Vault endpoints
  async getVaultEntries(platform?: string) {
    const query = platform ? `?platform=${platform}` : '';
    return request(`/api/vault${query}`);
  },
  async startCaptureSession(platform: string, loginUrl: string) {
    return request('/api/vault/capture', {
      method: 'POST',
      body: JSON.stringify({ platform, loginUrl })
    });
  },
  async getCaptureSession(sessionId: string) {
    return request(`/api/vault/capture/${sessionId}`);
  },
  async deleteVaultEntry(entryId: string) {
    return request(`/api/vault/${entryId}`, {
      method: 'DELETE'
    });
  },
};
