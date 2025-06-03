export const APP_NAME = "Cute Penguin Image Generator";
export const APP_DESCRIPTION = "Generate adorable penguin images with AI";

export const IMAGE_SIZES = {
  SQUARE: "1024x1024" as const,
  LANDSCAPE: "1792x1024" as const,
  PORTRAIT: "1024x1792" as const,
};

export const IMAGE_QUALITY = {
  STANDARD: "standard" as const,
  HD: "hd" as const,
};

export const IMAGE_STYLE = {
  VIVID: "vivid" as const,
  NATURAL: "natural" as const,
};

export const PROMPT_LIMITS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 1000,
  ENHANCED_MAX_LENGTH: 4000,
};

export const STEPS = {
  PROMPT: "prompt" as const,
  ENHANCE: "enhance" as const,
  GENERATE: "generate" as const,
  APPROVE: "approve" as const,
};

export const ERROR_MESSAGES = {
  GENERIC: "An unexpected error occurred. Please try again.",
  NO_API_KEY: "OpenAI API key is not configured. Using demo mode.",
  RATE_LIMIT: "Too many requests. Please wait a moment before trying again.",
  INVALID_PROMPT: "Please enter a valid prompt (3-1000 characters).",
};
