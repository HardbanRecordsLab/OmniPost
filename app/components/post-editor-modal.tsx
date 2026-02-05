"use client"

import { useState } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import { X, ImageIcon, Smile, Hash, Calendar, Clock, Sparkles, Send, Check } from "lucide-react"
 import { format, addDays } from "date-fns"
 import { cn } from "@/lib/utils"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Textarea } from "@/components/ui/textarea"
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
 import confetti from "canvas-confetti"
import { api } from "@/lib/api"
 
 const platforms = [
   { id: "instagram", label: "IG", color: "from-pink-500 to-purple-600" },
   { id: "facebook", label: "FB", color: "from-blue-600 to-blue-500" },
   { id: "twitter", label: "X", color: "from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200" },
   { id: "linkedin", label: "LI", color: "from-blue-700 to-blue-600" },
 ]
 
 interface PostEditorModalProps { open: boolean; onClose: () => void }
 
 export function PostEditorModal({ open, onClose }: PostEditorModalProps) {
   const [content, setContent] = useState("")
   const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"])
   const [scheduleType, setScheduleType] = useState<"now" | "later">("later")
   const [scheduleDate, setScheduleDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"))
   const [scheduleTime, setScheduleTime] = useState("10:00")
   const [isSubmitting, setIsSubmitting] = useState(false)
   const [showSuccess, setShowSuccess] = useState(false)
 
   const maxCharacters = 280
   const characterCount = content.length
 
   const togglePlatform = (platformId: string) => {
     setSelectedPlatforms((prev) => (prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]))
   }
 
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const when = scheduleType === "now"
        ? new Date().toISOString()
        : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
      await api.createPost({
        content,
        scheduledAt: when,
        status: "scheduled",
        platformIds: selectedPlatforms,
        mediaUrls: []
      })
      setIsSubmitting(false)
      setShowSuccess(true)
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      try {
        window.dispatchEvent(new Event("posts:refresh"))
      } catch {}
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
        setContent("")
        setSelectedPlatforms(["instagram", "facebook"])
        setScheduleType("later")
      }, 1500)
    } catch {
      setIsSubmitting(false)
    }
  }
 
   return (
     <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
         <AnimatePresence mode="wait">
           {showSuccess ? (
             <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-12 flex flex-col items-center justify-center text-center">
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }} className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
                 <Check className="w-10 h-10 text-white" />
               </motion.div>
               <h3 className="text-xl font-semibold mb-2">Post Scheduled!</h3>
               <p className="text-muted-foreground">Your post will be published on {format(new Date(scheduleDate), "MMM d")} at {scheduleTime}</p>
             </motion.div>
           ) : (
             <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <DialogHeader className="p-6 pb-0">
                 <DialogTitle className="text-xl">Create New Post</DialogTitle>
               </DialogHeader>
               <div className="p-6 space-y-6">
                 <div className="space-y-3">
                   <Label>Platforms</Label>
                   <div className="flex gap-2">
                     {platforms.map((platform) => (
                       <motion.button
                         key={platform.id}
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => togglePlatform(platform.id)}
                         className={cn("relative w-12 h-12 rounded-xl transition-all",
                           selectedPlatforms.includes(platform.id) ? cn("bg-gradient-to-br text-white", platform.color) : "bg-muted text-muted-foreground hover:bg-muted/80")}
                       >
                         <span className="text-sm font-semibold">{platform.label}</span>
                         {selectedPlatforms.includes(platform.id) && (
                           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                             <Check className="w-3 h-3 text-white" />
                           </motion.div>
                         )}
                       </motion.button>
                     ))}
                   </div>
                 </div>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label>Content</Label>
                     <span className={cn("text-xs", characterCount > maxCharacters ? "text-destructive" : "text-muted-foreground")}>
                       {characterCount}/{maxCharacters}
                     </span>
                   </div>
                   <div className="relative">
                     <Textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[150px] resize-none pr-12" />
                     <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                       <Sparkles className="w-4 h-4" />
                     </motion.button>
                   </div>
                   <div className="flex gap-2">
                     <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors">
                       <ImageIcon className="w-4 h-4" />
                       Add Media
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors">
                       <Smile className="w-4 h-4" />
                       Emoji
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors">
                       <Hash className="w-4 h-4" />
                       Hashtags
                     </motion.button>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Schedule Date</Label>
                     <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <Label>Schedule Time</Label>
                     <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                   </div>
                 </div>
                 <div className="flex items-center justify-between">
                   <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setScheduleType(scheduleType === "now" ? "later" : "now")} className="h-9 px-4 rounded-lg bg-muted">
                     {scheduleType === "now" ? <Clock className="w-4 h-4 inline mr-2" /> : <Calendar className="w-4 h-4 inline mr-2" />} {scheduleType === "now" ? "Schedule Later" : "Post Now"}
                   </motion.button>
                   <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} className={cn("h-9 px-4 rounded-lg bg-primary text-primary-foreground flex items-center gap-2", isSubmitting && "opacity-50 pointer-events-none")}>
                     <Send className="w-4 h-4" /> {isSubmitting ? "Scheduling..." : "Schedule Post"}
                   </motion.button>
                 </div>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </DialogContent>
     </Dialog>
   )
 }
export default PostEditorModal
