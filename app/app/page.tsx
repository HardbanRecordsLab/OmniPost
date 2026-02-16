 "use client"
 
 import { useState, useEffect } from "react"
 import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/sidebar"
 import { Header } from "@/components/header"
 import { DashboardOverview } from "@/components/dashboard-overview"
 import { CalendarView } from "@/components/calendar-view"
 import { QueueView } from "@/components/queue-view"
 import { CampaignWizard } from "@/components/campaign-wizard"
 import { AnalyticsView } from "@/components/analytics-view"
import { SettingsView } from "@/components/settings-view"
 import { PostEditorModal } from "@/components/post-editor-modal"
import { SocialAccountsManager } from "@/components/social-accounts-manager"
import PostScheduler from "@/components/post-scheduler"

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
      case "create":
        return <PostScheduler />
      case "integrations":
        return <SocialAccountsManager />
      case "analytics":
        return <AnalyticsView />
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
