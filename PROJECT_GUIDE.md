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
