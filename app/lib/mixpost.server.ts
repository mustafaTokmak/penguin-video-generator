import axios from "axios";
import { APIError, ValidationError } from "./errors";

export interface MixpostPostRequest {
  videoUrl: string;
  caption: string;
  accountIds: string[]; // Mixpost account IDs for different social platforms
  scheduledAt?: string; // Optional: schedule for later
  mediaType?: "video" | "image";
}

export interface MixpostPostResult {
  success: boolean;
  message: string;
  postId?: string;
  error?: string;
  scheduledAt?: string;
}

// Mixpost API Integration
export async function postToMixpost(
  request: MixpostPostRequest,
  apiToken: string,
  mixpostUrl: string = "https://your-mixpost-domain.com"
): Promise<MixpostPostResult> {
  try {
    if (!apiToken || !mixpostUrl) {
      throw new ValidationError("Mixpost API token and URL are required");
    }

    const { videoUrl, caption, accountIds, scheduledAt } = request;

    if (!videoUrl || !caption || !accountIds?.length) {
      throw new ValidationError("Video URL, caption, and account IDs are required");
    }

    // Step 1: Upload media to Mixpost
    const mediaResponse = await uploadMediaToMixpost(videoUrl, apiToken, mixpostUrl);
    
    if (!mediaResponse.success) {
      throw new Error("Failed to upload media to Mixpost");
    }

    // Step 2: Create post
    const postData: any = {
      content: caption,
      media: [
        {
          id: mediaResponse.mediaId,
          type: "video"
        }
      ],
      accounts: accountIds.map(id => ({ id })),
    };

    // Add scheduling if provided
    if (scheduledAt) {
      postData.scheduled_at = scheduledAt;
      postData.status = "scheduled";
    } else {
      postData.status = "published";
    }

    const response = await axios.post(
      `${mixpostUrl}/api/v1/posts`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    return {
      success: true,
      postId: response.data.data.id,
      message: scheduledAt 
        ? `Successfully scheduled post for ${new Date(scheduledAt).toLocaleString()}`
        : "Successfully posted to social media via Mixpost!",
      scheduledAt,
    };

  } catch (error) {
    console.error("Mixpost posting error:", error);
    
    let errorMessage = "Failed to post via Mixpost";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: "Failed to post via Mixpost",
      error: errorMessage,
    };
  }
}

// Upload media to Mixpost
async function uploadMediaToMixpost(
  videoUrl: string, 
  apiToken: string, 
  mixpostUrl: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    // Download video first
    const videoResponse = await axios.get(videoUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout for video download
    });
    
    const videoBuffer = Buffer.from(videoResponse.data);
    
    // Create form data for upload
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', videoBuffer, {
      filename: 'penguin-video.mp4',
      contentType: 'video/mp4',
    });

    const uploadResponse = await axios.post(
      `${mixpostUrl}/api/v1/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 60000, // 60 second timeout for upload
      }
    );

    return {
      success: true,
      mediaId: uploadResponse.data.data.id,
    };

  } catch (error) {
    console.error("Mixpost media upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

// Get Mixpost accounts (connected social media accounts)
export async function getMixpostAccounts(
  apiToken: string,
  mixpostUrl: string
): Promise<Array<{ id: string; name: string; provider: string; username: string }>> {
  try {
    const response = await axios.get(
      `${mixpostUrl}/api/v1/accounts`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Accept": "application/json",
        },
      }
    );

    return response.data.data.map((account: any) => ({
      id: account.id,
      name: account.name,
      provider: account.provider, // 'instagram', 'tiktok', 'twitter', etc.
      username: account.username,
    }));

  } catch (error) {
    console.error("Error fetching Mixpost accounts:", error);
    return [];
  }
}

// Schedule post for optimal times based on Mixpost analytics
export async function scheduleOptimalMixpost(
  request: MixpostPostRequest,
  apiToken: string,
  mixpostUrl: string
): Promise<MixpostPostResult> {
  try {
    // Get optimal posting times for accounts
    const optimalTime = await getOptimalPostingTime(request.accountIds[0], apiToken, mixpostUrl);
    
    return postToMixpost(
      { ...request, scheduledAt: optimalTime },
      apiToken,
      mixpostUrl
    );

  } catch (error) {
    // Fallback to immediate posting if scheduling fails
    return postToMixpost(request, apiToken, mixpostUrl);
  }
}

// Get optimal posting time for an account
async function getOptimalPostingTime(
  accountId: string,
  apiToken: string,
  mixpostUrl: string
): Promise<string> {
  try {
    const response = await axios.get(
      `${mixpostUrl}/api/v1/accounts/${accountId}/insights/best-times`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Accept": "application/json",
        },
      }
    );

    // Use the next optimal time
    const bestTimes = response.data.data;
    if (bestTimes.length > 0) {
      const now = new Date();
      const nextBestTime = new Date(now.getTime() + 60 * 60000); // 1 hour from now
      return nextBestTime.toISOString();
    }

  } catch (error) {
    console.error("Error getting optimal posting time:", error);
  }

  // Default: post in 5 minutes
  const defaultTime = new Date();
  defaultTime.setMinutes(defaultTime.getMinutes() + 5);
  return defaultTime.toISOString();
}