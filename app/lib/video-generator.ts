import * as fal from "@fal-ai/serverless-client";
import { APIError, ValidationError } from "./errors";

export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: number;
  quality?: "standard" | "high";
}

export interface VideoGenerationResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  prompt: string;
  enhancedPrompt?: string;
  createdAt: string;
  errorMessage?: string;
  duration?: number;
}

async function enhancePrompt(prompt: string, apiKey: string): Promise<string> {
  try {
    fal.config({
      credentials: apiKey,
    });

    const result = await fal.run("fal-ai/video-prompt-generator", {
      input: {
        prompt: prompt,
      },
    }) as { prompt: string };

    return result.prompt || prompt;
  } catch (error) {
    console.warn("Failed to enhance prompt, using original:", error);
    return prompt;
  }
}

export async function generateVideo(
  request: VideoGenerationRequest,
  apiKey: string,
): Promise<VideoGenerationResult> {
  if (!request.prompt || request.prompt.trim().length === 0) {
    throw new ValidationError("Prompt is required for video generation");
  }

  if (request.prompt.length > 4000) {
    throw new ValidationError("Prompt is too long (max 4000 characters)");
  }

  try {
    // Enhance the prompt first
    const enhancedPrompt = await enhancePrompt(request.prompt, apiKey);
    console.log("Enhanced prompt:", enhancedPrompt);

    fal.config({
      credentials: apiKey,
    });

    // Add framing instructions to ensure proper shot composition
    const finalPrompt = `${enhancedPrompt}. Wide shot, full body framing, avoid extreme close-ups, show complete penguin figures with environmental context.`;

    // Use subscribe with timeout wrapper to handle long-running requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new APIError("Video generation timed out", 504)), 300000); // 5 minute timeout
    });

    const videoPromise = fal.subscribe("fal-ai/kling-video/v1.6/standard/text-to-video", {
      input: {
        prompt: finalPrompt,
        aspect_ratio: "9:16",
        duration: request.duration || 5,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`Video generation status: ${update.status}`);
        if (update.logs) {
          update.logs.forEach(log => console.log(`[${log.timestamp}] ${log.message}`));
        }
      },
    }) as Promise<{ video: { url: string } }>;

    const result = await Promise.race([videoPromise, timeoutPromise]) as { video: { url: string } };

    if (!result.video || !result.video.url) {
      throw new APIError("Video generation failed: No video data returned", 500);
    }

    return {
      id: `vid_${Date.now()}`,
      status: "completed",
      videoUrl: result.video.url,
      prompt: request.prompt,
      enhancedPrompt: enhancedPrompt,
      createdAt: new Date().toISOString(),
      duration: request.duration || 5,
    };
  } catch (error) {
    if (error instanceof APIError || error instanceof ValidationError) {
      throw error;
    }
    console.error("Error generating video:", error);
    throw new APIError(
      `Failed to generate video: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      error,
    );
  }
}

// Mock function for development/testing
export function generateVideoMock(
  request: VideoGenerationRequest,
): VideoGenerationResult {
  const id = `mock_vid_${Date.now()}`;
  return {
    id,
    status: "completed",
    videoUrl: `https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4`,
    prompt: request.prompt,
    createdAt: new Date().toISOString(),
    duration: request.duration || 5,
  };
}
