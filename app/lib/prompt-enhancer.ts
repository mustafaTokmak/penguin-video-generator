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
  
  // Diverse environments for penguin scenarios
  const environments = [
    "in the pristine Antarctic landscape with sparkling white snow and crystal-clear ice formations",
    "at a bustling penguin colony with hundreds of penguins socializing and playing",
    "on a dramatic ice cliff overlooking the vast Antarctic ocean",
    "in a magical underwater world with colorful coral reefs and tropical fish",
    "in a cozy penguin village with ice houses and snow-covered pathways",
    "on a floating iceberg surrounded by calm, mirror-like waters",
    "in a snowy forest filled with ice sculptures and frozen waterfalls",
    "at a penguin beach party with sand castles made of snow and ice",
    "in a mystical aurora-lit cave filled with glowing ice crystals",
    "at a penguin carnival with ice slides, snow cones, and festive decorations",
    "in a penguin laboratory with cute scientific equipment made of ice",
    "on a sunny tropical island where penguins are vacationing",
    "in a penguin city with ice skyscrapers and frozen transportation",
    "at a penguin spa with hot springs and relaxing ice baths",
    "in a magical winter wonderland with floating snowflakes and dancing lights"
  ];
  
  const scenarios = [
    `A colony of adorable penguins ${originalPrompt}`,
    `A group of playful penguin friends ${originalPrompt}`,
    `A family of emperor penguins ${originalPrompt}`,
    `Baby penguins adorably ${originalPrompt}`,
    `A wise old penguin and young chicks ${originalPrompt}`,
    `A penguin couple romantically ${originalPrompt}`,
    `A team of penguin explorers ${originalPrompt}`,
    `A penguin dance troupe ${originalPrompt}`,
    `A group of penguin chefs ${originalPrompt}`,
    `A penguin marching band ${originalPrompt}`,
    `A penguin sports team ${originalPrompt}`,
    `A penguin art class ${originalPrompt}`,
    `A penguin book club ${originalPrompt}`,
    `A penguin yoga class ${originalPrompt}`,
    `A penguin construction crew ${originalPrompt}`
  ];
  
  const cameraStyles = [
    "Professional wildlife videography style, natural lighting, smooth movements",
    "Cinematic drone footage with sweeping camera movements",
    "Intimate close-up shots with shallow depth of field",
    "Time-lapse photography capturing the magical transformation",
    "Slow-motion capture highlighting every adorable detail",
    "Documentary-style filming with natural behavior focus",
    "Artistic film noir style with dramatic lighting",
    "Whimsical cartoon-inspired cinematography",
    "Epic landscape shots with penguins as heroic subjects",
    "Macro photography revealing intricate penguin features"
  ];
  
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const randomEnvironment = environments[Math.floor(Math.random() * environments.length)];
  const randomCameraStyle = cameraStyles[Math.floor(Math.random() * cameraStyles.length)];
  
  // Always add randomness, even if prompt already contains penguins
  const enhancedPrompt = cleanPrompt.includes('penguin') 
    ? `${randomScenario} as they ${originalPrompt.replace(/penguin[s]?/gi, '').trim()}`
    : `${randomScenario} ${originalPrompt}`;
  
  return `${enhancedPrompt} ${randomEnvironment}. The penguins have fluffy black and white feathers, bright orange beaks and webbed feet, and adorable round dark eyes. ${randomCameraStyle}, heartwarming and delightful composition with magical penguin charm.`;
}