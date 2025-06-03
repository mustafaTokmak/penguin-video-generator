import type {
  IMAGE_QUALITY,
  IMAGE_SIZES,
  IMAGE_STYLE,
  STEPS,
} from "~/lib/constants";

export type ImageSize = (typeof IMAGE_SIZES)[keyof typeof IMAGE_SIZES];
export type ImageQuality = (typeof IMAGE_QUALITY)[keyof typeof IMAGE_QUALITY];
export type ImageStyle = (typeof IMAGE_STYLE)[keyof typeof IMAGE_STYLE];
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
    imageUrl?: string;
    prompt: string;
    createdAt: string;
    errorMessage?: string;
    revisedPrompt?: string;
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
