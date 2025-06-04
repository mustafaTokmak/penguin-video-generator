import type {
  VIDEO_ASPECT_RATIOS,
  VIDEO_QUALITY,
  VIDEO_DURATIONS,
  STEPS,
} from "~/lib/constants";

export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[keyof typeof VIDEO_ASPECT_RATIOS];
export type VideoQuality = (typeof VIDEO_QUALITY)[keyof typeof VIDEO_QUALITY];
export type VideoDuration = (typeof VIDEO_DURATIONS)[keyof typeof VIDEO_DURATIONS];
export type Step = (typeof STEPS)[keyof typeof STEPS];

export interface ActionResponse<T = unknown> {
  step?: Step;
  result?: T;
  error?: string;
  code?: string;
  details?: unknown;
  success?: boolean;
  message?: string;
}

export interface EnhanceActionData extends ActionResponse {
  step: "enhance";
  result: {
    isAppropriate: boolean;
    enhancedPrompt: string;
    originalPrompt: string;
    reasoning: string;
    suggestedStyle?: string;
  };
}

export interface GenerateActionData extends ActionResponse {
  step: "generate";
  result: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    videoUrl?: string;
    prompt: string;
    createdAt: string;
    errorMessage?: string;
    duration?: number;
  };
}

export interface ApproveActionData extends ActionResponse {
  step: "approve";
  success: boolean;
  message: string;
}

export type ActionData =
  | EnhanceActionData
  | GenerateActionData
  | ApproveActionData
  | ActionResponse
  | { error: string; code?: string; details?: unknown };
