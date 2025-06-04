import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { PenguinLoader } from "~/components/LoadingSpinner";
import { OptimizedImage } from "~/components/OptimizedImage";
import { promptCache } from "~/lib/cache.server";
import { getConfig } from "~/lib/config.server";
import {
  APP_DESCRIPTION,
  APP_NAME,
  VIDEO_ASPECT_RATIOS,
  VIDEO_QUALITY,
  VIDEO_DURATIONS,
  STEPS,
} from "~/lib/constants";
import { APIError, ValidationError, getErrorDetails } from "~/lib/errors";
import { logGeneratedVideo, updateVideoStatus } from "~/lib/file-logger";
import { generateVideo, generateVideoMock } from "~/lib/video-generator";
import type { VideoGenerationResult } from "~/lib/video-generator";
import { enhancePromptForPenguin } from "~/lib/prompt-enhancer";
import { checkRateLimit } from "~/lib/rate-limiter.server";
import { postToSocialMedia } from "~/lib/social-media.server";
import { loadVideos, saveVideo } from "~/lib/video-storage.server";
import { getVideoRequestHistory } from "~/lib/fal-history.server";
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
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { rel: "apple-touch-icon", href: "/favicon.ico" },
    { rel: "apple-touch-icon-precomposed", href: "/favicon.ico" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const config = getConfig();
    const falKey = config.FAL_API_KEY;
    
    // Load local videos
    const localVideos = await loadVideos();
    
    // Try to load fal.ai history if API key is available
    let falVideos: VideoGenerationResult[] = [];
    if (falKey && falKey !== "your_fal_api_key_here") {
      try {
        falVideos = await getVideoRequestHistory(falKey);
      } catch (error) {
        console.warn("Could not fetch fal.ai history:", error);
      }
    }
    
    // Combine and deduplicate videos (prefer local storage for newer entries)
    const allVideos = [...localVideos];
    
    // Add fal.ai videos that aren't already in local storage
    for (const falVideo of falVideos) {
      const exists = localVideos.some(local => 
        local.videoUrl === falVideo.videoUrl || 
        Math.abs(new Date(local.createdAt).getTime() - new Date(falVideo.createdAt).getTime()) < 60000
      );
      if (!exists) {
        allVideos.push(falVideo);
      }
    }
    
    // Sort by creation date (newest first)
    allVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return json({ videos: allVideos.slice(0, 50) }); // Limit to 50 most recent
  } catch (error) {
    console.error("Error loading videos:", error);
    return json({ videos: [] });
  }
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
        const videoId = formData.get("videoId") as string;
        await updateVideoStatus(videoId, "approved");
        return json({
          step: "approve",
          success: true,
          message: "Video approved and logged!",
        });
      } catch (error) {
        return json(
          {
            step: "approve",
            error: `Failed to approve video: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        const falKey = config.FAL_API_KEY;

        if (!falKey || falKey === "your_fal_api_key_here") {
          // Use fallback enhancement for demo
          return json({
            step: "enhance",
            result: {
              isAppropriate: true,
              enhancedPrompt: `A cute penguin in a scenario inspired by: ${prompt}. The penguin has fluffy black and white feathers, bright orange beak and webbed feet, and adorable round dark eyes. Set in a pristine Antarctic landscape with sparkling white snow, crystal-clear ice formations, and a serene blue sky. Professional wildlife videography style, natural lighting, smooth movements, adorable and heartwarming composition with penguin-themed elements.`,
              originalPrompt: prompt,
              reasoning:
                "Enhanced any prompt to be penguin-themed with detailed characteristics and Antarctic environment",
              suggestedStyle: "realistic-cute",
            },
          });
        }

        const result = await enhancePromptForPenguin(prompt, falKey);

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
        const falKey = config.FAL_API_KEY;

        let result: any;

        // For demo purposes, use mock if no API key
        if (!falKey || falKey === "your_fal_api_key_here") {
          result = generateVideoMock({ prompt: enhancedPrompt });
        } else {
          result = await generateVideo(
            {
              prompt: enhancedPrompt,
              aspectRatio: VIDEO_ASPECT_RATIOS.LANDSCAPE,
              duration: VIDEO_DURATIONS.SHORT,
              quality: VIDEO_QUALITY.STANDARD,
            },
            falKey,
          );
        }

        // Log the generated video
        await logGeneratedVideo({
          id: result.id,
          videoUrl: result.videoUrl || "",
          prompt: originalPrompt || enhancedPrompt,
          enhancedPrompt: enhancedPrompt,
          createdAt: result.createdAt,
          status: "generated",
          duration: result.duration,
        });

        // Save video to storage
        await saveVideo({
          ...result,
          prompt: originalPrompt || enhancedPrompt,
          enhancedPrompt: enhancedPrompt,
        });

        return json({ step: STEPS.GENERATE, result });
      } catch (error) {
        return json(
          {
            step: "generate",
            error: `Failed to generate video: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 },
        );
      }
    }

    if (step === "share") {
      try {
        const videoUrl = formData.get("videoUrl") as string;
        const caption = formData.get("caption") as string;
        const platform = formData.get("platform") as string;
        const profileIds = formData.get("profileIds") as string;
        
        if (!videoUrl || !caption || !platform) {
          throw new ValidationError("Video URL, caption, and platform are required");
        }

        const config = getConfig();

        let result;

        // Use direct API integration
        const credentials = {
          instagramAccessToken: config.INSTAGRAM_ACCESS_TOKEN,
          instagramBusinessAccountId: config.INSTAGRAM_BUSINESS_ACCOUNT_ID,
          tiktokAccessToken: config.TIKTOK_ACCESS_TOKEN,
        };

        result = await postToSocialMedia(
          { videoUrl, caption, platform: platform as "instagram" | "tiktok" },
          credentials
        );

        return json({
          step: "share",
          result,
          success: result.success,
          message: result.message,
          error: result.error,
        });
      } catch (error) {
        return json(
          {
            step: "share",
            error: `Failed to share to ${formData.get("platform")}: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  const { videos } = useLoaderData<{ videos: VideoGenerationResult[] }>();
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
              🐧 Cute Penguin Video Generator
            </h1>
            <p className="text-xl text-blue-100">
              Create adorable penguin videos with AI magic!
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
                <span>Generate Video</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            {/* Step 1: Prompt Input */}
            {currentStep === "prompt" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Step 1: Describe Your Penguin Video
                </h2>
                <Form method="post" className="space-y-6">
                  <input type="hidden" name="step" value="enhance" />
                  <div>
                    <label
                      htmlFor="prompt"
                      className="block text-lg font-medium text-gray-700 mb-2"
                    >
                      What should your penguin video show?
                    </label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      rows={4}
                      className="w-full p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                      placeholder="Example: a penguin sliding down an icy slope and splashing into the water..."
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
                          <PenguinLoader message="Generating Video..." />
                        </div>
                      ) : (
                        "🎨 Generate Video"
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
                  Step 3: Your Penguin Video
                </h2>
                <div className="space-y-6">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                    <h3 className="font-semibold text-green-800 mb-2">
                      🎉 Video Generated!
                    </h3>
                    <p className="text-green-700">
                      Your cute penguin video is ready!
                    </p>
                  </div>

                  {actionData.result.videoUrl && (
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <video
                        src={actionData.result.videoUrl}
                        className="w-full max-w-lg mx-auto rounded-lg shadow-md"
                        controls
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">
                      Video Details:
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
                    {actionData.result.duration && (
                      <p>
                        <strong>Duration:</strong>{" "}
                        {actionData.result.duration} seconds
                      </p>
                    )}

                    {actionData.result.videoUrl && (
                      <div className="mt-4 flex space-x-4">
                        <a
                          href={actionData.result.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          🎬 View Full Size
                        </a>
                        <Form method="post" className="inline">
                          <input type="hidden" name="step" value="approve" />
                          <input
                            type="hidden"
                            name="videoId"
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

                  {/* Social Media Sharing */}
                  {actionData.result.videoUrl && (
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-purple-800 mb-4">
                        📱 Share to Social Media
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                            Caption for your video:
                          </label>
                          <textarea
                            id="caption"
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Write a caption for your cute penguin video..."
                            defaultValue={`🐧 Check out this adorable penguin video I created!`}
                          />
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-3">🎯 Direct API Integration</h4>
                          <p className="text-blue-700 text-sm mb-4">
                            Post directly to social platforms using their official APIs
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <Form method="post">
                              <input type="hidden" name="step" value="share" />
                              <input type="hidden" name="videoUrl" value={actionData.result.videoUrl} />
                              <input type="hidden" name="platform" value="instagram" />
                              <input type="hidden" name="caption" value="" />
                              <button
                                type="submit"
                                onClick={(e) => {
                                  const caption = document.getElementById('caption') as HTMLTextAreaElement;
                                  e.currentTarget.querySelector('input[name="caption"]')?.setAttribute('value', caption?.value || '');
                                }}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                              >
                                <span>📸</span>
                                <span>Post to Instagram</span>
                              </button>
                            </Form>
                            <Form method="post">
                              <input type="hidden" name="step" value="share" />
                              <input type="hidden" name="videoUrl" value={actionData.result.videoUrl} />
                              <input type="hidden" name="platform" value="tiktok" />
                              <input type="hidden" name="caption" value="" />
                              <button
                                type="submit"
                                onClick={(e) => {
                                  const caption = document.getElementById('caption') as HTMLTextAreaElement;
                                  e.currentTarget.querySelector('input[name="caption"]')?.setAttribute('value', caption?.value || '');
                                }}
                                disabled={isLoading}
                                className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                              >
                                <span>🎵</span>
                                <span>Post to TikTok</span>
                              </button>
                            </Form>
                          </div>
                          <div className="mt-3 text-xs text-blue-600">
                            Requires API credentials in .env file - see setup guide
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep("prompt");
                      window.location.reload();
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors"
                  >
                    🐧 Create Another Penguin Video
                  </button>
                </div>
              </div>
            )}

            {/* Social Media Sharing Result */}
            {actionData?.step === "share" && (
              <div className={`border-l-4 p-4 rounded ${actionData.success ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"}`}>
                <h3 className={`font-semibold mb-2 ${actionData.success ? "text-green-800" : "text-red-800"}`}>
                  {actionData.success ? "✅ Shared Successfully!" : "❌ Sharing Failed"}
                </h3>
                <p className={actionData.success ? "text-green-700" : "text-red-700"}>
                  {actionData.message}
                </p>
                {actionData.error && (
                  <p className="text-red-600 text-sm mt-2">
                    Error: {actionData.error}
                  </p>
                )}
                {actionData.result?.postId && (
                  <p className="text-green-600 text-sm mt-2">
                    Post ID: {actionData.result.postId}
                  </p>
                )}
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

          {/* Video Gallery */}
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              🎥 Previous Penguin Videos
            </h2>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-white/90 backdrop-blur-lg rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
                  >
                    {video.videoUrl ? (
                      <div className="relative aspect-video bg-gray-100">
                        <video
                          src={video.videoUrl}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-gray-200 flex items-center justify-center">
                        <div className="text-center p-4">
                          <p className="text-gray-600 font-medium">
                            {video.status === "failed" ? "❌ Generation Failed" : "⏳ Processing..."}
                          </p>
                          {video.errorMessage && (
                            <p className="text-red-600 text-sm mt-2">
                              {video.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-gray-800 text-sm mb-2 line-clamp-2">
                        <span className="font-semibold">Prompt:</span> {video.prompt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          {new Date(video.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {video.duration && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {video.duration}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white/80 py-12">
                <p className="text-xl mb-4">🎬 No videos generated yet</p>
                <p>Create your first penguin video above to see it in the gallery!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
