import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface GenerateCaptionOptions {
  platform?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

class AIService {
  private model: string;

  constructor() {
    this.model = 'gpt-4-turbo-preview';
  }

  // ========== CONTENT GENERATION ==========

  async generateCaption(prompt: string, options: GenerateCaptionOptions = {}): Promise<string> {
    const {
      platform = 'instagram',
      tone = 'casual',
      length = 'medium',
      includeHashtags = true,
      includeEmojis = true
    } = options;

    const systemPrompt = this.buildSystemPrompt(platform, tone, length, includeHashtags, includeEmojis);

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate caption');
    }
  }

  async improveCaption(caption: string, improvement: string = 'make it more engaging'): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert. Improve the given caption based on the user\'s request.'
          },
          {
            role: 'user',
            content: `Improve this caption: "${caption}"\n\nImprovement request: ${improvement}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async generateHashtags(caption: string, platform: string = 'instagram', count: number = 10): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate ${count} relevant hashtags for ${platform}. Return only hashtags separated by spaces.`
          },
          {
            role: 'user',
            content: caption
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      });

      const hashtags = response.choices[0].message.content?.trim() || '';
      return hashtags.split(' ').filter(h => h.startsWith('#'));
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // ========== CONTENT ANALYSIS ==========

  async analyzeSentiment(caption: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the text. Respond with JSON: {"sentiment": "positive/negative/neutral", "score": 0-1, "reasoning": "brief explanation"}'
          },
          {
            role: 'user',
            content: caption
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async suggestBestTimeToPost(caption: string, platform: string, audienceData: any = {}): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a social media expert. Suggest the best time to post based on content type and platform. 
            Respond with JSON: {"recommendedTime": "HH:MM", "dayOfWeek": "Monday-Sunday", "reasoning": "explanation", "timezone": "UTC"}`
          },
          {
            role: 'user',
            content: `Platform: ${platform}\nCaption: ${caption}\nAudience data: ${JSON.stringify(audienceData)}`
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // ========== BULK GENERATION ==========

  async generatePostIdeas(topic: string, count: number = 5, platforms: string[] = ['instagram']): Promise<any[]> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate ${count} creative post ideas for ${platforms.join(', ')}. 
            Return JSON array: [{"title": "", "caption": "", "contentType": "image/video/carousel", "platforms": []}]`
          },
          {
            role: 'user',
            content: `Topic: ${topic}`
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.ideas || result.posts || [];
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async generateContentCalendar(topic: string, days: number = 7, platforms: string[] = ['instagram']): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Create a ${days}-day content calendar for ${platforms.join(', ')}. 
            Return JSON: {"calendar": [{"day": 1, "date": "YYYY-MM-DD", "posts": [{"time": "HH:MM", "caption": "", "contentType": "", "platform": ""}]}]}`
          },
          {
            role: 'user',
            content: `Topic: ${topic}\nStart date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // ========== IMAGE ANALYSIS ==========

  async analyzeImage(imageUrl: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and suggest a caption for social media. Also suggest which platforms would be best for this content.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI Vision API Error:', error);
      throw error;
    }
  }

  async generateCaptionFromImage(imageUrl: string, additionalContext: string = ''): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Generate an engaging social media caption for this image. ${additionalContext}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 300
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI Vision API Error:', error);
      throw error;
    }
  }

  // ========== UTILITIES ==========

  private buildSystemPrompt(platform: string, tone: string, length: string, includeHashtags: boolean, includeEmojis: boolean): string {
    const lengthGuide: Record<string, string> = {
      short: '50-100 characters',
      medium: '100-200 characters',
      long: '200-500 characters'
    };

    const platformSpecs: Record<string, string> = {
      instagram: 'Instagram post (max 2,200 chars, first 125 chars are most important)',
      facebook: 'Facebook post (concise, engaging)',
      linkedin: 'LinkedIn post (professional, value-driven, max 3,000 chars)',
      twitter: 'Twitter/X post (max 280 characters)',
      tiktok: 'TikTok caption (short, trendy, max 150 chars)',
      youtube: 'YouTube description (detailed, SEO-friendly)',
      telegram: 'Telegram message (clear, direct)',
      discord: 'Discord message (conversational)',
      reddit: 'Reddit post (informative, community-focused)',
      pinterest: 'Pinterest description (keyword-rich, max 500 chars)',
      bluesky: 'Bluesky post (max 300 characters)'
    };

    let prompt = `You are an expert social media content creator specializing in ${platform}. 
Create a caption that is ${tone} in tone and ${lengthGuide[length] || lengthGuide.medium} in length.

Platform-specific requirements: ${platformSpecs[platform] || 'Standard social media post'}

`;

    if (includeEmojis) {
      prompt += 'Include relevant emojis to make the caption more engaging.\n';
    }

    if (includeHashtags) {
      prompt += `Include 5-10 relevant hashtags at the end (appropriate for ${platform}).\n`;
    }

    prompt += '\nFocus on engagement, clarity, and call-to-action where appropriate.';

    return prompt;
  }

  // ========== CONTENT OPTIMIZATION ==========

  async optimizeForPlatform(caption: string, sourcePlatform: string, targetPlatform: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a social media expert. Adapt content from ${sourcePlatform} to ${targetPlatform}, 
            considering character limits, tone, and platform-specific best practices.`
          },
          {
            role: 'user',
            content: caption
          }
        ],
        temperature: 0.6,
        max_tokens: 500
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async checkContentCompliance(caption: string, platform: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Check if this content complies with ${platform}'s community guidelines and content policies. 
            Return JSON: {"compliant": true/false, "issues": ["list of potential issues"], "suggestions": ["improvements"]}`
          },
          {
            role: 'user',
            content: caption
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
