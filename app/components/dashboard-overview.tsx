"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Target,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "../../apiService"

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-pink-500 to-purple-600",
  facebook: "bg-[#1877F2]",
  twitter: "bg-black dark:bg-white",
  linkedin: "bg-[#0A66C2]",
  tiktok: "bg-gradient-to-br from-cyan-400 to-pink-500",
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function DashboardOverview() {
  const [posts, setPosts] = useState<any[]>([])
  const [stats, setStats] = useState([
    { title: "Total Followers", value: "--", change: "0%", trend: "neutral", icon: Users, color: "from-blue-500 to-cyan-500" },
    { title: "Engagement Rate", value: "--", change: "0%", trend: "neutral", icon: Heart, color: "from-pink-500 to-rose-500" },
    { title: "Post Impressions", value: "--", change: "0%", trend: "neutral", icon: Eye, color: "from-purple-500 to-indigo-500" },
    { title: "Click-through Rate", value: "--", change: "0%", trend: "neutral", icon: Target, color: "from-orange-500 to-amber-500" },
  ])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await api.getPosts()
        setPosts(data)
      } catch (e) {
        console.error("Failed to fetch posts", e)
      }
    }
    fetchPosts()
  }, [])

  const upcomingPosts = posts
    .filter(p => p.status !== 'published' && p.status !== 'failed' && (!p.scheduledAt || new Date(p.scheduledAt) > new Date()))
    .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      content: p.content,
      platforms: p.platformIds || [],
      time: p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : 'Draft'
    }))

  const recentActivity = posts
    .filter(p => p.status === 'published' || p.status === 'failed')
    .sort((a, b) => new Date(b.scheduledAt || b.createdAt || 0).getTime() - new Date(a.scheduledAt || a.createdAt || 0).getTime())
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      type: p.status,
      platform: (p.platformIds && p.platformIds[0]) || 'generic',
      time: p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : 'Just now',
      content: p.content
    }))

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Welcome back!</h2>
        <p className="text-muted-foreground mt-1">Here's what's happening with your social media today</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div key={index} variants={item}>
              <Card className="relative overflow-hidden group">
                <motion.div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br", stat.color)} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", stat.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className={cn("flex items-center gap-1 text-sm font-medium", stat.trend === "up" ? "text-green-500" : "text-red-500")}>
                      {stat.change}
                      {stat.trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Upcoming Posts
              </CardTitle>
              <motion.button whileHover={{ scale: 1.05 }} className="text-sm text-primary hover:underline">View all</motion.button>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No upcoming posts</p>
              ) : (
                upcomingPosts.map((post, index) => (
                  <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} whileHover={{ x: 4 }} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex gap-1">
                      {post.platforms.map((platform: string) => (
                        <div key={platform} className={cn("w-2 h-8 rounded-full opacity-50", platformColors[platform] || "bg-gray-500")} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{post.content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{post.time}</span>
                        <span>•</span>
                        <div className="flex gap-1">
                          {post.platforms.map((p: string) => (
                            <span key={p} className="capitalize">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity, index) => (
                  <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + index * 0.1 }} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", platformColors[activity.platform] || "bg-gray-500")}>
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.type === "published" ? "Published post" : activity.type === "failed" ? "Failed to publish" : "Activity"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{activity.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
