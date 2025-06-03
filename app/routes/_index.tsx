import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { PenguinLoader } from "~/components/LoadingSpinner";
import { OptimizedImage } from "~/components/OptimizedImage";
import { promptCache } from "~/lib/cache.server";
import { getConfig } from "~/lib/config.server";
import {
  APP_DESCRIPTION,
  APP_NAME,
  IMAGE_QUALITY,
  IMAGE_SIZES,
  IMAGE_STYLE,
  STEPS,
} from "~/lib/constants";
import { APIError, ValidationError, getErrorDetails } from "~/lib/errors";
import { logGeneratedImage, updateImageStatus } from "~/lib/file-logger";
import { generateImage, generateImageMock } from "~/lib/image-generator";
import { enhancePromptForPenguin } from "~/lib/prompt-enhancer";
import { checkRateLimit } from "~/lib/rate-limiter.server";
import {
  hasError,
  isApproveActionData,
  isEnhanceActionData,
  isGenerateActionData,
} from "~/lib/type-guards";
import type { ActionData } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: `🐧 ${APP_NAME}` },
    { name: "description", content: APP_DESCRIPTION },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { name: "theme-color", content: "#3b82f6" },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Rate limiting
    const clientIP = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(clientIP);

    const formData = await request.formData();
    const step = formData.get("step") as string;
    const prompt = formData.get("prompt") as string;

    if (!step) {
      throw new ValidationError("Step is required");
    }

    if (step === STEPS.APPROVE) {
      try {
        const imageId = formData.get("imageId") as string;
        await updateImageStatus(imageId, "approved");
        return json({
          step: "approve",
          success: true,
          message: "Image approved and logged!",
        });
      } catch (error) {
        return json(
          {
            step: "approve",
            error: `Failed to approve image: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 },
        );
      }
    }

    if (step === STEPS.ENHANCE) {
      try {
        if (!prompt || prompt.trim().length < 3) {
          throw new ValidationError(
            "Please enter a prompt with at least 3 characters",
          );
        }

        // Check cache first
        const cacheKey = `enhance:${prompt}`;
        const cached = promptCache.get(cacheKey);
        if (cached) {
          return json({ step: STEPS.ENHANCE, result: JSON.parse(cached) });
        }

        const config = getConfig();
        const openaiKey = config.OPENAI_API_KEY;

        if (openaiKey === "your_openai_api_key_here") {
          // Use fallback enhancement for demo
          return json({
            step: "enhance",
            result: {
              isAppropriate: true,
              enhancedPrompt: `A cute penguin in a scenario inspired by: ${prompt}. The penguin has fluffy black and white feathers, bright orange beak and webbed feet, and adorable round dark eyes. Set in a pristine Antarctic landscape with sparkling white snow, crystal-clear ice formations, and a serene blue sky. Professional wildlife photography style, natural lighting, high detail, adorable and heartwarming composition with penguin-themed elements.`,
              originalPrompt: prompt,
              reasoning:
                "Enhanced any prompt to be penguin-themed with detailed characteristics and Antarctic environment",
              suggestedStyle: "realistic-cute",
            },
          });
        }

        const result = await enhancePromptForPenguin(prompt, openaiKey);

        // Cache the result
        promptCache.set(cacheKey, JSON.stringify(result));

        return json({ step: STEPS.ENHANCE, result });
      } catch (error) {
        return json(
          {
            step: "enhance",
            error: `Failed to enhance prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 },
        );
      }
    }

    if (step === STEPS.GENERATE) {
      try {
        const enhancedPrompt = formData.get("enhancedPrompt") as string;
        const originalPrompt = formData.get("originalPrompt") as string;
        const config = getConfig();
        const openaiKey = config.OPENAI_API_KEY;

        let result: any;

        // For demo purposes, use mock if no API key
        if (!openaiKey || openaiKey === "your_openai_api_key_here") {
          result = generateImageMock({ prompt: enhancedPrompt });
        } else {
          result = await generateImage(
            {
              prompt: enhancedPrompt,
              size: IMAGE_SIZES.SQUARE,
              quality: IMAGE_QUALITY.HD,
              style: IMAGE_STYLE.VIVID,
            },
            openaiKey,
          );
        }

        // Log the generated image
        await logGeneratedImage({
          id: result.id,
          imageUrl: result.imageUrl || "",
          prompt: originalPrompt || enhancedPrompt,
          enhancedPrompt: enhancedPrompt,
          createdAt: result.createdAt,
          status: "generated",
          revisedPrompt: result.revisedPrompt,
        });

        return json({ step: STEPS.GENERATE, result });
      } catch (error) {
        return json(
          {
            step: "generate",
            error: `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 },
        );
      }
    }

    return json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    const errorDetails = getErrorDetails(error);
    return json(
      {
        error: errorDetails.message,
        code: errorDetails.code,
        details: errorDetails.details,
      },
      { status: errorDetails.statusCode || 500 },
    );
  }
};

export { ErrorBoundary };

export default function Index() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState<
    (typeof STEPS)[keyof typeof STEPS]
  >(STEPS.PROMPT);

  const isLoading = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              🐧 Cute Penguin Image Generator
            </h1>
            <p className="text-xl text-blue-100">
              Create adorable penguin images with AI magic!
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-8">
              <div
                className={`flex items-center space-x-2 ${currentStep === "prompt" ? "text-yellow-300" : "text-blue-200"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "prompt" ? "bg-yellow-300 text-blue-900" : "bg-blue-200 text-blue-600"}`}
                >
                  1
                </div>
                <span>Write Prompt</span>
              </div>
              <div
                className={`flex items-center space-x-2 ${currentStep === "enhance" ? "text-yellow-300" : "text-blue-200"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "enhance" ? "bg-yellow-300 text-blue-900" : "bg-blue-200 text-blue-600"}`}
                >
                  2
                </div>
                <span>Enhance Prompt</span>
              </div>
              <div
                className={`flex items-center space-x-2 ${currentStep === "generate" ? "text-yellow-300" : "text-blue-200"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "generate" ? "bg-yellow-300 text-blue-900" : "bg-blue-200 text-blue-600"}`}
                >
                  3
                </div>
                <span>Generate Image</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            {/* Step 1: Prompt Input */}
            {currentStep === "prompt" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Step 1: Describe Your Penguin Image
                </h2>
                <Form method="post" className="space-y-6">
                  <input type="hidden" name="step" value="enhance" />
                  <div>
                    <label
                      htmlFor="prompt"
                      className="block text-lg font-medium text-gray-700 mb-2"
                    >
                      How should your penguin look?
                    </label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      rows={4}
                      className="w-full p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                      placeholder="Example: standing proudly on an iceberg with fluffy feathers..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <PenguinLoader message="Enhancing..." />
                      </div>
                    ) : (
                      "✨ Enhance for Penguins"
                    )}
                  </button>
                </Form>
              </div>
            )}

            {/* Step 2: Enhanced Prompt Review */}
            {isEnhanceActionData(actionData) && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Step 2: Enhanced Penguin Prompt
                </h2>
                <div className="space-y-6">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                    <h3 className="font-semibold text-green-800 mb-2">
                      ✨ Prompt Enhanced!
                    </h3>
                    <p className="text-green-700">
                      {actionData.result.reasoning}
                    </p>
                  </div>

                  <div>
                    <div className="block text-lg font-medium text-gray-700 mb-2">
                      Original Prompt:
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-gray-800">
                      {actionData.result.originalPrompt}
                    </div>
                  </div>

                  <div>
                    <div className="block text-lg font-medium text-gray-700 mb-2">
                      Enhanced Prompt:
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-blue-900 border-l-4 border-blue-400">
                      {actionData.result.enhancedPrompt}
                    </div>
                  </div>

                  <Form method="post" className="flex space-x-4">
                    <input type="hidden" name="step" value="generate" />
                    <input
                      type="hidden"
                      name="enhancedPrompt"
                      value={actionData.result.enhancedPrompt}
                    />
                    <input
                      type="hidden"
                      name="originalPrompt"
                      value={actionData.result.originalPrompt}
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <PenguinLoader message="Generating Image..." />
                        </div>
                      ) : (
                        "🎨 Generate Image"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep("prompt");
                        window.location.reload();
                      }}
                      className="px-6 py-4 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                      ← Start Over
                    </button>
                  </Form>
                </div>
              </div>
            )}

            {/* Step 3: Image Generation Result */}
            {isGenerateActionData(actionData) && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Step 3: Your Penguin Image
                </h2>
                <div className="space-y-6">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                    <h3 className="font-semibold text-green-800 mb-2">
                      🎉 Image Generated!
                    </h3>
                    <p className="text-green-700">
                      Your cute penguin image is ready!
                    </p>
                  </div>

                  {actionData.result.imageUrl && (
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <OptimizedImage
                        src={actionData.result.imageUrl}
                        alt="Generated penguin"
                        className="w-full max-w-lg mx-auto rounded-lg shadow-md"
                        width={1024}
                        height={1024}
                      />
                    </div>
                  )}

                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">
                      Image Details:
                    </h3>
                    <p>
                      <strong>ID:</strong> {actionData.result.id}
                    </p>
                    <p>
                      <strong>Status:</strong> {actionData.result.status}
                    </p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {new Date(actionData.result.createdAt).toLocaleString()}
                    </p>
                    {actionData.result.revisedPrompt && (
                      <p>
                        <strong>AI Enhanced Prompt:</strong>{" "}
                        {actionData.result.revisedPrompt}
                      </p>
                    )}

                    {actionData.result.imageUrl && (
                      <div className="mt-4 flex space-x-4">
                        <a
                          href={actionData.result.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          🖼️ View Full Size
                        </a>
                        <Form method="post" className="inline">
                          <input type="hidden" name="step" value="approve" />
                          <input
                            type="hidden"
                            name="imageId"
                            value={actionData.result.id}
                          />
                          <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                          >
                            ✅ Approve for Design Flow
                          </button>
                        </Form>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("prompt");
                      window.location.reload();
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors"
                  >
                    🐧 Create Another Penguin Image
                  </button>
                </div>
              </div>
            )}

            {/* Approval Success */}
            {isApproveActionData(actionData) && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <h3 className="font-semibold text-green-800 mb-2">
                  ✅ Success!
                </h3>
                <p className="text-green-700">{actionData.message}</p>
              </div>
            )}

            {/* Error Display */}
            {hasError(actionData) && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
                <p className="text-red-700">{actionData.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep("prompt");
                    window.location.reload();
                  }}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
