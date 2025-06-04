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

  // Add penguin context to the prompt
  const penguinPrompt = `cute adorable penguin ${originalPrompt}`;

  try {
    fal.config({
      credentials: apiKey,
    });

    const result = await fal.subscribe("fal-ai/video-prompt-generator", {
      input: {
        input_concept: penguinPrompt,
        style: "Detailed",
        camera_style: "Gimbal smoothness",
        camera_direction: "None",
        pacing: "Slow burn",
        special_effects: "None",
        model: "google/gemini-flash-1.5",
        prompt_length: "Medium"
      },
    }) as { data: { prompt: string } };

    const enhancedPrompt = result.data?.prompt || createPenguinPrompt(originalPrompt);

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
    
    // Fallback enhancement
    return {
      isAppropriate: true,
      enhancedPrompt: createPenguinPrompt(originalPrompt),
      originalPrompt: originalPrompt,
      reasoning: "Enhanced prompt to be penguin-themed with detailed characteristics and Antarctic setting (fallback)",
      suggestedStyle: "realistic-cute",
    };
  }
}

function createPenguinPrompt(originalPrompt: string): string {
  const cleanPrompt = originalPrompt.trim().toLowerCase();
  
  // If it already mentions penguins, enhance it
  if (cleanPrompt.includes('penguin')) {
    return `${originalPrompt}. The penguins have fluffy black and white feathers, bright orange beaks and webbed feet, and adorable round dark eyes. Set in a pristine Antarctic landscape with sparkling white snow, crystal-clear ice formations, and a serene blue sky. Professional wildlife videography style, natural lighting, smooth movements, cinematic quality.`;
  }
  
  // Transform any prompt into a penguin scenario
  const penguinScenarios = [
    `A group of adorable penguins ${originalPrompt} in their natural Antarctic habitat`,
    `Cute penguins playfully ${originalPrompt} on the icy Antarctic terrain`,
    `A family of penguins ${originalPrompt} with snow-covered mountains in the background`,
    `Baby penguins ${originalPrompt} while their parents watch lovingly nearby`,
    `Emperor penguins ${originalPrompt} as aurora borealis dances in the sky above`
  ];
  
  const randomScenario = penguinScenarios[Math.floor(Math.random() * penguinScenarios.length)];
  
  return `${randomScenario}. The penguins have fluffy black and white feathers, bright orange beaks and webbed feet, and adorable round dark eyes. The scene is set in a beautiful Antarctic landscape with pristine white snow, sparkling ice formations, and a serene blue sky. Professional wildlife videography style, natural lighting, smooth movements, heartwarming and delightful composition.`;
}
}