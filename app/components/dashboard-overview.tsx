"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, CheckCircle2, Clock, XCircle, TrendingUp, Zap, BarChart3, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const PLATFORM_CONFIG: Record<string, { color: string; gradient: string; icon: string }> = {
  instagram: { color: "#E1306C", gradient: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", icon: "📸" },
  facebook: { color: "#1877F2", gradient: "linear-gradient(135deg,#1877F2,#0C5FC8)", icon: "👤" },
  threads: { color: "#000000", gradient: "linear-gradient(135deg,#000,#444)", icon: "🧵" },
  tiktok: { color: "#010101", gradient: "linear-gradient(45deg,#00F2EA,#FF0050)", icon: "🎵" },
  linkedin: { color: "#0A66C2", gradient: "linear-gradient(135deg,#0A66C2,#004182)", icon: "💼" },
  twitter: { color: "#000000", gradient: "linear-gradient(135deg,#000,#333)", icon: "𝕏" },
  youtube: { color: "#FF0000", gradient: "linear-gradient(135deg,#FF0000,#CC0000)", icon: "▶️" },
  pinterest: { color: "#E60023", gradient: "linear-gradient(135deg,#E60023,#AD081B)", icon: "📌" },
  googlebusiness: { color: "#4285F4", gradient: "linear-gradient(135deg,#4285F4,#34A853)", icon: "🏢" },
  telegram: { color: "#26A5E4", gradient: "linear-gradient(135deg,#26A5E4,#0088cc)", icon: "✈️" },
  discord: { color: "#5865F2", gradient: "linear-gradient(135deg,#5865F2,#4752C4)", icon: "🎮" },
  reddit: { color: "#FF4500", gradient: "linear-gradient(135deg,#FF4500,#FF6534)", icon: "🔴" },
  bluesky: { color: "#0085FF", gradient: "linear-gradient(135deg,#0085FF,#0064CC)", icon: "🦋" },
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export function DashboardOverview() {
  const [posts, setPosts] = useState<any[]>([])
  const [platforms, setPlatforms] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [postsData, platformsData] = await Promise.all([
        api.getPosts().catch(() => []),
        api.getPlatforms().catch(() => []),
      ])
      const logsData = await api.getPublishLogs().catch(() => [])
      setPosts(Array.isArray(postsData) ? postsData : [])
      setPlatforms(Array.isArray(platformsData) ? platformsData : [])
      setLogs(Array.isArray(logsData) ? logsData.slice(0, 5) : [])
    } finally {
      setLoading(false)
    }
  }

  const scheduled = posts.filter(p => p.status === "scheduled")
  const published = posts.filter(p => p.status === "published")
  const draft = posts.filter(p => p.status === "draft")
  const failed = posts.filter(p => p.status === "failed")
  const connected = platforms.filter(p => p.connected || p.status === "enabled")

  const stats = [
    { title: "Scheduled", value: scheduled.length, icon: Clock, color: "#00B4E6", bg: "rgba(0,180,230,0.1)" },
    { title: "Published", value: published.length, icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { title: "Drafts", value: draft.length, icon: Calendar, color: "#7B2FBE", bg: "rgba(123,47,190,0.1)" },
    { title: "Failed", value: failed.length, icon: XCircle, color: failed.length > 0 ? "#ef4444" : "#6b7280", bg: failed.length > 0 ? "rgba(239,68,68,0.1)" : "rgba(107,114,128,0.1)" },
  ]

  const upcoming = scheduled
    .sort((a, b) => new Date(a.scheduledAt || a.scheduled_at).getTime() - new Date(b.scheduledAt || b.scheduled_at).getTime())
    .slice(0, 4)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")} · Welcome back! 👋</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="hidden" animate="show">
        {stats.map((s, i) => (
          <motion.div key={i} variants={item} className="brand-card p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-3xl font-black" style={{ color: s.color }}>
              {loading ? "—" : s.value}
            </div>
            <div className="text-sm text-muted-foreground font-bold mt-0.5">{s.title}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 brand-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg" style={{ fontFamily: "'Nunito', sans-serif" }}>Upcoming Posts</h3>
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(0,180,230,0.1)", color: "#00B4E6" }}>
              {scheduled.length} scheduled
            </span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div className="font-bold">No scheduled posts</div>
              <div className="text-sm">Create your first post to get started</div>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((post, i) => {
                const scheduledAt = new Date(post.scheduledAt || post.scheduled_at)
                const platformIds: string[] = Array.isArray(post.platformIds) ? post.platformIds : []
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="text-center min-w-[44px]">
                      <div className="text-xs text-muted-foreground font-bold">{format(scheduledAt, "dd/MM")}</div>
                      <div className="font-black text-sm" style={{ color: "#7B2FBE" }}>{format(scheduledAt, "HH:mm")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{post.content}</div>
                      <div className="flex gap-1.5 mt-1">
                        {platformIds.slice(0, 4).map(pid => {
                          const p = PLATFORM_CONFIG[pid]
                          return p ? (
                            <div key={pid} className="w-5 h-5 rounded-md text-center text-xs flex items-center justify-center" style={{ background: p.gradient }}>
                              <span style={{ fontSize: 10 }}>{p.icon}</span>
                            </div>
                          ) : null
                        })}
                        {platformIds.length > 4 && (
                          <span className="text-xs text-muted-foreground font-bold self-center">+{platformIds.length - 4}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(0,180,230,0.12)", color: "#0095BF" }}>
                      Scheduled
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="brand-card p-5">
            <h3 className="font-black text-base mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Platforms</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(PLATFORM_CONFIG).slice(0, 6).map(([id, p]) => {
                  const isConn = connected.some(c => c.id === id || c.platform === id)
                  return (
                    <div key={id} className="flex items-center gap-2.5 py-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: p.gradient }}>
                        {p.icon}
                      </div>
                      <span className="flex-1 text-sm font-bold capitalize">{id}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isConn ? "#10b981" : "var(--border)", boxShadow: isConn ? "0 0 6px #10b981" : "none" }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="brand-card p-4" style={{ background: "linear-gradient(135deg, rgba(123,47,190,0.06), rgba(0,180,230,0.06))", borderColor: "rgba(0,180,230,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" style={{ color: "#FFD600" }} />
              <span className="text-xs font-black" style={{ color: "#FFD600" }}>AI TIP</span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-2">
              Best time to post on Instagram this week: <strong>Tuesday 10–11 AM</strong>
            </p>
            <div className="text-xs text-muted-foreground">Based on your audience timezone and engagement patterns</div>
          </div>

          {logs.length > 0 && (
            <div className="brand-card p-4">
              <h3 className="font-black text-sm mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Recent Activity</h3>
              <div className="space-y-2">
                {logs.map((log: any, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: log.success ? "#10b981" : "#ef4444" }} />
                    <span className="font-bold capitalize">{log.platform}</span>
                    <span className="text-muted-foreground truncate flex-1">{log.success ? "Published" : "Failed"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
