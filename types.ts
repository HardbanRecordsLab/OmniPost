
export enum ClusterType {
  SOCIAL = 'Social',
  VIDEO = 'Video',
  MESSAGING = 'Messaging',
  EDITORIAL = 'Editorial'
}

export enum ProtocolType {
  OFFICIAL_API = 'Official API',
  WEBHOOK = 'Webhook'
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed'
}

export interface Platform {
  id: string;
  name: string;
  status?: 'enabled' | 'disabled';
  accountInfo?: string;
}

export interface Post {
  id: string;
  content: string;
  status: PostStatus;
  scheduledAt: string; // ISO String
  platformIds?: string[];
  mediaUrls?: string[];
  createdAt?: number;
  // Legacy fields for backend worker/scheduler compatibility
  platformId?: string;
  retry_count?: number;
  last_error?: string;
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
}

export interface QueueSlot {
  day: number; // 0-6
  time: string; // HH:mm
}

export interface PlatformConnection {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  settings_json: string;
}
