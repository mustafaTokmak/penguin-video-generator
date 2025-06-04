import axios from "axios";
import FormData from "form-data";
import { APIError, ValidationError } from "./errors";

export interface SocialMediaPostRequest {
  videoUrl: string;
  caption: string;
  platform: "instagram" | "tiktok";
  thumbnailUrl?: string;
}

export interface SocialMediaPostResult {
  platform: "instagram" | "tiktok";
  postId?: string;
  success: boolean;
  message: string;
  error?: string;
}

// Instagram Graph API Integration for Video Posting
export async function postToInstagram(
  videoUrl: string,
  caption: string,
  accessToken: string,
  instagramBusinessAccountId: string,
  thumbnailUrl?: string,
): Promise<SocialMediaPostResult> {
  try {
    if (!accessToken || !instagramBusinessAccountId) {
      throw new ValidationError("Instagram access token and business account ID are required");
    }

    // Step 1: Create video media container
    const mediaData: any = {
      video_url: videoUrl,
      caption: caption,
      media_type: "VIDEO",
      access_token: accessToken,
    };

    // Add thumbnail if provided
    if (thumbnailUrl) {
      mediaData.thumb_offset = 0; // Use first frame as thumbnail or specify offset
    }

    const containerResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${instagramBusinessAccountId}/media`,
      mediaData
    );

    const creationId = containerResponse.data.id;

    // Step 2: Check upload status (videos may take time to process)
    let uploadStatus = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 5 minutes

    while (uploadStatus === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${creationId}`,
        {
          params: {
            fields: "status_code",
            access_token: accessToken,
          }
        }
      );

      uploadStatus = statusResponse.data.status_code;
      attempts++;
    }

    if (uploadStatus !== "FINISHED") {
      throw new Error(`Video upload failed with status: ${uploadStatus}`);
    }

    // Step 3: Publish the video
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${instagramBusinessAccountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );

    return {
      platform: "instagram",
      postId: publishResponse.data.id,
      success: true,
      message: "Successfully posted video to Instagram!",
    };

  } catch (error) {
    console.error("Instagram video posting error:", error);
    
    let errorMessage = "Failed to post video to Instagram";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.error?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      platform: "instagram",
      success: false,
      message: "Failed to post video to Instagram",
      error: errorMessage,
    };
  }
}

// TikTok Content Posting API Integration for Video
export async function postToTikTok(
  videoUrl: string,
  caption: string,
  accessToken: string,
): Promise<SocialMediaPostResult> {
  try {
    if (!accessToken) {
      throw new ValidationError("TikTok access token is required");
    }

    // Step 1: Initialize video upload
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY", // Change to "PUBLIC_TO_EVERYONE" if desired
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000, // Thumbnail at 1 second
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: await getVideoSize(videoUrl),
          chunk_size: 10000000, // 10MB chunks
          total_chunk_count: 1,
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        }
      }
    );

    const { publish_id, upload_url } = initResponse.data.data;

    // Step 2: Upload video file
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const videoBuffer = Buffer.from(videoResponse.data);

    await axios.put(upload_url, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
      }
    });

    // Step 3: Confirm upload and publish
    const publishResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/",
      {
        post_id: publish_id,
      },
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        }
      }
    );

    return {
      platform: "tiktok",
      postId: publishResponse.data.data.post_id,
      success: true,
      message: "Successfully posted video to TikTok!",
    };

  } catch (error) {
    console.error("TikTok video posting error:", error);
    
    let errorMessage = "Failed to post video to TikTok";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.error?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      platform: "tiktok",
      success: false,
      message: "Failed to post video to TikTok",
      error: errorMessage,
    };
  }
}

// Helper function to get video file size from URL
async function getVideoSize(videoUrl: string): Promise<number> {
  try {
    const response = await axios.head(videoUrl);
    return parseInt(response.headers['content-length'] || '0', 10);
  } catch (error) {
    console.error("Error getting video size:", error);
    return 0; // Default fallback
  }
}

// Combined social media posting function
export async function postToSocialMedia(
  request: SocialMediaPostRequest,
  credentials: {
    instagramAccessToken?: string;
    instagramBusinessAccountId?: string;
    tiktokAccessToken?: string;
  }
): Promise<SocialMediaPostResult> {
  const { videoUrl, caption, platform, thumbnailUrl } = request;

  if (!videoUrl || !caption) {
    throw new ValidationError("Video URL and caption are required");
  }

  switch (platform) {
    case "instagram":
      if (!credentials.instagramAccessToken || !credentials.instagramBusinessAccountId) {
        throw new ValidationError("Instagram credentials are required");
      }
      return postToInstagram(
        videoUrl,
        caption,
        credentials.instagramAccessToken,
        credentials.instagramBusinessAccountId,
        thumbnailUrl
      );

    case "tiktok":
      if (!credentials.tiktokAccessToken) {
        throw new ValidationError("TikTok access token is required");
      }
      return postToTikTok(videoUrl, caption, credentials.tiktokAccessToken);

    default:
      throw new ValidationError(`Unsupported platform: ${platform}`);
  }
}

// Helper function to validate social media credentials
export function validateSocialMediaCredentials(platform: "instagram" | "tiktok", credentials: any): boolean {
  switch (platform) {
    case "instagram":
      return !!(credentials.instagramAccessToken && credentials.instagramBusinessAccountId);
    case "tiktok":
      return !!credentials.tiktokAccessToken;
    default:
      return false;
  }
}