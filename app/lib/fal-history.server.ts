import * as fal from "@fal-ai/serverless-client";
import { APIError } from "./errors";

export interface FalRequest {
  request_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  model: string;
  input: any;
  result?: any;
}

export async function getFalHistory(apiKey: string, limit: number = 50): Promise<FalRequest[]> {
  // TODO: fal.ai doesn't provide a public API endpoint for request history
  // This feature would need to be implemented when/if fal.ai provides such an endpoint
  console.warn("fal.ai request history API not available - using local storage only");
  return [];
}

export async function getVideoRequestHistory(apiKey: string): Promise<any[]> {
  try {
    const history = await getFalHistory(apiKey);
    
    // Filter for video generation requests
    return history
      .filter(req => 
        req.model.includes('kling-video') || 
        req.model.includes('ltx-video') ||
        req.model.includes('video')
      )
      .filter(req => req.status === 'completed' && req.result)
      .map(req => ({
        id: req.request_id,
        prompt: req.input?.prompt || 'Unknown prompt',
        videoUrl: req.result?.video?.url || req.result?.data?.video?.url,
        createdAt: req.created_at,
        completedAt: req.completed_at,
        status: 'completed',
        model: req.model,
        duration: req.input?.duration || 5,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20); // Limit to most recent 20 videos
  } catch (error) {
    console.warn("Could not fetch video history from fal.ai:", error);
    return [];
  }
}