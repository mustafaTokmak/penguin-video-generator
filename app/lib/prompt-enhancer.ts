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
    "in a magical winter wonderland with floating snowflakes and dancing lights",
    // Human-like environments
    "at a cozy penguin home with penguin-sized furniture and family photos",
    "in a penguin school classroom with tiny desks and a chalkboard",
    "at a busy penguin airport with luggage carts and departure boards",
    "in a penguin office building with water coolers and cubicles",
    "at a penguin shopping mall with stores and escalators",
    "in a penguin hospital with stethoscopes and medical equipment",
    "at a penguin restaurant with menus and chef hats",
    "in a penguin library with towering bookshelves and reading glasses",
    "at a penguin gym with tiny weights and exercise equipment",
    "in a penguin movie theater with popcorn and 3D glasses",
    "at a penguin coffee shop with espresso machines and pastries",
    "in a penguin bank with tiny briefcases and calculators",
    "at a penguin hair salon with mirrors and styling tools",
    "in a penguin supermarket with shopping carts and checkout lanes",
    "at a penguin gas station with miniature fuel pumps",
    "in a penguin dental office with tiny dental chairs",
    "at a penguin wedding venue with flowers and decorations",
    "in a penguin courtroom with judge's gavels and lawyer wigs",
    "at a penguin fire station with tiny fire trucks and helmets",
    "in a penguin newsroom with cameras and microphones"
  ];
  
  const scenarios = [
    "A colony of adorable penguins",
    "A group of playful penguin friends",
    "A family of emperor penguins",
    "Baby penguins adorably",
    "A wise old penguin and young chicks",
    "A penguin couple romantically",
    "A team of penguin explorers",
    "A penguin dance troupe",
    "A group of penguin chefs",
    "A penguin marching band",
    "A penguin sports team",
    "A penguin art class",
    "A penguin book club",
    "A penguin yoga class",
    "A penguin construction crew",
    // Human-like scenarios
    "A penguin family",
    "A penguin student",
    "A penguin teacher",
    "A penguin doctor",
    "A penguin businessman",
    "A penguin pilot",
    "A penguin cashier",
    "A penguin librarian",
    "A penguin barista",
    "A penguin mechanic",
    "A penguin firefighter",
    "A penguin police officer",
    "A penguin chef",
    "A penguin hairdresser",
    "A penguin dentist",
    "A penguin journalist",
    "A penguin lawyer",
    "A penguin banker",
    "A penguin personal trainer",
    "A penguin taxi driver",
    "A penguin wedding planner",
    "A penguin mailman",
    "A penguin security guard",
    "A penguin photographer",
    "A penguin musician"
  ];
  
  const cameraStyles = [
    "Wide establishing shot showing full penguin bodies and environment, professional wildlife videography style, natural lighting",
    "Medium shot capturing penguins from head to feet with surrounding context, cinematic composition",
    "Full body shot with plenty of background space, documentary-style filming with natural behavior focus",
    "Wide angle view showing multiple penguins in their environment, sweeping camera movements",
    "Medium-wide framing with penguins visible from head to toe, smooth cinematic movements",
    "Establishing shot showing penguins in their full habitat, epic landscape composition",
    "Full figure framing with environmental context, whimsical cartoon-inspired cinematography",
    "Wide shot capturing the complete scene and penguin interactions, artistic lighting",
    "Medium establishing shot with proper headroom and breathing space, time-lapse style",
    "Full body coverage with scenic background visible, slow-motion capture with perfect framing"
  ];
  
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const randomEnvironment = environments[Math.floor(Math.random() * environments.length)];
  const randomCameraStyle = cameraStyles[Math.floor(Math.random() * cameraStyles.length)];
  
  // Create the enhanced prompt by combining scenario with action
  const actionPart = cleanPrompt.includes('penguin') 
    ? originalPrompt.replace(/penguin[s]?/gi, '').trim() 
    : originalPrompt;
  
  const enhancedPrompt = `${randomScenario} ${actionPart}`;
  
  return `${enhancedPrompt} ${randomEnvironment}. The penguins have fluffy black and white feathers, bright orange beaks and webbed feet, and adorable round dark eyes. ${randomCameraStyle}. Frame the shot to show the full penguin bodies from head to feet with proper spacing, avoiding extreme close-ups. Include environmental context and background elements for a well-composed, heartwarming scene with magical penguin charm.`;
}