
import { Platform, ClusterType, ProtocolType } from './types';

export const PLATFORMS: Platform[] = [
  { id: 'fb-page', name: 'Facebook Page', cluster: ClusterType.SOCIAL, protocol: ProtocolType.OFFICIAL_API, maxChars: 5000, hashtagsAllowed: true, requiresMedia: false },
  { id: 'ig-feed', name: 'Instagram Feed', cluster: ClusterType.SOCIAL, protocol: ProtocolType.OFFICIAL_API, maxChars: 2200, hashtagsAllowed: true, requiresMedia: true },
  { id: 'ig-reels', name: 'Instagram Reels', cluster: ClusterType.VIDEO, protocol: ProtocolType.OFFICIAL_API, maxChars: 2200, hashtagsAllowed: true, requiresMedia: true },
  { id: 'li-personal', name: 'LinkedIn', cluster: ClusterType.SOCIAL, protocol: ProtocolType.OFFICIAL_API, maxChars: 3000, hashtagsAllowed: true, requiresMedia: false },
  { id: 'x', name: 'X (Twitter)', cluster: ClusterType.SOCIAL, protocol: ProtocolType.OFFICIAL_API, maxChars: 280, hashtagsAllowed: true, requiresMedia: false },
  { id: 'tiktok', name: 'TikTok', cluster: ClusterType.VIDEO, protocol: ProtocolType.OFFICIAL_API, maxChars: 4000, hashtagsAllowed: true, requiresMedia: true },
  { id: 'telegram', name: 'Telegram', cluster: ClusterType.MESSAGING, protocol: ProtocolType.WEBHOOK, maxChars: 4000, hashtagsAllowed: false, requiresMedia: false },
  { id: 'discord', name: 'Discord', cluster: ClusterType.MESSAGING, protocol: ProtocolType.WEBHOOK, maxChars: 2000, hashtagsAllowed: false, requiresMedia: false },
  { id: 'medium', name: 'Medium', cluster: ClusterType.EDITORIAL, protocol: ProtocolType.WEBHOOK, maxChars: 50000, hashtagsAllowed: true, requiresMedia: false },
];
