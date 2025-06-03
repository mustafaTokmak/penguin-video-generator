import type {
  ActionData,
  ApproveActionData,
  EnhanceActionData,
  GenerateActionData,
} from "~/types";

export function isEnhanceActionData(
  data: ActionData | undefined,
): data is EnhanceActionData {
  return (
    !!data && "step" in data && data.step === "enhance" && "result" in data
  );
}

export function isGenerateActionData(
  data: ActionData | undefined,
): data is GenerateActionData {
  return (
    !!data && "step" in data && data.step === "generate" && "result" in data
  );
}

export function isApproveActionData(
  data: ActionData | undefined,
): data is ApproveActionData {
  return (
    !!data && "step" in data && data.step === "approve" && "success" in data
  );
}

export function hasError(
  data: ActionData | undefined,
): data is { error: string; code?: string; details?: unknown } {
  return !!data && "error" in data;
}
