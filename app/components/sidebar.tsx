 "use client"
 
 import React from "react"
 import { useState } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import { LayoutDashboard, Calendar, List, Sparkles, BarChart3, Settings, ChevronLeft, ChevronRight, HelpCircle, Crown } from "lucide-react"
 import { cn } from "@/lib/utils"
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
 
 const PlatformBadges = () => (
   <div className="flex items-center gap-2">
     <div className="w-6 h-6 rounded-full instagram-gradient" />
     <div className="w-6 h-6 rounded-full bg-[#1877F2]" />
     <div className="w-6 h-6 rounded-full bg-black dark:bg-white" />
     <div className="w-6 h-6 rounded-full bg-[#0A66C2]" />
   </div>
 )
 
 interface NavItem { icon: React.ElementType; label: string; id: string }
 const navItems: NavItem[] = [
   { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
   { icon: Calendar, label: "Calendar", id: "calendar" },
   { icon: List, label: "Queue", id: "queue" },
   { icon: Sparkles, label: "Create Campaign", id: "campaign" },
   { icon: BarChart3, label: "Analytics", id: "analytics" },
   { icon: Settings, label: "Settings", id: "settings" },
 ]
 
 interface SidebarProps { activeView: string; onViewChange: (view: string) => void }
 
 export function Sidebar({ activeView, onViewChange }: SidebarProps) {
   const [isCollapsed, setIsCollapsed] = useState(false)
   return (
     <TooltipProvider delayDuration={0}>
       <motion.aside initial={false} animate={{ width: isCollapsed ? 80 : 280 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
         <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
           <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
             <Sparkles className="w-5 h-5 text-primary-foreground" />
           </motion.div>
           <AnimatePresence>
             {!isCollapsed && (
               <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                 <h1 className="font-semibold text-lg text-sidebar-foreground">OmniPost</h1>
                 <p className="text-xs text-muted-foreground">AI-Powered</p>
               </motion.div>
             )}
           </AnimatePresence>
         </div>
 
         <nav className="flex-1 p-3 space-y-1">
           {navItems.map((item) => {
             const isActive = activeView === item.id
             const Icon = item.icon
             const button = (
               <motion.button key={item.id} onClick={() => onViewChange(item.id)} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group", isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                 {isActive && <motion.div layoutId="activeIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-full" transition={{ type: "spring", stiffness: 500, damping: 30 }} />}
                 <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                 <AnimatePresence>
                   {!isCollapsed && (
                     <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-sm font-medium">
                       {item.label}
                     </motion.span>
                   )}
                 </AnimatePresence>
               </motion.button>
             )
             return isCollapsed ? (
               <Tooltip key={item.id}>
                 <TooltipTrigger asChild>{button}</TooltipTrigger>
                 <TooltipContent side="right">{item.label}</TooltipContent>
               </Tooltip>
             ) : (
               button
             )
           })}
         </nav>
 
         <div className="p-3 border-t border-sidebar-border">
           <div className="flex items-center justify-between">
             <PlatformBadges />
             <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsCollapsed((v) => !v)} className="w-10 h-10 rounded-lg hover:bg-sidebar-accent flex items-center justify-center">
               {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
             </motion.button>
           </div>
         </div>
 
         <div className="p-3">
           {!isCollapsed ? (
             <div className="p-3 rounded-lg bg-sidebar-accent/40 border border-sidebar-border">
               <div className="flex items-center gap-2 text-sm">
                 <Crown className="w-4 h-4 text-sidebar-primary" />
                 <span>Upgrade to Pro</span>
               </div>
               <p className="text-xs text-muted-foreground mt-1">Unlock AI scheduling and campaign generation</p>
             </div>
           ) : null}
         </div>
       </motion.aside>
     </TooltipProvider>
   )
 }
export default Sidebar
