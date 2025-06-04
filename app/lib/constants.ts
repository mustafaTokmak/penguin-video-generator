export const APP_NAME = "Cute Penguin Video Generator";
export const APP_DESCRIPTION = "Generate adorable penguin videos with AI";

export const VIDEO_ASPECT_RATIOS = {
  LANDSCAPE: "16:9" as const,
  PORTRAIT: "9:16" as const,
  SQUARE: "1:1" as const,
};

export const VIDEO_QUALITY = {
  STANDARD: "standard" as const,
  HIGH: "high" as const,
};

export const VIDEO_DURATIONS = {
  SHORT: 5 as const,
  MEDIUM: 10 as const,
  LONG: 15 as const,
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
  NO_API_KEY: "Fal AI API key is not configured. Using demo mode.",
  RATE_LIMIT: "Too many requests. Please wait a moment before trying again.",
  INVALID_PROMPT: "Please enter a valid prompt (3-1000 characters).",
};
