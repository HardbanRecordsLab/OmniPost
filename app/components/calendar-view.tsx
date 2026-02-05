"use client"

import { useState, useMemo, useEffect } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import {
   ChevronLeft,
   ChevronRight,
   Plus,
   Edit2,
   Trash2,
   Eye,
   GripVertical,
 } from "lucide-react"
 import {
   format,
   startOfMonth,
   endOfMonth,
   startOfWeek,
   endOfWeek,
   addDays,
   addMonths,
   subMonths,
   isSameMonth,
   isSameDay,
   isToday,
 } from "date-fns"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
 import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
 } from "@/components/ui/tooltip"
 
 const platformColors: Record<string, string> = {
   instagram: "bg-gradient-to-br from-pink-500 to-purple-600",
   facebook: "bg-[#1877F2]",
   twitter: "bg-black dark:bg-white dark:text-black",
   linkedin: "bg-[#0A66C2]",
   tiktok: "bg-gradient-to-br from-cyan-400 to-pink-500",
 }
 
 const platformTextColors: Record<string, string> = {
   instagram: "text-white",
   facebook: "text-white",
   twitter: "text-white dark:text-black",
   linkedin: "text-white",
   tiktok: "text-white",
 }
 
 interface ScheduledPost {
   id: string
   content: string
   platforms: string[]
   time: string
   image?: string
   status: "scheduled" | "published" | "draft"
 }
 
interface PostsByDate {
  [key: string]: ScheduledPost[]
}
 
 interface CalendarViewProps {
   onCreatePost: () => void
 }
 
 export function CalendarView({ onCreatePost }: CalendarViewProps) {
   const [currentDate, setCurrentDate] = useState(new Date())
   const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")
   const [hoveredDate, setHoveredDate] = useState<string | null>(null)
   const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null)
  const [postsByDate, setPostsByDate] = useState<PostsByDate>({})
  const [loading, setLoading] = useState(false)
  const [ghostTime, setGhostTime] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<Array<{ id: string; status: string }>>([])
  const [windows, setWindows] = useState<Array<{ platformId: string; startHour: number; endHour: number; enabled: number }>>([])
  const [selectedEdit, setSelectedEdit] = useState<{ post: ScheduledPost; date: Date; minute: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getPosts()
      const grouped: PostsByDate = {}
      for (const p of data) {
        const dateKey = String(p.scheduledAt || '').slice(0, 10)
        const item: ScheduledPost = {
          id: p.id,
          content: p.content,
          platforms: Array.isArray(p.platformIds) ? p.platformIds : [],
          time: p.scheduledAt ? format(new Date(p.scheduledAt), "HH:mm") : "",
          status: (p.status as any) || "draft",
        }
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(item)
      }
      setPostsByDate(grouped)
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
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const rows = await api.getPlatforms()
        setPlatforms(rows.map((r: any) => ({ id: r.id, status: r.status })))
      } catch {}
    }
    fetchPlatforms()
  }, [])
  useEffect(() => {
    const fetchWindows = async () => {
      try {
        const rows = await api.getWindows()
        setWindows(rows)
      } catch {}
    }
    fetchWindows()
  }, [])
 
  const calendarDays = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate]
    }
    if (viewMode === "week") {
      const startDate = startOfWeek(currentDate)
      const endDate = endOfWeek(currentDate)
      const days: Date[] = []
      let day = startDate
      while (day <= endDate) {
        days.push(day)
        day = addDays(day, 1)
      }
      return days
    }
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const days: Date[] = []
    let day = startDate
    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate, viewMode])
  const isSlotAllowed = (label: string, post: ScheduledPost | null) => {
    if (!post || !post.platforms?.length) return true
    const statusMap = new Map(platforms.map(p => [p.id, p.status]))
    const [hh, mm] = label.split(':').map(x => parseInt(x, 10))
    const minutesOfDay = hh * 60 + mm
    const wmap = new Map(windows.map(w => [w.platformId, w]))
    for (const p of post.platforms) {
      const st = statusMap.get(p)
      if (st === 'enabled') {
        const w = wmap.get(p)
        const start = w ? (w.startHour * 60) : 0
        const end = w ? (w.endHour * 60) : (24 * 60 - 1)
        const enabled = w ? (w.enabled === 1) : true
        if (enabled && !(minutesOfDay >= start && minutesOfDay <= end)) return false
      }
    }
    return true
  }
 
   const goToToday = () => setCurrentDate(new Date())
   const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
   const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
 
   const getPostsForDate = (date: Date): ScheduledPost[] => {
     const dateKey = format(date, "yyyy-MM-dd")
    return postsByDate[dateKey] || []
   }
 
   return (
     <div className="p-6 space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <h2 className="text-2xl font-semibold text-foreground">
             {format(currentDate, "MMMM yyyy")}
           </h2>
           <div className="flex items-center gap-1">
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.9 }}
               onClick={goToPrevMonth}
               className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
             >
               <ChevronLeft className="w-5 h-5" />
             </motion.button>
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={goToToday}
               className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
             >
               Today
             </motion.button>
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.9 }}
               onClick={goToNextMonth}
               className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
             >
               <ChevronRight className="w-5 h-5" />
             </motion.button>
           </div>
         </div>
 
         <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
           {(["month", "week", "day"] as const).map((mode) => (
             <motion.button
               key={mode}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setViewMode(mode)}
               className={cn(
                 "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                 viewMode === mode ? "bg-background" : "hover:bg-background/50"
               )}
             >
               {mode[0].toUpperCase() + mode.slice(1)}
             </motion.button>
           ))}
         </div>
 
         <motion.button
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={onCreatePost}
           className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
         >
           <Plus className="w-4 h-4" />
           <span>New Post</span>
         </motion.button>
       </div>
 
      <div className={cn("grid gap-3", viewMode === "day" ? "grid-cols-1" : "grid-cols-7")}>
         {calendarDays.map((date, index) => {
           const posts = getPostsForDate(date)
           const isCurrentMonth = isSameMonth(date, currentDate)
           const isCurrentDay = isToday(date)
 
           return (
             <motion.div
               key={index}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={cn(
                 "min-h-[140px] rounded-xl border border-border p-3 bg-card hover:bg-muted/40 transition-colors relative",
                 !isCurrentMonth && "opacity-60"
               )}
               onMouseEnter={() => setHoveredDate(format(date, "yyyy-MM-dd"))}
               onMouseLeave={() => setHoveredDate(null)}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={async () => {
                if (!draggedPost || viewMode === "day") return
                try {
                  const lbl = draggedPost.time || "09:00"
                  const allowed = isSlotAllowed(lbl, draggedPost)
                  if (!allowed) return
                  const iso = new Date(`${format(date, "yyyy-MM-dd")}T${lbl}:00`).toISOString()
                  await api.updatePost(draggedPost.id, { content: draggedPost.content, scheduledAt: iso })
                  setDraggedPost(null)
                  window.dispatchEvent(new Event("posts:refresh"))
                } catch {}
              }}
             >
               <div className="flex items-center justify-between mb-2">
                 <span className={cn("text-sm font-medium", isCurrentDay && "text-primary")}>
                   {format(date, "d")}
                 </span>
                 {isCurrentDay && (
                   <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                     Today
                   </span>
                 )}
               </div>
 
              <div className="space-y-2">
                {viewMode === "day" ? (
                  <div className="space-y-1">
                    {Array.from({ length: 96 }, (_, i) => i).map((i) => {
                      const h = Math.floor(i / 4)
                      const m = (i % 4) * 15
                      const hh = String(h).padStart(2, "0")
                      const mm = String(m).padStart(2, "0")
                      const label = `${hh}:${mm}`
                      const postsAtSlot = posts.filter((p) => String(p.time || "") === label)
                      const allowed = isSlotAllowed(label, draggedPost)
                      return (
                        <div
                          key={i}
                          className={cn("min-h-10 p-1 rounded-lg", allowed ? "bg-muted/20" : "bg-destructive/10")}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={() => setGhostTime(label)}
                          onDragLeave={() => { if (ghostTime === label) setGhostTime(null) }}
                          onDrop={async () => {
                            if (!draggedPost || !allowed) return
                            try {
                              const iso = new Date(`${format(date, "yyyy-MM-dd")}T${label}:00`).toISOString()
                              await api.updatePost(draggedPost.id, { content: draggedPost.content, scheduledAt: iso })
                              setDraggedPost(null)
                              setGhostTime(null)
                              window.dispatchEvent(new Event("posts:refresh"))
                            } catch {}
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-[11px] text-muted-foreground">{label}</span>
                            <div className="flex-1 space-y-1">
                              {ghostTime === label && draggedPost ? (
                                <div className={cn("p-2 rounded-lg border border-dashed text-[11px]", allowed ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/10")}>
                                  {draggedPost.content}
                                  {!allowed ? <div className="mt-1 text-[10px] text-destructive">Nie można publikować w tym czasie</div> : null}
                                </div>
                              ) : null}
                              <AnimatePresence>
                                {postsAtSlot.map((post) => (
                                  <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="p-2 rounded-lg bg-muted/40 hover:bg-muted flex items-center gap-2 cursor-grab"
                                    draggable
                                    onDragStart={() => setDraggedPost(post)}
                                    onDragEnd={() => setDraggedPost(null)}
                                    onClick={() => {
                                      const md = parseInt(mm, 10)
                                      setSelectedEdit({ post, date, minute: md })
                                    }}
                                  >
                                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{post.content}</p>
                                      <p className="text-[11px] text-muted-foreground">{post.time}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      {post.platforms.map((p) => (
                                        <TooltipProvider key={p}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className={cn("w-5 h-5 rounded-full", platformColors[p])} title={p} />
                                            </TooltipTrigger>
                                            <TooltipContent>{p}</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ))}
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                              {selectedEdit && postsAtSlot.some(p => p.id === selectedEdit.post.id) ? (
                                <div className="mt-1 p-2 rounded-lg bg-background border border-border">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12">{label}</span>
                                    <input
                                      type="range"
                                      min={0}
                                      max={59}
                                      value={selectedEdit.minute}
                                      onChange={(e) => setSelectedEdit({ ...selectedEdit, minute: parseInt(e.target.value, 10) })}
                                      className="flex-1"
                                    />
                                    <span className="text-xs w-10">{String(selectedEdit.minute).padStart(2, "0")}</span>
                                    <button
                                      className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs"
                                      onClick={async () => {
                                        try {
                                          const hour = label.slice(0,2)
                                          const newLabel = `${hour}:${String(selectedEdit.minute).padStart(2,"0")}`
                                          const iso = new Date(`${format(selectedEdit.date, "yyyy-MM-dd")}T${newLabel}:00`).toISOString()
                                          await api.updatePost(selectedEdit.post.id, { content: selectedEdit.post.content, scheduledAt: iso })
                                          setSelectedEdit(null)
                                          window.dispatchEvent(new Event("posts:refresh"))
                                        } catch {}
                                      }}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <AnimatePresence>
                    {posts.map((post) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="p-2 rounded-lg bg-muted/40 hover:bg-muted flex items-center gap-2 cursor-grab"
                        draggable
                        onDragStart={() => setDraggedPost(post)}
                        onDragEnd={() => setDraggedPost(null)}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{post.content}</p>
                          <p className="text-[11px] text-muted-foreground">{post.time}</p>
                        </div>
                        <div className="flex gap-1">
                          {post.platforms.map((p) => (
                            <TooltipProvider key={p}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn("w-5 h-5 rounded-full", platformColors[p])} title={p} />
                                </TooltipTrigger>
                                <TooltipContent>{p}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="w-7 h-7 rounded-lg hover:bg-background flex items-center justify-center">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="w-7 h-7 rounded-lg hover:bg-background flex items-center justify-center">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="w-7 h-7 rounded-lg hover:bg-background flex items-center justify-center">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
             </motion.div>
           )
         })}
       </div>
     </div>
   )
 }
export default CalendarView
