const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

type CaptionLength = 'short' | 'medium' | 'long'

interface CalendarPost {
  time: string
  caption: string
  contentType: string
  platform: string
}

interface CalendarDay {
  day: number
  date: string
  posts: CalendarPost[]
}

export interface ContentCalendar {
  calendar: CalendarDay[]
}

export interface GeneratedSocialContent {
  platformId: string
  content: string
  id: string
  status: string
  topic: string
  retry_count: number
}

async function request(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const aiService = {
  async generateCaption(
    prompt: string,
    options: {
      platform?: string
      tone?: string
      length?: CaptionLength
      includeHashtags?: boolean
      includeEmojis?: boolean
    } = {}
  ): Promise<{ success: boolean; caption?: string; error?: string }> {
    try {
      return await request('/api/ai/generate-caption', {
        prompt,
        platform: options.platform || 'instagram',
        tone: options.tone || 'casual',
        length: options.length || 'medium',
        includeHashtags: options.includeHashtags ?? true,
        includeEmojis: options.includeEmojis ?? true
      })
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async improveCaption(
    caption: string,
    improvement: string = 'make it more engaging'
  ): Promise<{ success: boolean; caption?: string; error?: string }> {
    try {
      return await request('/api/ai/improve-caption', { caption, improvement })
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async generateHashtags(
    caption: string,
    platform: string = 'instagram',
    count: number = 10
  ): Promise<{ success: boolean; hashtags?: string[]; error?: string }> {
    try {
      return await request('/api/ai/generate-hashtags', { caption, platform, count })
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async generateCalendar(
    topic: string,
    days: number = 7,
    platforms: string[] = ['instagram']
  ): Promise<{ success: boolean; calendar?: ContentCalendar; error?: string }> {
    try {
      return await request('/api/ai/generate-calendar', { topic, days, platforms })
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async generateContent(
    topic: string,
    clusters: string[]
  ): Promise<{ success: boolean; posts?: GeneratedSocialContent[]; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, clusters })
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return res.json()
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async analyzeSentiment(
    caption: string
  ): Promise<{ success: boolean; sentiment?: string; score?: number; reasoning?: string; error?: string }> {
    try {
      const result = await request('/api/ai/improve-caption', {
        caption,
        improvement: 'analyze sentiment and return: positive/negative/neutral, score 0-1, reasoning'
      })
      return { success: true, sentiment: 'neutral', score: 0.5, ...result }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async checkHealth(): Promise<{ status: string }> {
    try {
      const res = await fetch(`${BASE_URL}/api/health`)
      return res.json()
    } catch {
      return { status: 'error' }
    }
  }
}
