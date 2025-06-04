import * as fal from "@fal-ai/serverless-client";
import { APIError } from "./errors";

export interface PromptEnhancementResult {
  isAppropriate: boolean;
  enhancedPrompt: string;
  originalPrompt: string;
  reasoning: string;
  suggestedStyle?: string;
}

export async function enhancePromptForPenguin(
  originalPrompt: string,
  apiKey: string,
): Promise<PromptEnhancementResult> {
  if (!originalPrompt || originalPrompt.trim().length === 0) {
    throw new APIError("Prompt cannot be empty", 400);
  }

  if (originalPrompt.length > 1000) {
    throw new APIError("Prompt is too long (max 1000 characters)", 400);
  }

  // Always add penguin context to the prompt
  const penguinPrompt = `cute adorable penguin ${originalPrompt}`;

  try {
    fal.config({
      credentials: apiKey,
    });

    const result = await fal.run("fal-ai/video-prompt-generator", {
      input: {
        input_concept: penguinPrompt,
      },
    }) as { prompt: string };

    const enhancedPrompt = result.prompt || penguinPrompt;

    // Ensure the enhanced prompt has penguin content
    const finalPrompt = enhancedPrompt.toLowerCase().includes('penguin') 
      ? enhancedPrompt 
      : `A cute penguin in a scenario: ${enhancedPrompt}. The penguin has fluffy black and white feathers, bright orange beak and webbed feet, adorable round dark eyes. Set in an Antarctic landscape with pristine white snow and sparkling ice formations.`;

    return {
      isAppropriate: true,
      enhancedPrompt: finalPrompt,
      originalPrompt: originalPrompt,
      reasoning: "Enhanced prompt for video generation with penguin theme using fal.ai video prompt generator",
      suggestedStyle: "realistic-cute",
    };
  } catch (error: unknown) {
    console.warn("Failed to enhance prompt with fal.ai, using fallback:", error);
    if (error && typeof error === 'object' && 'body' in error && 
        error.body && typeof error.body === 'object' && 'detail' in error.body) {
      console.error("Validation error details:", JSON.stringify(error.body.detail, null, 2));
    }
    
    // Fallback enhancement
    return {
      isAppropriate: true,
      enhancedPrompt: `A cute penguin in a scenario inspired by: ${originalPrompt}. The penguin has fluffy black and white feathers, bright orange beak and webbed feet, and adorable round dark eyes. Set in a beautiful Antarctic landscape with pristine white snow and sparkling ice formations. Professional wildlife videography style, natural lighting, smooth movements, adorable and heartwarming composition with penguin-themed elements.`,
      originalPrompt: originalPrompt,
      reasoning: "Enhanced prompt to be penguin-themed with detailed characteristics and Antarctic setting",
      suggestedStyle: "realistic-cute",
    };
  }
}