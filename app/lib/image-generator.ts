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
  apiKey: string
): Promise<ImageGenerationResult> {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  try {
    // OpenAI DALL-E 3 API call
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
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
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Mock function for development/testing
export function generateImageMock(request: ImageGenerationRequest): ImageGenerationResult {
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