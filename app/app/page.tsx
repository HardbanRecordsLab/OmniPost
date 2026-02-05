 "use client"
 
 import { useState, useEffect } from "react"
 import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/sidebar"
 import { Header } from "@/components/header"
 import { DashboardOverview } from "@/components/dashboard-overview"
 import { CalendarView } from "@/components/calendar-view"
 import { QueueView } from "@/components/queue-view"
 import { CampaignWizard } from "@/components/campaign-wizard"
 import { SettingsView } from "@/components/settings-view"
 import { PostEditorModal } from "@/components/post-editor-modal"
 
 export default function OmniPostDashboard() {
   const [activeView, setActiveView] = useState("dashboard")
   const [isDark, setIsDark] = useState(false)
   const [isPostEditorOpen, setIsPostEditorOpen] = useState(false)
 
   useEffect(() => {
     if (isDark) {
       document.documentElement.classList.add("dark")
     } else {
       document.documentElement.classList.remove("dark")
     }
   }, [isDark])
 
   const toggleTheme = () => setIsDark(!isDark)
 
   const renderContent = () => {
     switch (activeView) {
       case "dashboard":
         return <DashboardOverview />
       case "calendar":
         return <CalendarView onCreatePost={() => setIsPostEditorOpen(true)} />
       case "queue":
         return <QueueView />
       case "campaign":
         return <CampaignWizard onComplete={() => setActiveView("calendar")} />
       case "analytics":
         return <AnalyticsPlaceholder />
       case "settings":
         return <SettingsView />
       default:
         return <DashboardOverview />
     }
   }
 
   return (
     <div className="flex h-screen overflow-hidden bg-background gradient-mesh">
       <Sidebar activeView={activeView} onViewChange={setActiveView} />
       <div className="flex-1 flex flex-col overflow-hidden">
         <Header
           isDark={isDark}
           onToggleTheme={toggleTheme}
           onCreatePost={() => setIsPostEditorOpen(true)}
         />
         <main className="flex-1 overflow-y-auto">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeView}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
             >
               {renderContent()}
             </motion.div>
           </AnimatePresence>
         </main>
       </div>
       <PostEditorModal
         open={isPostEditorOpen}
         onClose={() => setIsPostEditorOpen(false)}
       />
     </div>
   )
 }
 
 function AnalyticsPlaceholder() {
   return (
     <div className="p-6">
       <h2 className="text-2xl font-semibold text-foreground mb-6">Analytics</h2>
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="flex flex-col items-center justify-center py-24 text-center"
       >
         <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
           <motion.div
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
           >
             <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
             </svg>
           </motion.div>
         </div>
         <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
         <p className="text-muted-foreground max-w-md">
           We're building powerful analytics to help you understand your audience and optimize your content strategy.
         </p>
       </motion.div>
     </div>
   )
 }
