 "use client"
 
 import { useState, useEffect } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import {
   Sparkles,
   Calendar,
   ChevronRight,
   ChevronLeft,
   Check,
   Wand2,
   RefreshCw,
   Edit2,
   Trash2,
   Clock,
   CheckCircle2,
 } from "lucide-react"
 import { format, addDays } from "date-fns"
 import { cn } from "@/lib/utils"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Textarea } from "@/components/ui/textarea"
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select"
 import { Checkbox } from "@/components/ui/checkbox"
 import confetti from "canvas-confetti"
 
 const platforms = [
   { id: "instagram", label: "Instagram", color: "from-pink-500 to-purple-600" },
   { id: "facebook", label: "Facebook", color: "from-blue-600 to-blue-500" },
   { id: "twitter", label: "Twitter/X", color: "from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200" },
   { id: "linkedin", label: "LinkedIn", color: "from-blue-700 to-blue-600" },
   { id: "tiktok", label: "TikTok", color: "from-cyan-400 to-pink-500" },
 ]
 
 const mockGeneratedPosts = [
   {
     id: "1",
     content: "Discover how our innovative solutions are transforming the way businesses operate. The future is here, and it's exciting! #Innovation #Tech #Business",
     platform: "instagram",
     scheduledTime: "9:00 AM",
     scheduledDate: addDays(new Date(), 1),
   },
   {
     id: "2",
     content: "Quick tip: Consistency is key in social media marketing. Post regularly, engage with your audience, and watch your community grow! What's your best social media tip?",
     platform: "twitter",
     scheduledTime: "12:00 PM",
     scheduledDate: addDays(new Date(), 1),
   },
   {
     id: "3",
     content: "We're proud to announce a new milestone! Thanks to our amazing community for the continued support. Here's what's coming next...",
     platform: "linkedin",
     scheduledTime: "3:00 PM",
     scheduledDate: addDays(new Date(), 2),
   },
   {
     id: "4",
     content: "Behind the scenes: Our team is hard at work creating something special for you. Stay tuned for the big reveal! #ComingSoon #BTS",
     platform: "instagram",
     scheduledTime: "5:00 PM",
     scheduledDate: addDays(new Date(), 2),
   },
   {
     id: "5",
     content: "Monday motivation: Every great achievement starts with the decision to try. What are you working towards this week? Share your goals below!",
     platform: "facebook",
     scheduledTime: "8:00 AM",
     scheduledDate: addDays(new Date(), 3),
   },
 ]
 
 interface CampaignWizardProps { onComplete?: () => void }
 
 export function CampaignWizard({ onComplete }: CampaignWizardProps) {
   const [step, setStep] = useState(1)
   const [isGenerating, setIsGenerating] = useState(false)
   const [generationProgress, setGenerationProgress] = useState(0)
   const [generatedPosts, setGeneratedPosts] = useState<typeof mockGeneratedPosts>([])
   const [selectedPosts, setSelectedPosts] = useState<string[]>([])
 
   const [topic, setTopic] = useState("")
   const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "twitter"])
   const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
   const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"))
   const [tone, setTone] = useState("professional")
   const [postsPerDay, setPostsPerDay] = useState("2")
   const [autoHashtags, setAutoHashtags] = useState(true)
 
   const togglePlatform = (platformId: string) => {
     setSelectedPlatforms((prev) =>
       prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
     )
  }
 
   const handleGenerate = async () => {
     setIsGenerating(true)
     setGenerationProgress(0)
     const progressInterval = setInterval(() => {
       setGenerationProgress((prev) => {
         if (prev >= 100) {
           clearInterval(progressInterval)
           return 100
         }
         return prev + Math.random() * 15
       })
     }, 300)
     await new Promise((resolve) => setTimeout(resolve, 3000))
     clearInterval(progressInterval)
     setGenerationProgress(100)
     await new Promise((resolve) => setTimeout(resolve, 500))
     setGeneratedPosts(mockGeneratedPosts)
     setSelectedPosts(mockGeneratedPosts.map((p) => p.id))
     setIsGenerating(false)
     setStep(3)
     confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
   }
 
   const handleSchedule = () => {
     confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } })
     onComplete?.()
   }
 
   const togglePostSelection = (postId: string) => {
     setSelectedPosts((prev) =>
       prev.includes(postId) ? prev.filter((p) => p !== postId) : [...prev, postId]
     )
   }
 
   return (
     <div className="p-6 max-w-4xl mx-auto">
       <div className="mb-8">
         <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
           <Sparkles className="w-6 h-6 text-primary" />
           Create AI Campaign
         </h2>
         <p className="text-muted-foreground mt-1">
           Let AI generate engaging content for your social media campaign
         </p>
       </div>
 
       <div className="flex items-center justify-center gap-4 mb-10">
         {[1, 2, 3].map((s) => (
           <div key={s} className="flex items-center gap-3">
             <motion.div
               animate={{
                 scale: step === s ? 1.1 : 1,
                 backgroundColor: step >= s ? "var(--primary)" : "var(--muted)",
               }}
               className={cn(
                 "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                 step >= s ? "text-primary-foreground" : "text-muted-foreground"
               )}
             >
               {step > s ? <Check className="w-5 h-5" /> : s}
             </motion.div>
             <span
               className={cn(
                 "text-sm font-medium hidden sm:block",
                 step >= s ? "text-foreground" : "text-muted-foreground"
               )}
             >
               {s === 1 ? "Topic & Platforms" : s === 2 ? "AI Settings" : "Review & Schedule"}
             </span>
             {s < 3 && <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />}
           </div>
         ))}
       </div>
 
       {step === 1 && (
         <div className="space-y-6">
           <div className="space-y-2">
             <Label>Campaign Topic</Label>
             <Input placeholder="Describe your campaign goal" value={topic} onChange={(e) => setTopic(e.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Platforms</Label>
             <div className="flex gap-2">
               {platforms.map((platform) => (
                 <motion.button
                   key={platform.id}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => togglePlatform(platform.id)}
                   className={cn(
                     "relative w-12 h-12 rounded-xl transition-all",
                     selectedPlatforms.includes(platform.id) ? cn("bg-gradient-to-br text-white", platform.color) : "bg-muted text-muted-foreground hover:bg-muted/80"
                   )}
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
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label>Start Date</Label>
               <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label>End Date</Label>
               <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
             </div>
           </div>
           <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(2)} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium">
             Next
           </motion.button>
         </div>
       )}
 
       {step === 2 && (
         <div className="space-y-6">
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label>Tone</Label>
               <Select value={tone} onValueChange={setTone}>
                 <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="professional">Professional</SelectItem>
                   <SelectItem value="casual">Casual</SelectItem>
                   <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Posts per Day</Label>
               <Select value={postsPerDay} onValueChange={setPostsPerDay}>
                 <SelectTrigger><SelectValue placeholder="Select count" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="1">1</SelectItem>
                   <SelectItem value="2">2</SelectItem>
                   <SelectItem value="3">3</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <Checkbox checked={autoHashtags} onCheckedChange={(v) => setAutoHashtags(Boolean(v))} />
             <span className="text-sm">Auto-generate hashtags</span>
           </div>
           <div className="flex items-center justify-between">
             <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(1)} className="h-9 px-4 rounded-lg bg-muted">
               Back
             </motion.button>
             <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerate} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground flex items-center gap-2">
               <Wand2 className="w-4 h-4" /> Generate AI Posts
             </motion.button>
           </div>
         </div>
       )}
 
       {step === 3 && (
         <div className="space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold">Review Generated Posts</h3>
             <div className="text-sm text-muted-foreground">Progress: {generationProgress}%</div>
           </div>
           <div className="space-y-3">
             {generatedPosts.map((post) => (
               <div key={post.id} className={cn("p-3 rounded-lg border", selectedPosts.includes(post.id) ? "border-primary" : "border-border")}>
                 <div className="flex items-center justify-between">
                   <div className="font-medium">{post.content}</div>
                   <div className="text-xs text-muted-foreground">{format(post.scheduledDate, "MMM d")} • {post.scheduledTime}</div>
                 </div>
                 <div className="flex items-center gap-2 mt-2">
                   <Checkbox checked={selectedPosts.includes(post.id)} onCheckedChange={() => togglePostSelection(post.id)} />
                   <span className="text-sm">Include in campaign</span>
                 </div>
               </div>
             ))}
           </div>
           <div className="flex items-center justify-between">
             <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(2)} className="h-9 px-4 rounded-lg bg-muted">
               Back
             </motion.button>
             <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSchedule} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground flex items-center gap-2">
               <Calendar className="w-4 h-4" /> Schedule Selected
             </motion.button>
           </div>
         </div>
       )}
     </div>
   )
 }
export default CampaignWizard
