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
  try {
    fal.config({
      credentials: apiKey,
    });

    // Try to fetch from fal.ai requests endpoint
    // Note: This endpoint might need to be verified with fal.ai documentation
    const response = await fetch("https://queue.fal.run/requests", {
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new APIError(`Failed to fetch fal.ai history: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    return data.requests || [];
  } catch (error) {
    console.error("Error fetching fal.ai history:", error);
    throw error;
  }
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