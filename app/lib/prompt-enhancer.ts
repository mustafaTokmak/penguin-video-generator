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

  const systemPrompt = `You are an expert at creating prompts for AI image generation focused on cute penguin content.

Your task:
1. Take any input prompt and enhance it to create cute, family-friendly penguin images
2. Always add penguin elements to make the prompt penguin-focused
3. Add specific details about penguin appearance, poses, and environment
4. Ensure the prompt will result in adorable, engaging artwork

Guidelines:
- Always enhance the prompt regardless of content (make it penguin-themed)
- Add specific penguin behaviors (waddling, sliding, playing, etc.)
- Include environmental details (Antarctic scenery, ice, snow, water)
- Add visual and artistic descriptions for better image generation
- Keep prompts under 200 words for optimal image generation
- Make penguins the main focus
- Include art style, lighting, and composition details
- Transform non-penguin prompts into penguin scenarios

Response format: JSON with fields:
- isAppropriate: true (always true, we enhance everything)
- enhancedPrompt: string (enhanced version for image generation)
- originalPrompt: string (copy of input)
- reasoning: string (explanation of changes)
- suggestedStyle: string (art style recommendation)`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Please enhance this prompt to create cute penguin image generation (always make it penguin-themed): "${originalPrompt}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        `OpenAI API error: ${errorData.error?.message || "Unknown error"}`,
        response.status,
        errorData,
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const result = JSON.parse(content);
      return {
        isAppropriate: result.isAppropriate,
        enhancedPrompt: result.enhancedPrompt,
        originalPrompt: originalPrompt,
        reasoning: result.reasoning,
        suggestedStyle: result.suggestedStyle,
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        isAppropriate: true,
        enhancedPrompt: `A cute penguin in a scenario inspired by: ${originalPrompt}. The penguin has fluffy black and white feathers, bright orange beak and webbed feet, and adorable round dark eyes. Set in a beautiful Antarctic landscape with pristine white snow and sparkling ice formations. Professional wildlife photography style, natural lighting, high detail, adorable and heartwarming composition with penguin-themed elements.`,
        originalPrompt: originalPrompt,
        reasoning:
          "Enhanced any prompt to be penguin-themed with detailed characteristics and Antarctic setting",
        suggestedStyle: "realistic-cute",
      };
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error("Error enhancing prompt:", error);
    throw new APIError(
      "Failed to enhance prompt. Please try again later.",
      500,
      error,
    );
  }
}
