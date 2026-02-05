 "use client"
 
 import { useState } from "react"
 import { motion, AnimatePresence } from "framer-motion"
 import { Bell, Search, Moon, Sun, Plus, ChevronDown, User, LogOut, Settings } from "lucide-react"
 import { cn } from "@/lib/utils"
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
 
 interface HeaderProps {
   isDark: boolean
   onToggleTheme: () => void
   onCreatePost: () => void
 }
 
 const notifications = [
   { id: 1, title: "Post published!", message: "Your Instagram post went live", time: "2m ago", read: false },
   { id: 2, title: "Campaign complete", message: "AI generated 12 posts", time: "1h ago", read: false },
   { id: 3, title: "New follower milestone", message: "You reached 10k followers!", time: "3h ago", read: true },
 ]
 
 export function Header({ isDark, onToggleTheme, onCreatePost }: HeaderProps) {
   const [searchFocused, setSearchFocused] = useState(false)
   const [showNotifications, setShowNotifications] = useState(false)
   const unreadCount = notifications.filter((n) => !n.read).length
 
   return (
     <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
       <motion.div animate={{ width: searchFocused ? 400 : 300 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <input
           type="text"
           placeholder="Search posts, campaigns..."
           onFocus={() => setSearchFocused(true)}
           onBlur={() => setSearchFocused(false)}
           className={cn("w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent", "text-sm placeholder:text-muted-foreground", "focus:outline-none focus:border-primary/50 focus:bg-background", "transition-all duration-200")}
         />
       </motion.div>
 
       <div className="flex items-center gap-3">
         <motion.button onClick={onCreatePost} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
           <Plus className="w-4 h-4" />
           <span>Create Post</span>
         </motion.button>
 
         <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
           <DropdownMenuTrigger asChild>
             <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative w-10 h-10 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors">
               <Bell className="w-5 h-5 text-muted-foreground" />
               {unreadCount > 0 && (
                 <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
                   {unreadCount}
                 </motion.span>
               )}
             </motion.button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-80">
             <div className="p-2 border-b border-border">
               <h3 className="font-semibold text-sm">Notifications</h3>
             </div>
             <div className="max-h-[300px] overflow-y-auto">
               {notifications.map((notification, index) => (
                 <motion.div key={notification.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className={cn("p-3 hover:bg-muted/50 cursor-pointer transition-colors", !notification.read && "bg-primary/5")}>
                   <div className="flex items-start gap-3">
                     {!notification.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                     <div className="flex-1">
                       <div className="flex items-center justify-between">
                         <h4 className="text-sm font-medium">{notification.title}</h4>
                         <span className="text-xs text-muted-foreground">{notification.time}</span>
                       </div>
                       <p className="text-xs text-muted-foreground">{notification.message}</p>
                     </div>
                   </div>
                 </motion.div>
               ))}
             </div>
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={onToggleTheme} className="flex items-center gap-2">
               {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               <span>Toggle Theme</span>
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem className="flex items-center gap-2">
               <User className="w-4 h-4" />
               <span>Profile</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="flex items-center gap-2">
               <Settings className="w-4 h-4" />
               <span>Settings</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="flex items-center gap-2">
               <LogOut className="w-4 h-4" />
               <span>Logout</span>
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
     </header>
   )
 }
export default Header
