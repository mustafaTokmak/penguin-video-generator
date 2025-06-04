import axios from "axios";
import { APIError, ValidationError } from "./errors";

export interface BufferPostRequest {
  videoUrl: string;
  caption: string;
  profileIds: string[]; // Buffer profile IDs for different social accounts
  scheduledAt?: string; // Optional: schedule for later
}

export interface BufferPostResult {
  success: boolean;
  message: string;
  postId?: string;
  error?: string;
  scheduledAt?: string;
}

// Buffer API Integration
export async function postToBuffer(
  request: BufferPostRequest,
  accessToken: string,
): Promise<BufferPostResult> {
  try {
    if (!accessToken) {
      throw new ValidationError("Buffer access token is required");
    }

    const { videoUrl, caption, profileIds, scheduledAt } = request;

    if (!videoUrl || !caption || !profileIds?.length) {
      throw new ValidationError("Video URL, caption, and profile IDs are required");
    }

    // Create update for Buffer
    const updateData: any = {
      text: caption,
      media: {
        video: videoUrl,
      },
      profile_ids: profileIds,
    };

    // Add scheduling if provided
    if (scheduledAt) {
      updateData.scheduled_at = scheduledAt;
    }

    const response = await axios.post(
      "https://api.bufferapp.com/1/updates/create.json",
      updateData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      postId: response.data.id,
      message: scheduledAt 
        ? `Successfully scheduled post for ${new Date(scheduledAt).toLocaleString()}`
        : "Successfully posted to social media via Buffer!",
      scheduledAt,
    };

  } catch (error) {
    console.error("Buffer posting error:", error);
    
    let errorMessage = "Failed to post via Buffer";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.error || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: "Failed to post via Buffer",
      error: errorMessage,
    };
  }
}

// Get Buffer profiles (social accounts connected to Buffer)
export async function getBufferProfiles(accessToken: string) {
  try {
    const response = await axios.get(
      "https://api.bufferapp.com/1/profiles.json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.map((profile: any) => ({
      id: profile.id,
      service: profile.service, // 'twitter', 'facebook', 'instagram', 'linkedin', etc.
      username: profile.service_username,
      avatar: profile.avatar,
    }));

  } catch (error) {
    console.error("Error fetching Buffer profiles:", error);
    throw new APIError("Failed to fetch Buffer profiles", 500);
  }
}

// Schedule post for optimal times
export async function scheduleOptimalPost(
  request: BufferPostRequest,
  accessToken: string,
): Promise<BufferPostResult> {
  try {
    // Get optimal posting times for the profile
    const optimalTimes = await getOptimalPostingTimes(request.profileIds[0], accessToken);
    
    // Use the next optimal time
    const nextOptimalTime = optimalTimes[0];
    
    return postToBuffer(
      { ...request, scheduledAt: nextOptimalTime },
      accessToken
    );

  } catch (error) {
    // Fallback to immediate posting if scheduling fails
    return postToBuffer(request, accessToken);
  }
}

// Get optimal posting times for a profile
async function getOptimalPostingTimes(profileId: string, accessToken: string): Promise<string[]> {
  try {
    const response = await axios.get(
      `https://api.bufferapp.com/1/profiles/${profileId}/schedules.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Return the next few scheduled times
    return response.data.schedules.map((schedule: any) => schedule.times).flat().slice(0, 3);

  } catch (error) {
    // Return default times if API fails
    const now = new Date();
    return [
      new Date(now.getTime() + 5 * 60000).toISOString(), // 5 minutes from now
      new Date(now.getTime() + 60 * 60000).toISOString(), // 1 hour from now
      new Date(now.getTime() + 120 * 60000).toISOString(), // 2 hours from now
    ];
  }
}