# Dependencies Graph

```mermaid
graph TD
    subgraph Frontend [Next.js App]
        P[page.tsx] --> CV[CalendarView]
        P --> QV[QueueView]
        P --> CW[CampaignWizard]
        P --> SV[SettingsView]
        
        CV -- "Uses Mock Data (Current)" --> M1[mockPosts]
        QV -- "Uses Mock Data (Current)" --> M2[mockQueuePosts]
        
        API[api.ts] -- "Defines (Unused)" --> BE_URL[http://localhost:3001]
    end

    subgraph Backend [Fastify Server]
        S[server.ts] --> DB_INIT[db.ts]
        S --> SCH[scheduler.ts]
        S --> W[worker.ts]
        
        SCH -- "Polls" --> DB[(SQLite DB)]
        SCH -- "Triggers" --> W
        
        W -- "Updates" --> DB
        W -- "Uses" --> PM[PlatformManager]
        
        PM --> TA[TwitterAdapter]
        PM --> LA[LinkedInAdapter]
        PM --> GA[GenericAdapter]
    end

    subgraph External [Mocked External Services]
        TA -- "Simulates" --> EXT_TW[Twitter API]
        LA -- "Simulates" --> EXT_LI[LinkedIn API]
    end

    BE_URL -.-> S
```

## Data Flow Analysis

1.  **Frontend State**: Isolated. Components rely on local state and hardcoded mock objects.
2.  **Backend State**: Persistent. SQLite database stores posts, platforms, and settings.
3.  **Gap**: The `api.ts` file exists and matches the backend endpoints, but the UI components are not importing or using these API functions yet.
