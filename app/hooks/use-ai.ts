"use client"

import { useState, useCallback } from "react"
import { aiService } from "@/lib/services/ai-service"
import { toast } from "sonner"

interface UseAIOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  showToasts?: boolean
}

export function useAI(options: UseAIOptions = {}) {
  const { onSuccess, onError, showToasts = true } = options
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async <T>(fn: () => Promise<T>, successMsg?: string): Promise<T | null> => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fn()
        if (successMsg && showToasts) toast.success(successMsg)
        onSuccess?.(result)
        return result
      } catch (e: any) {
        const msg = e?.message || "AI request failed"
        setError(msg)
        if (showToasts) toast.error(msg)
        onError?.(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess, onError, showToasts]
  )

  const generateCaption = useCallback(
    (prompt: string, platform: string, tone: string = "casual") =>
      run(
        async () => {
          const r = await aiService.generateCaption(prompt, { platform, tone })
          if (!r.success) throw new Error(r.error)
          return r.caption!
        },
        "Caption generated"
      ),
    [run]
  )

  const improveCaption = useCallback(
    (caption: string, instruction: string) =>
      run(
        async () => {
          const r = await aiService.improveCaption(caption, instruction)
          if (!r.success) throw new Error(r.error)
          return r.caption!
        },
        "Caption improved"
      ),
    [run]
  )

  const generateHashtags = useCallback(
    (caption: string, platform: string, count: number = 10) =>
      run(
        async () => {
          const r = await aiService.generateHashtags(caption, platform, count)
          if (!r.success) throw new Error(r.error)
          return r.hashtags!
        },
        "Hashtags generated"
      ),
    [run]
  )

  const generateCalendar = useCallback(
    (topic: string, days: number, platforms: string[]) =>
      run(
        async () => {
          const r = await aiService.generateCalendar(topic, days, platforms)
          if (!r.success) throw new Error(r.error)
          return r.calendar!
        },
        "Calendar generated"
      ),
    [run]
  )

  const generateContent = useCallback(
    (topic: string, clusters: string[]) =>
      run(
        async () => {
          const r = await aiService.generateContent(topic, clusters)
          if (!r.success) throw new Error(r.error)
          return r.posts!
        },
        "Content generated"
      ),
    [run]
  )

  return {
    isLoading,
    error,
    generateCaption,
    improveCaption,
    generateHashtags,
    generateCalendar,
    generateContent
  }
}

