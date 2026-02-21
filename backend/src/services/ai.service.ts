import { isNonEmptyString, isBoolean, isNumber, asStringArray } from "../utils/ai-runtime-validators"

type CaptionLength = "short" | "medium" | "long"

interface GenerateCaptionOptions {
  platform?: string
  tone?: string
  length?: CaptionLength
  includeHashtags?: boolean
  includeEmojis?: boolean
}

interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral"
  score: number
  reasoning: string
}

interface BestTimeToPostResult {
  recommendedTime: string
  dayOfWeek: string
  reasoning: string
  timezone: string
}

interface PostIdea {
  title: string
  caption: string
  contentType: string
  platforms: string[]
}

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

interface ContentCalendar {
  calendar: CalendarDay[]
}

interface ComplianceResult {
  compliant: boolean
  issues: string[]
  suggestions: string[]
}

interface GeneratedSocialContent {
  platformId: string
  content: string
  id: string
  status: string
  topic: string
  retry_count: number
}

const PLATFORM_SPECS: Record<string, string> = {
  instagram: "Instagram post (max 2,200 chars, first 125 chars most important)",
  facebook: "Facebook post (concise, engaging)",
  linkedin: "LinkedIn post (professional, value-driven, max 3,000 chars)",
  twitter: "Twitter/X post (max 280 characters)",
  tiktok: "TikTok caption (short, trendy, max 150 chars)",
  youtube: "YouTube description (detailed, SEO-friendly)",
  telegram: "Telegram message (clear, direct)",
  discord: "Discord message (conversational)",
  reddit: "Reddit post (informative, community-focused)",
  pinterest: "Pinterest description (keyword-rich, max 500 chars)",
  bluesky: "Bluesky post (max 300 characters)",
}

const LENGTH_GUIDE: Record<CaptionLength, string> = {
  short: "50-100 characters",
  medium: "100-200 characters",
  long: "200-500 characters",
}

const DEFAULT_AI_TIMEOUT_MS = 15000

async function requestWithTimeout(input: RequestInfo, init?: RequestInit, timeoutMs: number = DEFAULT_AI_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(input, { ...(init || {}), signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(prompt: string, maxTokens: number = 500): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set")
  }

  const response = await requestWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error ${response.status}: ${err}`)
  }

  const data = await response.json() as any
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

async function callGeminiJSON(prompt: string, maxTokens: number = 1000): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set")
  }

  const response = await requestWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nReturn ONLY valid JSON, no markdown, no code blocks.`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.5,
          responseMimeType: "application/json",
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error ${response.status}: ${err}`)
  }

  const data = await response.json() as any
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
    return {}
  }
}

async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens: number = 500, jsonMode: boolean = false): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set")
  }

  const body: any = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" }
  }

  const response = await requestWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI error ${response.status}: ${err}`)
  }

  const data = await response.json() as any
  return data.choices?.[0]?.message?.content || ""
}

async function generateText(prompt: string, maxTokens: number = 500): Promise<string> {
  try {
    return await callGemini(prompt, maxTokens)
  } catch (e) {
    console.warn("Gemini failed, trying OpenAI fallback:", (e as Error).message)
  }

  const systemPrompt = "You are a helpful assistant."
  try {
    return await callOpenAI(systemPrompt, prompt, maxTokens)
  } catch (e) {
    throw new Error(`All AI providers failed. Last error: ${(e as Error).message}`)
  }
}

async function generateJSON<T = unknown>(prompt: string, maxTokens: number = 1000): Promise<T> {
  try {
    return (await callGeminiJSON(prompt, maxTokens)) as T
  } catch (e) {
    console.warn("Gemini JSON failed, trying OpenAI:", (e as Error).message)
  }

  try {
    const text = await callOpenAI(
      "You are a helpful assistant. Always respond with valid JSON only.",
      prompt,
      maxTokens,
      true
    )
    return JSON.parse(text) as T
  } catch (e) {
    throw new Error(`All AI providers failed for JSON: ${(e as Error).message}`)
  }
}

class AIService {
  async generateCaption(prompt: string, options: GenerateCaptionOptions = {}): Promise<string> {
    const {
      platform = "instagram",
      tone = "casual",
      length = "medium",
      includeHashtags = true,
      includeEmojis = true
    } = options;

    const systemContext = `You are an expert social media content creator specializing in ${platform}.
Create a caption that is ${tone} in tone and ${LENGTH_GUIDE[length]} in length.
Platform requirements: ${PLATFORM_SPECS[platform] || 'Standard social media post'}
${includeEmojis ? 'Include relevant emojis to make the caption more engaging.' : ''}
${includeHashtags ? `Include 5-10 relevant hashtags at the end (appropriate for ${platform}).` : ''}
Focus on engagement, clarity, and call-to-action where appropriate.`;

    const fullPrompt = `${systemContext}\n\nCreate a caption for: ${prompt}`;
    return generateText(fullPrompt, 500);
  }

  async improveCaption(caption: string, improvement: string = 'make it more engaging'): Promise<string> {
    const prompt = `You are a social media expert. Improve this caption based on the request.
Caption: "${caption}"
Improvement request: ${improvement}
Return only the improved caption.`;
    return generateText(prompt, 500);
  }

  async generateHashtags(caption: string, platform: string = 'instagram', count: number = 10): Promise<string[]> {
    const prompt = `Generate exactly ${count} relevant hashtags for ${platform} based on this caption:
"${caption}"
Return only the hashtags separated by spaces, each starting with #.`;
    const text = await generateText(prompt, 150);
    return text.split(/\s+/).filter(h => h.startsWith('#')).slice(0, count);
  }

  async analyzeSentiment(caption: string): Promise<SentimentResult> {
    const prompt = `Analyze the sentiment of this social media caption:
"${caption}"
Return JSON: {"sentiment": "positive/negative/neutral", "score": 0.0-1.0, "reasoning": "brief explanation"}`;
    const result = await generateJSON<Partial<SentimentResult>>(prompt, 200);
    const sentiment = isNonEmptyString(result.sentiment) ? result.sentiment : "neutral";
    const score = isNumber(result.score) && result.score >= 0 && result.score <= 1 ? result.score : 0.5;
    const reasoning = isNonEmptyString(result.reasoning) ? result.reasoning : "No reasoning provided";
    return { sentiment: sentiment as SentimentResult["sentiment"], score, reasoning };
  }

  async suggestBestTimeToPost(caption: string, platform: string, audienceData: any = {}): Promise<BestTimeToPostResult> {
    const prompt = `Suggest the best time to post based on content type and platform.
Platform: ${platform}
Caption: "${caption}"
Audience data: ${JSON.stringify(audienceData)}
Return JSON: {"recommendedTime": "HH:MM", "dayOfWeek": "Monday-Sunday", "reasoning": "explanation", "timezone": "UTC"}`;
    const result = await generateJSON<Partial<BestTimeToPostResult>>(prompt, 300);
    const recommendedTime = isNonEmptyString(result.recommendedTime) ? result.recommendedTime : "09:00";
    const dayOfWeek = isNonEmptyString(result.dayOfWeek) ? result.dayOfWeek : "Monday";
    const reasoning = isNonEmptyString(result.reasoning) ? result.reasoning : "No reasoning provided";
    const timezone = isNonEmptyString(result.timezone) ? result.timezone : "UTC";
    return { recommendedTime, dayOfWeek, reasoning, timezone };
  }

  async generatePostIdeas(topic: string, count: number = 5, platforms: string[] = ['instagram']): Promise<PostIdea[]> {
    const prompt = `Generate ${count} creative post ideas for these platforms: ${platforms.join(', ')}.
Topic: "${topic}"
Return JSON object with key "ideas": [{"title": "", "caption": "", "contentType": "image/video/carousel", "platforms": []}]`;
    const result = await generateJSON<{ ideas?: Partial<PostIdea>[]; posts?: Partial<PostIdea>[] }>(prompt, 1500);
    const rawIdeas = Array.isArray(result.ideas) ? result.ideas : Array.isArray(result.posts) ? result.posts : [];
    const ideas: PostIdea[] = rawIdeas
      .filter(i => i && (isNonEmptyString(i.title) || isNonEmptyString(i.caption)))
      .map(i => ({
        title: isNonEmptyString(i.title) ? i.title : topic,
        caption: isNonEmptyString(i.caption) ? i.caption : "",
        contentType: isNonEmptyString(i.contentType) ? i.contentType : "post",
        platforms: asStringArray(i.platforms).length > 0 ? asStringArray(i.platforms) : platforms
      }));
    return ideas;
  }

  async generateContentCalendar(topic: string, days: number = 7, platforms: string[] = ['instagram']): Promise<ContentCalendar> {
    const startDate = new Date().toISOString().split('T')[0];
    const prompt = `Create a ${days}-day content calendar for: ${platforms.join(', ')}.
Topic: "${topic}"
Start date: ${startDate}
Return JSON: {"calendar": [{"day": 1, "date": "YYYY-MM-DD", "posts": [{"time": "HH:MM", "caption": "", "contentType": "", "platform": ""}]}]}`;
    const result = await generateJSON<ContentCalendar>(prompt, 2000);
    if (!result || !Array.isArray(result.calendar)) {
      return { calendar: [] };
    }
    const calendar = result.calendar.map(day => ({
      day: typeof day.day === 'number' ? day.day : 0,
      date: isNonEmptyString((day as any).date) ? day.date : startDate,
      posts: Array.isArray(day.posts)
        ? day.posts.map(post => ({
            time: isNonEmptyString((post as any).time) ? post.time : '09:00',
            caption: isNonEmptyString((post as any).caption) ? post.caption : '',
            contentType: isNonEmptyString((post as any).contentType) ? post.contentType : 'post',
            platform: isNonEmptyString((post as any).platform) ? post.platform : platforms[0] || 'instagram'
          }))
        : []
    }));
    return { calendar };
  }

  async analyzeImage(imageUrl: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
    if (apiKey) {
      try {
        const response = await requestWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: "Analyze this image and suggest a social media caption. Also suggest which platforms would be best for this content.",
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: imageUrl.startsWith("data:") ? imageUrl.split(",")[1] : "",
                    },
                  },
                ]
              }]
            })
          }
        );
        if (response.ok) {
          const data = (await response.json()) as any
          return data.candidates?.[0]?.content?.parts?.[0]?.text || "Image analyzed successfully"
        }
      } catch (e) {
        console.warn("Gemini vision failed:", e)
      }
    }

    return `Image at ${imageUrl} - Please add your own caption for best results.`
  }

  async generateCaptionFromImage(imageUrl: string, additionalContext: string = ''): Promise<string> {
    return this.analyzeImage(imageUrl);
  }

  async optimizeForPlatform(caption: string, sourcePlatform: string, targetPlatform: string): Promise<string> {
    const prompt = `Adapt this content from ${sourcePlatform} to ${targetPlatform}.
Consider character limits, tone, and platform-specific best practices.

Original (${sourcePlatform}): "${caption}"
Platform requirements for ${targetPlatform}: ${PLATFORM_SPECS[targetPlatform] || 'Standard post'}

Return only the adapted content.`;
    return generateText(prompt, 500);
  }

  async checkContentCompliance(caption: string, platform: string): Promise<ComplianceResult> {
    const prompt = `Check if this content complies with ${platform}'s community guidelines.
Content: "${caption}"
Return JSON: {"compliant": true/false, "issues": ["list of potential issues"], "suggestions": ["improvements"]}`;
    const result = await generateJSON<Partial<ComplianceResult>>(prompt, 300);
    const compliant = isBoolean(result.compliant) ? result.compliant : true;
    const issues = Array.isArray(result.issues) ? result.issues.filter(isNonEmptyString) : [];
    const suggestions = Array.isArray(result.suggestions) ? result.suggestions.filter(isNonEmptyString) : [];
    return { compliant, issues, suggestions };
  }

  async generateSocialContent(topic: string, platformIds: string[]): Promise<GeneratedSocialContent[]> {
    const { randomUUID } = await import('crypto');

    const platformsInfo = platformIds
      .map(id => `- ${id}: max ${PLATFORM_SPECS[id] ? '2200' : '500'} chars`)
      .join('\n');

    const prompt = `You are a world-class Social Media Manager.
Topic: "${topic}"

Create adapted posts for these platforms:
${platformsInfo}

Return JSON array: [{"platformId": "platform_id", "content": "post content"}]
One object per platform.`;

    const results = await generateJSON<GeneratedSocialContent[] | { posts?: GeneratedSocialContent[] }>(prompt, 2000);
    const arr = Array.isArray(results) ? results : (results.posts || []);

    const normalized = arr
      .filter(r => r && isNonEmptyString((r as any).platformId) && isNonEmptyString((r as any).content))
      .map(r => ({
        ...r,
        platformId: String((r as any).platformId),
        content: String((r as any).content),
        id: isNonEmptyString((r as any).id) ? String((r as any).id) : randomUUID(),
        status: isNonEmptyString((r as any).status) ? String((r as any).status) : 'draft',
        topic: isNonEmptyString((r as any).topic) ? String((r as any).topic) : topic,
        retry_count: typeof (r as any).retry_count === 'number' ? (r as any).retry_count : 0
      }));

    return normalized;
  }
}

export const aiService = new AIService();
