"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Image,
  Video,
  Search,
  Folder,
  Trash2,
  Paperclip,
  CheckSquare,
  RefreshCw,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"

interface MediaItem {
  id: string
  filename: string
  file_type: "image" | "video"
  file_size: number
  cdn_url: string
  thumbnail_url: string | null
  created_at: string
  width?: number
  height?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
}

export function MediaLibraryView() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [folder, setFolder] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Attach dialog
  const [attachTarget, setAttachTarget] = useState<MediaItem | null>(null)
  const [attachPostId, setAttachPostId] = useState("")
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachError, setAttachError] = useState("")

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (typeFilter !== "all") params.type = typeFilter
      if (search.trim()) params.search = search.trim()
      if (folder.trim()) params.folder = folder.trim()
      const data = await api.getMedia(params)
      setMedia(Array.isArray(data) ? data : data.media ?? [])
    } catch (err) {
      console.error("Failed to fetch media:", err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, search, folder])

  useEffect(() => {
    const timer = setTimeout(fetchMedia, 300)
    return () => clearTimeout(timer)
  }, [fetchMedia])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.deleteMedia(deleteTarget.id)
      setDeleteTarget(null)
      fetchMedia()
    } catch (err: any) {
      console.error("Delete failed:", err)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleAttach() {
    if (!attachTarget || !attachPostId.trim()) return
    setAttachLoading(true)
    setAttachError("")
    try {
      await api.attachMedia(attachTarget.id, attachPostId.trim())
      setAttachTarget(null)
      setAttachPostId("")
    } catch (err: any) {
      setAttachError(err.message ?? "Failed to attach media")
    } finally {
      setAttachLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Media Library</h2>
          <p className="text-muted-foreground">Manage your images and videos.</p>
        </div>
        <Button variant="outline" onClick={fetchMedia} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="relative flex-1 max-w-xs">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Folder…"
            className="pl-9"
            value={folder}
            onChange={e => setFolder(e.target.value)}
          />
        </div>

        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="self-center px-3 py-1.5">
            {selectedIds.size} selected
          </Badge>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Upload className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No media found</p>
          <p className="text-sm opacity-70">Upload images or videos to get started.</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {media.map(m => {
            const isSelected = selectedIds.has(m.id)
            const thumb = m.thumbnail_url ?? m.cdn_url
            return (
              <motion.div key={m.id} variants={item}>
                <Card
                  className={`overflow-hidden group cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-muted-foreground/30"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-muted">
                    {m.file_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={m.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={m.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Video className="h-10 w-10 text-muted-foreground opacity-50" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 rounded-full p-2">
                            <Video className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 opacity-90">
                        {m.file_type === "image" ? (
                          <Image className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <Video className="h-3 w-3 mr-1 inline" />
                        )}
                        {m.file_type}
                      </Badge>
                    </div>

                    {/* Select overlay */}
                    <button
                      onClick={() => toggleSelect(m.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Select"
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-background/80 border-muted-foreground"
                        }`}
                      >
                        {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  </div>

                  {/* Info + Actions */}
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-medium truncate" title={m.filename}>
                      {m.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(m.file_size)}</p>

                    <div className="flex gap-1 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs flex-1"
                        onClick={() => toggleSelect(m.id)}
                        title="Select"
                      >
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Select
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs flex-1"
                        onClick={() => { setAttachTarget(m); setAttachPostId(""); setAttachError("") }}
                        title="Attach to post"
                      >
                        <Paperclip className="h-3 w-3 mr-1" />
                        Attach
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(m)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Media
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget?.filename}</span>? This action cannot be
              undone.
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

      {/* Attach to Post Dialog */}
      <Dialog open={!!attachTarget} onOpenChange={open => !open && setAttachTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attach to Post
            </DialogTitle>
            <DialogDescription>
              Enter the post ID to attach{" "}
              <span className="font-medium">{attachTarget?.filename}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Post ID"
              value={attachPostId}
              onChange={e => setAttachPostId(e.target.value)}
            />
            {attachError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <X className="h-3 w-3" />
                {attachError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachTarget(null)} disabled={attachLoading}>
              Cancel
            </Button>
            <Button onClick={handleAttach} disabled={attachLoading || !attachPostId.trim()}>
              {attachLoading ? "Attaching…" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
