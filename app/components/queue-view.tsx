"use client"

import { useEffect, useMemo, useState } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import { Edit2, Trash2, Copy, Eye, MoreHorizontal, CheckCircle2, Clock, AlertCircle, FileEdit, Filter, SortAsc, Calendar, ImageIcon } from "lucide-react"
 import { format, formatDistanceToNow } from "date-fns"
 import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
 import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
 
 const platformColors: Record<string, { bg: string; text: string }> = {
   instagram: { bg: "bg-gradient-to-br from-pink-500 to-purple-600", text: "text-white" },
   facebook: { bg: "bg-[#1877F2]", text: "text-white" },
   twitter: { bg: "bg-black dark:bg-white", text: "text-white dark:text-black" },
   linkedin: { bg: "bg-[#0A66C2]", text: "text-white" },
   tiktok: { bg: "bg-gradient-to-br from-cyan-400 to-pink-500", text: "text-white" },
 }
 
 const statusConfig = {
   scheduled: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "Scheduled" },
   published: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Published" },
   failed: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" },
   draft: { icon: FileEdit, color: "text-gray-500", bg: "bg-gray-500/10", label: "Draft" },
   publishing: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Publishing" },
 }
 
interface QueuePost {
   id: string
   content: string
   platforms: string[]
   scheduledAt: Date
   status: "scheduled" | "published" | "failed" | "draft" | "publishing"
   images?: string[]
 }
 
export function QueueView() {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"date" | "platform" | "status">("date")
  const [posts, setPosts] = useState<QueuePost[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState<{ id: string; content: string; date: string; time: string; platforms: string[] } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkPlatformsOpen, setIsBulkPlatformsOpen] = useState(false)
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>([])
 
  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getPosts()
      const mapped: QueuePost[] = data.map((p: any) => ({
        id: p.id,
        content: p.content,
        platforms: Array.isArray(p.platformIds) ? p.platformIds : [],
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : new Date(),
        status: p.status || "draft",
        images: Array.isArray(p.mediaUrls) ? p.mediaUrls : []
      }))
      setPosts(mapped)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener("posts:refresh", handler)
    return () => window.removeEventListener("posts:refresh", handler)
  }, [])
 
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "upcoming", label: "Upcoming", count: posts.filter((p) => p.status === "scheduled" || p.status === "publishing").length },
    { id: "published", label: "Published", count: posts.filter((p) => p.status === "published").length },
    { id: "failed", label: "Failed", count: posts.filter((p) => p.status === "failed").length },
    { id: "drafts", label: "Drafts", count: posts.filter((p) => p.status === "draft").length },
  ]
 
   const togglePlatform = (platform: string) => {
     setSelectedPlatforms((prev) => prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform])
   }
 
  const filteredPosts = posts.filter((p) => selectedPlatforms.length === 0 || p.platforms.some((pl) => selectedPlatforms.includes(pl)))
   const sortedPosts = [...filteredPosts].sort((a, b) => {
     if (sortBy === "date") return a.scheduledAt.getTime() - b.scheduledAt.getTime()
     if (sortBy === "status") return a.status.localeCompare(b.status)
     if (sortBy === "platform") return a.platforms.join(",").localeCompare(b.platforms.join(","))
     return 0
   })
 
   return (
     <div className="p-6 space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           {Object.keys(platformColors).map((platform) => (
             <motion.button
               key={platform}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => togglePlatform(platform)}
               className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all", selectedPlatforms.includes(platform) ? cn(platformColors[platform].bg, platformColors[platform].text) : "bg-muted text-muted-foreground hover:bg-muted/80")}
             >
               {platform}
             </motion.button>
           ))}
         </div>
        <div className="flex items-center gap-2">
           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSortBy("date")} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">
             <SortAsc className="w-4 h-4 inline mr-1" /> Sort by Date
           </motion.button>
           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSortBy("status")} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">
             Status
           </motion.button>
           <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSortBy("platform")} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">
             Platform
           </motion.button>
          {selectedIds.length > 0 && (
            <>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1.5 rounded-lg text-sm bg-destructive text-destructive-foreground" onClick={async () => {
                try {
                  await api.batchDeletePosts(selectedIds)
                  setSelectedIds([])
                  window.dispatchEvent(new Event("posts:refresh"))
                } catch {}
              }}>
                <Trash2 className="w-4 h-4 inline mr-1" /> Delete selected ({selectedIds.length})
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1.5 rounded-lg text-sm bg-muted" onClick={async () => {
                try {
                  await api.batchUpdatePosts({ ids: selectedIds, shiftByMinutes: 30 })
                  setSelectedIds([])
                  window.dispatchEvent(new Event("posts:refresh"))
                } catch {}
              }}>
                <Clock className="w-4 h-4 inline mr-1" /> Shift +30 min
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground" onClick={() => {
                setBulkPlatforms([])
                setIsBulkPlatformsOpen(true)
              }}>
                <Edit2 className="w-4 h-4 inline mr-1" /> Change platforms
              </motion.button>
            </>
          )}
         </div>
       </div>
 
       <div className="grid md:grid-cols-2 gap-4">
         {sortedPosts.map((post) => {
           const StatusIcon = statusConfig[post.status].icon
           return (
             <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden">
               <div className="p-4 space-y-3">
                 <div className="flex items-start justify-between">
                   <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input type="checkbox" checked={selectedIds.includes(post.id)} onChange={(e) => {
                        setSelectedIds((prev) => e.target.checked ? [...prev, post.id] : prev.filter(id => id !== post.id))
                      }} />
                      <p className="text-sm font-medium">{post.content}</p>
                    </div>
                     <p className="text-xs text-muted-foreground">
                       Scheduled {format(post.scheduledAt, "MMM d, HH:mm")} • {formatDistanceToNow(post.scheduledAt, { addSuffix: true })}
                     </p>
                   </div>
                   <div className={cn("px-2 py-1 rounded-lg text-xs font-medium", statusConfig[post.status].bg, statusConfig[post.status].color)}>
                     {statusConfig[post.status].label}
                   </div>
                 </div>
 
                 {post.images?.length ? (
                   <div className="rounded-lg overflow-hidden bg-muted/40">
                     <img src={post.images[0]} alt="" className="w-full h-40 object-cover" />
                   </div>
                 ) : null}
 
                 <div className="flex items-center justify-between">
                   <div className="flex gap-1">
                     {post.platforms.map((platform) => (
                       <div key={platform} className={cn("px-2 py-1 rounded-full text-xs", platformColors[platform].bg, platformColors[platform].text)}>
                         {platform}
                       </div>
                     ))}
                   </div>
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                         <MoreHorizontal className="w-4 h-4" />
                       </motion.button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem>
                       <DropdownMenuItem onClick={() => {
                         const d = post.scheduledAt
                         setEditData({
                           id: post.id,
                           content: post.content,
                           date: format(d, "yyyy-MM-dd"),
                           time: format(d, "HH:mm"),
                           platforms: [...post.platforms]
                         })
                         setIsEditOpen(true)
                       }}>
                         <Edit2 className="w-4 h-4 mr-2" /> Edit
                       </DropdownMenuItem>
                       <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                       <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={async () => { try { await api.deletePost(post.id); window.dispatchEvent(new Event("posts:refresh")) } catch {} }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </div>
               </div>
             </motion.div>
           )
         })}
       </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          {editData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea value={editData.content} onChange={(e) => setEditData({ ...editData, content: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(platformColors).map((p) => {
                    const selected = editData.platforms.includes(p)
                    return (
                      <motion.button
                        key={p}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const next = selected ? editData.platforms.filter(x => x !== p) : [...editData.platforms, p]
                          setEditData({ ...editData, platforms: next })
                        }}
                        className={cn("px-2 py-1 rounded-full text-xs", selected ? cn(platformColors[p].bg, platformColors[p].text) : "bg-muted text-muted-foreground")}
                      >
                        {p}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <Input type="time" value={editData.time} onChange={(e) => setEditData({ ...editData, time: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-3 py-1.5 rounded-lg hover:bg-muted" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                  onClick={async () => {
                    try {
                      const iso = new Date(`${editData.date}T${editData.time}:00`).toISOString()
                      await api.updatePost(editData.id, { content: editData.content, scheduledAt: iso, platformIds: editData.platforms })
                      setIsEditOpen(false)
                      window.dispatchEvent(new Event("posts:refresh"))
                    } catch {}
                  }}
                >
                  Save
                </motion.button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkPlatformsOpen} onOpenChange={setIsBulkPlatformsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change platforms for selected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.keys(platformColors).map((p) => {
                const selected = bulkPlatforms.includes(p)
                return (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const next = selected ? bulkPlatforms.filter(x => x !== p) : [...bulkPlatforms, p]
                      setBulkPlatforms(next)
                    }}
                    className={cn("px-2 py-1 rounded-full text-xs", selected ? cn(platformColors[p].bg, platformColors[p].text) : "bg-muted text-muted-foreground")}
                  >
                    {p}
                  </motion.button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-3 py-1.5 rounded-lg hover:bg-muted" onClick={() => setIsBulkPlatformsOpen(false)}>
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                onClick={async () => {
                  try {
                    await api.batchUpdatePosts({ ids: selectedIds, setPlatformIds: bulkPlatforms })
                    setIsBulkPlatformsOpen(false)
                    setSelectedIds([])
                    window.dispatchEvent(new Event("posts:refresh"))
                  } catch {}
                }}
              >
                Save
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
     </div>
   )
 }
export default QueueView
