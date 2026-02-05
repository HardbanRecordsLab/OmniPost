 "use client"
 
import { useEffect, useState } from "react"
 import { motion } from "framer-motion"
 import { Link2, RefreshCw, Check, AlertCircle, Plus, Clock, Save, TestTube, Eye, EyeOff } from "lucide-react"
 import { cn } from "@/lib/utils"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Switch } from "@/components/ui/switch"
 import { Button } from "@/components/ui/button"
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
 import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
 
const gradientById: Record<string, string> = {
  instagram: "from-pink-500 to-purple-600",
  facebook: "from-blue-600 to-blue-500",
  twitter: "from-gray-900 to-gray-800",
  linkedin: "from-blue-700 to-blue-600",
  tiktok: "from-cyan-400 to-pink-500",
  youtube: "from-red-600 to-red-500",
  telegram: "from-sky-500 to-sky-400",
  discord: "from-indigo-600 to-indigo-500",
  reddit: "from-orange-500 to-red-500",
  pinterest: "from-red-700 to-red-600",
  bluesky: "from-blue-400 to-blue-300"
}
 
 const defaultTimeSlots = { weekdays: ["9:00 AM", "2:00 PM", "6:00 PM"], weekends: ["11:00 AM", "4:00 PM"] }
 type SettingsTab = "platforms" | "bridge" | "scheduling"
 
 export function SettingsView() {
   const [activeTab, setActiveTab] = useState<SettingsTab>("platforms")
   const [bridgeUrl, setBridgeUrl] = useState("https://your-vps.example.com")
   const [secretKey, setSecretKey] = useState("••••••••••••••••••••")
   const [showSecretKey, setShowSecretKey] = useState(false)
   const [isTesting, setIsTesting] = useState(false)
   const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
   const [autoOptimize, setAutoOptimize] = useState(true)
   const [weekdaySlots, setWeekdaySlots] = useState(defaultTimeSlots.weekdays)
   const [weekendSlots, setWeekendSlots] = useState(defaultTimeSlots.weekends)
  const [platforms, setPlatforms] = useState<Array<{ id: string; name: string; status: string; accountInfo?: string }>>([])
  const [loadingPlatforms, setLoadingPlatforms] = useState(false)
  const [logs, setLogs] = useState<Array<{ ts: number; platformId: string; postId?: string; event: string; message?: string; retryCount?: number }>>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [windows, setWindows] = useState<Array<{ platformId: string; startHour: number; endHour: number; enabled: number }>>([])
  const [windowsLoading, setWindowsLoading] = useState(false)
  const [logPlatformFilter, setLogPlatformFilter] = useState<string>('all')
  const [logEventFilter, setLogEventFilter] = useState<string>('all')
  const [plans, setPlans] = useState<Array<{ id: string; name: string; priceCents: number; currency: string; period: string; features: string }>>([])
  const [license, setLicense] = useState<{ key: string; status: string; validUntil: string; planId: string } | null>(null)
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
 
   const tabs: { id: SettingsTab; label: string }[] = [
     { id: "platforms", label: "Connected Platforms" },
     { id: "bridge", label: "VPS Bridge" },
     { id: "scheduling", label: "Scheduling" },
   ]
 
  useEffect(() => {
    const load = async () => {
      setLoadingPlatforms(true)
      try {
        const data = await api.getPlatforms()
        setPlatforms(data)
      } catch (e) {
      } finally {
        setLoadingPlatforms(false)
      }
    }
    load()
  }, [])
  useEffect(() => {
    let t: any
    const loadLogs = async () => {
      setLogsLoading(true)
      try {
        const data = await api.getPublishLogs()
        setLogs(data)
      } catch (e) {
      } finally {
        setLogsLoading(false)
      }
    }
    loadLogs()
    t = setInterval(loadLogs, 5000)
    return () => {
      if (t) clearInterval(t)
    }
  }, [])
  useEffect(() => {
    const loadWindows = async () => {
      setWindowsLoading(true)
      try {
        const rows = await api.getWindows()
        setWindows(rows)
      } catch (e) {
      } finally {
        setWindowsLoading(false)
      }
    }
    loadWindows()
  }, [])
  useEffect(() => {
    const loadBilling = async () => {
      try {
        const p = await api.getPlans()
        setPlans(p)
      } catch {}
      try {
        const s = await api.getLicenseStatus()
        setLicense(s)
      } catch {}
    }
    loadBilling()
  }, [])

   const handleTestConnection = async () => {
     setIsTesting(true)
     setTestResult(null)
     await new Promise((resolve) => setTimeout(resolve, 2000))
     setTestResult(Math.random() > 0.3 ? "success" : "error")
     setIsTesting(false)
   }
 
   return (
     <div className="p-6 space-y-6">
       <div>
         <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
         <p className="text-muted-foreground mt-1">Manage your account, connected platforms, and preferences</p>
       </div>
 
       <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
         {tabs.map((tab) => (
           <motion.button
             key={tab.id}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => setActiveTab(tab.id)}
             className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeTab === tab.id ? "bg-background" : "hover:bg-background/50")}
           >
             {tab.label}
           </motion.button>
         ))}
       </div>
 
       {activeTab === "platforms" && (
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
             <motion.div key={platform.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden">
               <div className="p-4 space-y-3">
                 <div className="flex items-center justify-between">
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white", gradientById[platform.id] || "from-gray-700 to-gray-600")}>
                     <Link2 className="w-5 h-5" />
                   </div>
                  {platform.status === "enabled" ? (
                     <Badge className="bg-green-500/10 text-green-500">Connected</Badge>
                   ) : (
                     <Badge className="bg-yellow-500/10 text-yellow-500">Not Connected</Badge>
                   )}
                 </div>
                 <div className="space-y-1">
                   <h3 className="text-lg font-semibold">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">{platform.accountInfo || "No handle"}</p>
                 </div>
                 <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await api.togglePlatform(platform.id, "disabled")
                      const data = await api.getPlatforms()
                      setPlatforms(data)
                    }}
                    disabled={loadingPlatforms || platform.status !== "enabled"}
                  >
                    Manage
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await api.togglePlatform(platform.id, "enabled")
                      const data = await api.getPlatforms()
                      setPlatforms(data)
                    }}
                    disabled={loadingPlatforms || platform.status === "enabled"}
                  >
                    Connect
                  </Button>
                 </div>
               </div>
             </motion.div>
           ))}
         </div>
      )}
 
       {activeTab === "bridge" && (
         <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Access</CardTitle>
              <CardDescription>Zarządzaj planem i dostępem do aplikacji</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={cn(license ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                    {license ? `Active until ${new Date(license.validUntil).toLocaleDateString()}` : "No active license"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Enter license key" value={licenseKeyInput} onChange={(e) => setLicenseKeyInput(e.target.value)} />
                  <Button
                    onClick={async () => {
                      if (!licenseKeyInput.trim()) return
                      await api.activateLicense(licenseKeyInput.trim(), 1, plans[0]?.id || 'basic-monthly')
                      const s = await api.getLicenseStatus()
                      setLicense(s)
                    }}
                  >
                    Activate Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await api.activateTrial({ months: 0, planId: plans[0]?.id || 'basic-monthly' })
                      const s = await api.getLicenseStatus()
                      setLicense(s)
                    }}
                  >
                    Activate Trial
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <Badge variant="outline">{(p.priceCents / 100).toFixed(2)} {p.currency} / {p.period}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{p.features}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await api.activateTrial({ months: 0, planId: p.id })
                          const s = await api.getLicenseStatus()
                          setLicense(s)
                        }}
                      >
                        Try Trial
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!licenseKeyInput.trim()) return
                          await api.activateLicense(licenseKeyInput.trim(), 1, p.id)
                          const s = await api.getLicenseStatus()
                          setLicense(s)
                        }}
                      >
                        Activate
                      </Button>
                    </div>
                  </div>
                ))}
                {!plans.length && (
                  <div className="rounded-xl border border-border p-4 text-muted-foreground">No plans</div>
                )}
              </div>
            </CardContent>
          </Card>
           <div className="space-y-2">
             <Label>VPS Bridge URL</Label>
             <Input value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} placeholder="https://your-vps.example.com" />
           </div>
           <div className="space-y-2">
             <Label>Secret Key</Label>
             <div className="flex items-center gap-2">
               <Input type={showSecretKey ? "text" : "password"} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
               <Button variant="outline" onClick={() => setShowSecretKey((v) => !v)}>{showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
               <TestTube className="w-4 h-4 mr-2" /> Test Connection
             </Button>
             {isTesting && <span className="text-sm text-muted-foreground">Testing...</span>}
             {testResult === "success" && <span className="text-sm text-green-500">Success</span>}
             {testResult === "error" && <span className="text-sm text-red-500">Error</span>}
           </div>
          <Card>
            <CardHeader>
              <CardTitle>Publish Windows</CardTitle>
              <CardDescription>Skonfiguruj okna publikacji dla platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2">Platform</th>
                        <th className="text-left px-3 py-2">Enabled</th>
                        <th className="text-left px-3 py-2">Start Hour</th>
                        <th className="text-left px-3 py-2">End Hour</th>
                        <th className="text-left px-3 py-2">Min Gap (min)</th>
                        <th className="text-left px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platforms.map((p) => {
                        const row = windows.find(w => w.platformId === p.id) || { platformId: p.id, startHour: 8, endHour: 22, enabled: 1, minGapMinutes: 0 }
                        return (
                          <tr key={p.id} className="border-t border-border">
                            <td className="px-3 py-2">
                              <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br inline-flex items-center justify-center text-white mr-2", gradientById[p.id] || "from-gray-700 to-gray-600")} />
                              <span className="align-middle capitalize">{p.id}</span>
                            </td>
                            <td className="px-3 py-2">
                              <Switch checked={row.enabled === 1} onCheckedChange={(v) => {
                                const next = windows.map(w => w.platformId === p.id ? { ...row, enabled: v ? 1 : 0 } : w)
                                if (!windows.find(w => w.platformId === p.id)) next.push({ ...row, enabled: v ? 1 : 0 })
                                setWindows(next)
                              }} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={0} max={23} value={row.startHour} onChange={(e) => {
                                const val = Math.max(0, Math.min(23, parseInt(e.target.value || "0", 10)))
                                const next = windows.map(w => w.platformId === p.id ? { ...row, startHour: val } : w)
                                if (!windows.find(w => w.platformId === p.id)) next.push({ ...row, startHour: val })
                                setWindows(next)
                              }} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={0} max={23} value={row.endHour} onChange={(e) => {
                                const val = Math.max(0, Math.min(23, parseInt(e.target.value || "0", 10)))
                                const next = windows.map(w => w.platformId === p.id ? { ...row, endHour: val } : w)
                                if (!windows.find(w => w.platformId === p.id)) next.push({ ...row, endHour: val })
                                setWindows(next)
                              }} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={0} max={240} value={row.minGapMinutes} onChange={(e) => {
                                const val = Math.max(0, Math.min(240, parseInt(e.target.value || "0", 10)))
                                const next = windows.map(w => w.platformId === p.id ? { ...row, minGapMinutes: val } : w)
                                if (!windows.find(w => w.platformId === p.id)) next.push({ ...row, minGapMinutes: val })
                                setWindows(next)
                              }} />
                            </td>
                            <td className="px-3 py-2">
                              <Button size="sm" onClick={async () => {
                                const payload = windows.find(w => w.platformId === p.id) || row
                                await api.upsertWindow(payload)
                              }}>
                                <Save className="w-4 h-4 mr-2" /> Save
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                      {!platforms.length && (
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground" colSpan={5}>{windowsLoading ? "Loading..." : "No platforms"}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Label>Publish Logs</Label>
            <div className="flex items-center gap-2 mb-2">
              <select className="px-2 py-1 rounded-md bg-muted" value={logPlatformFilter} onChange={(e) => setLogPlatformFilter(e.target.value)}>
                <option value="all">All platforms</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
              <select className="px-2 py-1 rounded-md bg-muted" value={logEventFilter} onChange={(e) => setLogEventFilter(e.target.value)}>
                <option value="all">All events</option>
                <option value="publish_success">publish_success</option>
                <option value="publish_error">publish_error</option>
                <option value="manual_trigger_success">manual_trigger_success</option>
                <option value="manual_trigger_error">manual_trigger_error</option>
                <option value="adapter_missing">adapter_missing</option>
                <option value="validation_failed">validation_failed</option>
              </select>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Time</th>
                      <th className="text-left px-3 py-2">Platform</th>
                      <th className="text-left px-3 py-2">Event</th>
                      <th className="text-left px-3 py-2">Message</th>
                      <th className="text-left px-3 py-2">Retry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.filter(l => (logPlatformFilter === 'all' || l.platformId === logPlatformFilter) && (logEventFilter === 'all' || l.event === logEventFilter)).map((l, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">{new Date(l.ts).toLocaleTimeString()}</td>
                        <td className="px-3 py-2 capitalize">{l.platformId}</td>
                        <td className="px-3 py-2">{l.event}</td>
                        <td className="px-3 py-2">{l.message || ""}</td>
                        <td className="px-3 py-2">{typeof l.retryCount === "number" ? String(l.retryCount) : ""}</td>
                      </tr>
                    ))}
                    {!logs.length && (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground" colSpan={5}>{logsLoading ? "Loading..." : "No logs"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
         </div>
       )}
 
       {activeTab === "scheduling" && (
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label>Weekday Slots</Label>
             <div className="flex flex-wrap gap-2">
               {weekdaySlots.map((slot, i) => (
                 <Badge key={i} variant="outline">{slot}</Badge>
               ))}
             </div>
           </div>
           <div className="space-y-2">
             <Label>Weekend Slots</Label>
             <div className="flex flex-wrap gap-2">
               {weekendSlots.map((slot, i) => (
                 <Badge key={i} variant="outline">{slot}</Badge>
               ))}
             </div>
           </div>
           <div className="space-y-2">
             <Label>Auto-Optimize Scheduling</Label>
             <div className="flex items-center gap-2">
               <Switch checked={autoOptimize} onCheckedChange={(v) => setAutoOptimize(Boolean(v))} />
               <span className="text-sm text-muted-foreground">Use AI to optimize posting times</span>
             </div>
           </div>
           <div>
             <Button><Save className="w-4 h-4 mr-2" /> Save Preferences</Button>
           </div>
         </div>
       )}
     </div>
   )
 }
export default SettingsView
