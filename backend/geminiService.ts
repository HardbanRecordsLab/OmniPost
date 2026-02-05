
import { GoogleGenAI, Type } from "@google/genai";
import { randomUUID } from 'crypto';
import { PLATFORMS } from "./constants";
import { ClusterType } from "./types";

export async function generateSocialContent(topic: string, clusters: ClusterType[]) {
  // Always use process.env.API_KEY directly in the constructor as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const selectedPlatforms = PLATFORMS.filter(p => clusters.includes(p.cluster));
  
  if (selectedPlatforms.length === 0) return [];

  // Construct a specific prompt for the AI to handle multiple platforms at once
  // Fix: Removed reference to non-existent 'vibe' property on the Platform type
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
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate the adapted posts in JSON format.",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platformId: { type: Type.STRING, description: "The ID of the platform" },
              content: { type: Type.STRING, description: "The adapted post content" }
            },
            required: ["platformId", "content"]
          }
        }
      }
    });

    // The property .text returns the string directly.
    const results = JSON.parse(response.text || "[]");
    return results.map((r: any) => ({
      ...r,
      id: randomUUID(),
      status: 'draft',
      topic: topic,
      // Initialize retry_count for newly created post objects
      retry_count: 0
    }));
  } catch (error) {
    console.error("Gemini generation failed:", error);
    throw error;
  }
}
