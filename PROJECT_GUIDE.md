# PROJECT GUIDE – OmniPost AI

**Project type:**
Self-hosted social media scheduler (Buffer-like).

**Scope:**
- calendar
- queues
- campaigns
- scheduled publishing

**Explicitly excluded:**
- analytics
- AI predictions
- social listening
- real-time dashboards

**Infrastructure:**
- single VPS
- possible ARM64 or x86
- Node.js backend
- React frontend

**Frontend:**
- calendar-first
- API-driven
- no localStorage as source of truth

**Backend:**
- owns scheduling
- owns retries
- owns execution

**AI:**
- content generation only
- JSON output only

---

## TODO — Platform Adapters

Currently 12/62 platforms implemented. Missing 50 platforms.
See full list: `Social_Media_Platforms_62_Networks.md`

**Priority for HRL (music-related):**
- [ ] Spotify
- [ ] SoundCloud
- [ ] Mixcloud
- [ ] Bandcamp
- [ ] Threads
- [ ] Snapchat
- [ ] WhatsApp
- [ ] Tumblr
- [ ] Mastodon
- [ ] Medium
- [ ] VKontakte
- [ ] Weibo
- [ ] Telegram (bot posting)
- [ ] Slack
- [ ] Microsoft Teams
