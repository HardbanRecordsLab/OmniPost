"use client"

import { useState } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import { X, ImageIcon, Smile, Hash, Calendar, Clock, Sparkles, Send, Check, Loader2, RefreshCw, Eye } from "lucide-react"
 import { format, addDays } from "date-fns"
 import { cn } from "@/lib/utils"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Textarea } from "@/components/ui/textarea"
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
 import { Button } from "@/components/ui/button"
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
 import { Badge } from "@/components/ui/badge"
 import confetti from "canvas-confetti"
import { api } from "@/lib/api"

interface PlatformVariant {
  platformId: string
  content: string
  hashtags: string[]
  charCount: number
  toneProfile: string
}
 
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
  
   // AI Variants state
   const [aiVariants, setAiVariants] = useState<PlatformVariant[]>([])
   const [isGeneratingVariants, setIsGeneratingVariants] = useState(false)
   const [showVariants, setShowVariants] = useState(false)
   const [activeVariants, setActiveVariants] = useState<Record<string, PlatformVariant>>({})

   const maxCharacters = 280
   const characterCount = content.length

   const togglePlatform = (platformId: string) => {
     setSelectedPlatforms((prev) => (prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]))
   }

   const generateVariants = async () => {
     if (!content.trim() || selectedPlatforms.length === 0) return
     
     setIsGeneratingVariants(true)
     try {
       const response = await api.post('/api/ai/variants', {
         baseContent: content,
         targetPlatforms: selectedPlatforms
       })
       
       const variants = response.data.variants || []
       setAiVariants(variants)
       
       // Set active variants for each platform
       const active: Record<string, PlatformVariant> = {}
       variants.forEach((variant: PlatformVariant) => {
         active[variant.platformId] = variant
       })
       setActiveVariants(active)
       setShowVariants(true)
     } catch (error) {
       console.error('Failed to generate variants:', error)
     } finally {
       setIsGeneratingVariants(false)
     }
   }

   const applyVariant = (platformId: string, variant: PlatformVariant) => {
     setActiveVariants(prev => ({
       ...prev,
       [platformId]: variant
     }))
   }

   const getPlatformCharacterLimit = (platformId: string): number => {
     const limits: Record<string, number> = {
       twitter: 280,
       instagram: 2200,
       facebook: 63206,
       linkedin: 3000
     }
     return limits[platformId] || 280
   }

   const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const when = scheduleType === "now"
        ? new Date().toISOString()
        : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
      
      // Prepare platform variants if available
      const platformVariants = Object.keys(activeVariants).length > 0 ? activeVariants : undefined
      
      await api.createPost({
        content,
        scheduledAt: when,
        status: "scheduled",
        platformIds: selectedPlatforms,
        mediaUrls: [],
        platformVariants
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
        setAiVariants([])
        setActiveVariants({})
        setShowVariants(false)
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
                     <motion.button 
                       whileHover={{ scale: 1.1 }} 
                       whileTap={{ scale: 0.9 }} 
                       onClick={generateVariants}
                       disabled={!content.trim() || selectedPlatforms.length === 0 || isGeneratingVariants}
                       className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {isGeneratingVariants ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
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
                     {aiVariants.length > 0 && (
                       <motion.button 
                         whileHover={{ scale: 1.05 }} 
                         whileTap={{ scale: 0.95 }}
                         onClick={() => setShowVariants(!showVariants)}
                         className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                           showVariants ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                         )}
                       >
                         <Eye className="w-4 h-4" />
                         AI Variants ({aiVariants.length})
                       </motion.button>
                     )}
                   </div>
                 </div>

                 {/* AI Variants Panel */}
                 <AnimatePresence>
                   {showVariants && aiVariants.length > 0 && (
                     <motion.div
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: "auto" }}
                       exit={{ opacity: 0, height: 0 }}
                       className="space-y-3 border-t pt-4"
                     >
                       <div className="flex items-center justify-between">
                         <Label className="text-sm font-medium">AI-Generated Variants</Label>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={generateVariants}
                           disabled={isGeneratingVariants}
                         >
                           <RefreshCw className={cn("w-4 h-4 mr-1", isGeneratingVariants && "animate-spin")} />
                           Regenerate
                         </Button>
                       </div>
                       <div className="grid gap-3">
                         {aiVariants.map((variant) => {
                           const platform = platforms.find(p => p.id === variant.platformId)
                           const isActive = activeVariants[variant.platformId]?.content === variant.content
                           const charLimit = getPlatformCharacterLimit(variant.platformId)
                           const isOverLimit = variant.charCount > charLimit
                           
                           return (
                             <Card key={variant.platformId} className={cn("border-2 transition-all", isActive ? "border-primary bg-primary/5" : "border-border")}>
                               <CardHeader className="pb-3">
                                 <div className="flex items-center justify-between">
                                   <CardTitle className="text-sm flex items-center gap-2">
                                     <span className={cn("px-2 py-1 rounded text-xs font-semibold text-white", platform?.color)}>
                                       {platform?.label}
                                     </span>
                                     <Badge variant="outline" className="text-xs">
                                       {variant.toneProfile}
                                     </Badge>
                                   </CardTitle>
                                   <div className="flex items-center gap-2">
                                     <span className={cn("text-xs", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
                                       {variant.charCount}/{charLimit}
                                     </span>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => applyVariant(variant.platformId, variant)}
                                       className="h-6 px-2"
                                     >
                                       {isActive ? <Check className="w-3 h-3" /> : "Apply"}
                                     </Button>
                                   </div>
                                 </div>
                               </CardHeader>
                               <CardContent className="pt-0">
                                 <p className="text-sm leading-relaxed mb-2">{variant.content}</p>
                                 {variant.hashtags.length > 0 && (
                                   <div className="flex flex-wrap gap-1">
                                     {variant.hashtags.map((tag, idx) => (
                                       <Badge key={idx} variant="secondary" className="text-xs">
                                         {tag}
                                       </Badge>
                                     ))}
                                   </div>
                                 )}
                               </CardContent>
                             </Card>
                           )
                         })}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
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
