"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Link2,
  Copy,
  Trash2,
  BarChart2,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"

interface TrackedLink {
  id: string
  userId: string
  slug: string
  originalUrl: string
  clickCount: number
  createdAt: string
}

interface ClickEntry {
  clickedAt: string
  userAgent: string | null
  referrer: string | null
  ipHash: string | null
}

interface LinkStats extends TrackedLink {
  clicks: ClickEntry[]
  referrerBreakdown: Record<string, number>
  uaBreakdown: Record<string, number>
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const row = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function truncate(str: string, max = 48) {
  return str.length > max ? str.slice(0, max) + "…" : str
}

export function LinkManagerView() {
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newAlias, setNewAlias] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState("")

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<TrackedLink | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Stats panel
  const [statsLink, setStatsLink] = useState<TrackedLink | null>(null)
  const [stats, setStats] = useState<LinkStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getLinks()
      setLinks(Array.isArray(data) ? data : data.links ?? [])
    } catch (err) {
      console.error("Failed to fetch links:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  async function handleCreate() {
    if (!newUrl.trim()) return
    setCreateLoading(true)
    setCreateError("")
    try {
      await api.createLink({
        originalUrl: newUrl.trim(),
        customAlias: newAlias.trim() || undefined,
      })
      setShowCreate(false)
      setNewUrl("")
      setNewAlias("")
      fetchLinks()
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create link")
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.deleteLink(deleteTarget.id)
      setDeleteTarget(null)
      fetchLinks()
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function openStats(link: TrackedLink) {
    setStatsLink(link)
    setStats(null)
    setStatsLoading(true)
    try {
      const data = await api.getLinkStats(link.id)
      setStats(data.stats ?? data)
    } catch (err) {
      console.error("Failed to load stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }

  function copySlug(slug: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
    navigator.clipboard.writeText(`${base}/r/${slug}`)
  }

  // Stats panel view
  if (statsLink) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStatsLink(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Link Stats</h2>
            <p className="text-muted-foreground text-sm">{statsLink.slug}</p>
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.clickCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Short URL</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <code className="text-sm font-mono">/r/{stats.slug}</code>
                  <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => copySlug(stats.slug)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formatDate(stats.createdAt)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Referrer breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Referrers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(stats.referrerBreakdown).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    Object.entries(stats.referrerBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([ref, count]) => (
                        <div key={ref} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[200px] text-muted-foreground">{ref}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* UA breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Agents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(stats.uaBreakdown).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                  ) : (
                    Object.entries(stats.uaBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([ua, count]) => (
                        <div key={ua} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate max-w-[200px] text-muted-foreground">{ua}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent clicks */}
            {stats.clicks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">Time</th>
                          <th className="text-left py-2 pr-4 font-medium">Referrer</th>
                          <th className="text-left py-2 font-medium">User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.clicks.slice(0, 20).map((click, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                              {new Date(click.clickedAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {truncate(click.referrer ?? "direct")}
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {truncate(click.userAgent ?? "unknown")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Failed to load stats.</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Link Manager</h2>
          <p className="text-muted-foreground">Track and shorten your URLs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLinks} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => { setShowCreate(true); setCreateError(""); setNewUrl(""); setNewAlias("") }}>
            <Plus className="mr-2 h-4 w-4" />
            New Link
          </Button>
        </div>
      </div>

      {/* Links table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Link2 className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No links yet</p>
          <p className="text-sm opacity-70">Create your first tracked link to get started.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <motion.table
              variants={container}
              initial="hidden"
              animate="show"
              className="w-full text-sm"
            >
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Slug</th>
                  <th className="text-left px-4 py-3 font-medium">Original URL</th>
                  <th className="text-left px-4 py-3 font-medium">Clicks</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {links.map(link => (
                  <motion.tr key={link.id} variants={row} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{link.slug}</code>
                        <button
                          onClick={() => copySlug(link.slug)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy short URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={link.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors max-w-xs"
                        title={link.originalUrl}
                      >
                        <span className="truncate">{truncate(link.originalUrl, 40)}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{link.clickCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(link.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => openStats(link)}
                          title="View stats"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(link)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          </div>
        </Card>
      )}

      {/* Create Link Dialog */}
      <Dialog open={showCreate} onOpenChange={open => !open && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Create Tracked Link
            </DialogTitle>
            <DialogDescription>
              Shorten a URL and track its clicks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Destination URL</label>
              <Input
                placeholder="https://example.com/your-long-url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Custom alias <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="my-link (a–z, 0–9, hyphens, max 50)"
                value={newAlias}
                onChange={e => setNewAlias(e.target.value)}
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <X className="h-3 w-3" />
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createLoading || !newUrl.trim()}>
              {createLoading ? "Creating…" : "Create Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Link
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the link{" "}
              <span className="font-medium">/r/{deleteTarget?.slug}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
