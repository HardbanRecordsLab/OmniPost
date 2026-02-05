 "use client"
 
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
 
 const stats = [
   { title: "Total Followers", value: "24.5K", change: "+12.5%", trend: "up", icon: Users, color: "from-blue-500 to-cyan-500" },
   { title: "Engagement Rate", value: "5.2%", change: "+0.8%", trend: "up", icon: Heart, color: "from-pink-500 to-rose-500" },
   { title: "Post Impressions", value: "128K", change: "+18.2%", trend: "up", icon: Eye, color: "from-purple-500 to-indigo-500" },
   { title: "Click-through Rate", value: "3.8%", change: "-0.3%", trend: "down", icon: Target, color: "from-orange-500 to-amber-500" },
 ]
 
 const recentActivity = [
   { id: 1, type: "published", platform: "instagram", time: "2 hours ago", content: "Product launch announcement" },
   { id: 2, type: "scheduled", platform: "twitter", time: "3 hours ago", content: "Weekly tips thread" },
   { id: 3, type: "engagement", platform: "linkedin", time: "5 hours ago", content: "+50 new connections" },
   { id: 4, type: "published", platform: "facebook", time: "1 day ago", content: "Customer success story" },
 ]
 
 const upcomingPosts = [
   { id: 1, content: "New feature announcement!", platforms: ["instagram", "twitter"], time: "Today, 2:00 PM" },
   { id: 2, content: "Behind the scenes video", platforms: ["tiktok", "instagram"], time: "Tomorrow, 10:00 AM" },
   { id: 3, content: "Industry insights article", platforms: ["linkedin"], time: "Feb 6, 9:00 AM" },
 ]
 
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
               {upcomingPosts.map((post, index) => (
                 <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} whileHover={{ x: 4 }} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                   <div className="flex gap-1">
                     {post.platforms.map((platform) => (
                       <div key={platform} className={cn("w-6 h-6 rounded-full", platformColors[platform])} />
                     ))}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">{post.content}</p>
                     <p className="text-xs text-muted-foreground">{post.time}</p>
                   </div>
                 </motion.div>
               ))}
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
               {recentActivity.map((activity, index) => (
                 <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} whileHover={{ x: 4 }} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                   <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", platformColors[activity.platform])}>
                     <BarChart3 className="w-5 h-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">
                       {activity.type === "published" ? "Published" : activity.type === "scheduled" ? "Scheduled" : "Engagement"}: {activity.content}
                     </p>
                     <p className="text-xs text-muted-foreground">{activity.time}</p>
                   </div>
                 </motion.div>
               ))}
             </CardContent>
           </Card>
         </motion.div>
       </div>
     </div>
   )
 }
export default DashboardOverview
