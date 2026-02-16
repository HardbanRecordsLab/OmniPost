"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointerClick, 
  Share2, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function AnalyticsView() {
  const [timeRange, setTimeRange] = useState("7d")

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track your social media performance and growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                title: "Total Impressions",
                value: "1.2M",
                change: "+12.5%",
                trend: "up",
                icon: Eye,
                description: "vs. previous period"
              },
              {
                title: "Total Engagement",
                value: "45.2K",
                change: "+8.2%",
                trend: "up",
                icon: MousePointerClick,
                description: "vs. previous period"
              },
              {
                title: "Followers Gained",
                value: "+2.4K",
                change: "-1.1%",
                trend: "down",
                icon: Users,
                description: "vs. previous period"
              },
              {
                title: "Avg. Reach Rate",
                value: "24.8%",
                change: "+4.3%",
                trend: "up",
                icon: TrendingUp,
                description: "vs. previous period"
              }
            ].map((stat, i) => (
              <motion.div key={i} variants={item}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <span className={stat.trend === "up" ? "text-green-500 flex items-center" : "text-red-500 flex items-center"}>
                        {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {stat.change}
                      </span>
                      <span className="ml-1">{stat.description}</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts Area */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Growth Overview</CardTitle>
                <CardDescription>
                  Follower growth and engagement trends over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] w-full bg-muted/20 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/25">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-50" />
                    <span>Chart Visualization Placeholder</span>
                    <span className="text-xs opacity-70">(Recharts Integration Ready)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
                <CardDescription>
                  Where your audience is most active.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Instagram", value: 45, color: "bg-pink-500" },
                    { name: "LinkedIn", value: 30, color: "bg-blue-600" },
                    { name: "Twitter (X)", value: 15, color: "bg-black dark:bg-white" },
                    { name: "Facebook", value: 10, color: "bg-blue-500" },
                  ].map((platform) => (
                    <div key={platform.name} className="flex items-center">
                      <div className="w-24 text-sm font-medium">{platform.name}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mx-2">
                        <div 
                          className={`h-full ${platform.color}`} 
                          style={{ width: `${platform.value}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-right text-muted-foreground">{platform.value}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>
                Your best performing posts in this period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "5 Tips for Better Productivity", platform: "LinkedIn", views: "12.5K", likes: "450", comments: "82", date: "2 days ago" },
                  { title: "Behind the scenes at our office 📸", platform: "Instagram", views: "8.2K", likes: "1.2K", comments: "45", date: "4 days ago" },
                  { title: "New feature announcement! 🚀", platform: "Twitter", views: "15.1K", likes: "890", comments: "120", date: "1 week ago" },
                ].map((post, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{post.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{post.platform}</span>
                          <span>•</span>
                          <span>{post.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center hidden sm:block">
                        <p className="font-bold">{post.views}</p>
                        <p className="text-muted-foreground text-xs">Views</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="font-bold">{post.likes}</p>
                        <p className="text-muted-foreground text-xs">Likes</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="font-bold">{post.comments}</p>
                        <p className="text-muted-foreground text-xs">Comments</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <Card>
            <CardHeader>
              <CardTitle>Audience Demographics</CardTitle>
              <CardDescription>Detailed breakdown of your follower base.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
              Audience analytics content placeholder
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
