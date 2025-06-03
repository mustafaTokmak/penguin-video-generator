import { APIError, ValidationError } from "./errors";

export interface ImageGenerationRequest {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  n?: number;
}

export interface ImageGenerationResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  prompt: string;
  createdAt: string;
  errorMessage?: string;
  revisedPrompt?: string;
}

export async function generateImage(
  request: ImageGenerationRequest,
  apiKey: string,
): Promise<ImageGenerationResult> {
  if (!request.prompt || request.prompt.trim().length === 0) {
    throw new ValidationError("Prompt is required for image generation");
  }

  if (request.prompt.length > 4000) {
    throw new ValidationError("Prompt is too long (max 4000 characters)");
  }

  try {
    // OpenAI DALL-E 3 API call
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: request.prompt,
          size: request.size || "1024x1024",
          quality: request.quality || "hd",
          style: request.style || "vivid",
          n: 1,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `Image generation failed: ${errorData.error?.message || "Unknown error"}`,
        response.status,
        errorData,
      );
    }

    const data = await response.json();
    const imageData = data.data[0];

    return {
      id: `img_${Date.now()}`,
      status: "completed",
      imageUrl: imageData.url,
      prompt: request.prompt,
      createdAt: new Date().toISOString(),
      revisedPrompt: imageData.revised_prompt,
    };
  } catch (error) {
    if (error instanceof APIError || error instanceof ValidationError) {
      throw error;
    }
    console.error("Error generating image:", error);
    throw new APIError(
      `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
      error,
    );
  }
}

// Mock function for development/testing
export function generateImageMock(
  request: ImageGenerationRequest,
): ImageGenerationResult {
  const id = `mock_img_${Date.now()}`;
  return {
    id,
    status: "completed",
    imageUrl: `https://picsum.photos/1024/1024?random=${id}`,
    prompt: request.prompt,
    createdAt: new Date().toISOString(),
    revisedPrompt: `Enhanced mock: ${request.prompt}`,
  };
}
