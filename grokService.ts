import { randomUUID } from 'crypto';
import { PLATFORMS } from "./constants";
import { ClusterType } from "./types";

const API_URL = "https://api.x.ai/v1/chat/completions";

export async function generateSocialContentGrok(topic: string, clusters: ClusterType[]) {
  const GROK_API_KEY = process.env.GROK_API || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!GROK_API_KEY) {
    throw new Error("GROK_API_KEY is not set");
  }

  const selectedPlatforms = PLATFORMS.filter(p => clusters.includes(p.cluster));
  if (selectedPlatforms.length === 0) return [];

  const platformsInfo = selectedPlatforms.map(p => 
    `- ${p.name} (ID: ${p.id}): Limit ${p.maxChars || 'unlimited'} chars`
  ).join('\n');

  const systemPrompt = `
    You are a world-class Social Media Manager. 
    Task: Adapt the following topic into specific posts for the requested platforms.
    Topic: "${topic}"
    
    Guidelines:
    - Adhere strictly to character limits.
    - Use appropriate tone for each platform.
    - If hashtags are allowed, include 2-5 relevant ones.
    - Output MUST be valid JSON array of objects.
    
    Required Platforms and constraints:
    ${platformsInfo}
    
    Output Format:
    [
      { "platformId": "platform_id", "content": "post content" }
    ]
    RETURN ONLY JSON. NO MARKDOWN.
  `;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-2-latest", // or grok-beta
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the posts." }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Grok API Error: ${err}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean up potential markdown code blocks
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const results = JSON.parse(content);
    
    return results.map((r: any) => ({
      ...r,
      id: randomUUID(),
      status: 'draft',
      topic: topic,
      retry_count: 0
    }));

  } catch (error) {
    console.error("Grok generation failed:", error);
    throw error;
  }
}
