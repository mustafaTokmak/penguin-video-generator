import axios from "axios";
import { APIError, ValidationError } from "./errors";

export interface ZapierWebhookRequest {
  videoUrl: string;
  caption: string;
  platform: string;
  title?: string;
}

export interface ZapierWebhookResult {
  success: boolean;
  message: string;
  error?: string;
}

// Zapier Webhook Integration - Super Simple!
export async function triggerZapierWebhook(
  request: ZapierWebhookRequest,
  webhookUrl: string,
): Promise<ZapierWebhookResult> {
  try {
    if (!webhookUrl) {
      throw new ValidationError("Zapier webhook URL is required");
    }

    const { videoUrl, caption, platform, title } = request;

    if (!videoUrl || !caption) {
      throw new ValidationError("Video URL and caption are required");
    }

    // Send data to Zapier webhook
    const webhookData = {
      video_url: videoUrl,
      caption: caption,
      platform: platform,
      title: title || "Cute Penguin Video",
      timestamp: new Date().toISOString(),
      // Add any other data Zapier might need
      source: "penguin-video-generator",
    };

    const response = await axios.post(webhookUrl, webhookData, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10 second timeout
    });

    return {
      success: true,
      message: `Successfully triggered Zapier automation for ${platform}!`,
    };

  } catch (error) {
    console.error("Zapier webhook error:", error);
    
    let errorMessage = "Failed to trigger Zapier webhook";
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        errorMessage = "Zapier webhook timeout - but it might still be processing";
      } else {
        errorMessage = error.response?.data?.message || error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: "Failed to trigger Zapier automation",
      error: errorMessage,
    };
  }
}

// IFTTT Webhook Integration (Alternative)
export async function triggerIFTTTWebhook(
  request: ZapierWebhookRequest,
  webhookKey: string,
  eventName: string = "penguin_video_posted"
): Promise<ZapierWebhookResult> {
  try {
    if (!webhookKey) {
      throw new ValidationError("IFTTT webhook key is required");
    }

    const { videoUrl, caption, platform } = request;

    // IFTTT expects up to 3 values
    const iftttData = {
      value1: videoUrl,      // Video URL
      value2: caption,       // Caption
      value3: platform,      // Platform (instagram/tiktok)
    };

    const iftttUrl = `https://maker.ifttt.com/trigger/${eventName}/with/key/${webhookKey}`;

    const response = await axios.post(iftttUrl, iftttData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      message: `Successfully triggered IFTTT automation for ${platform}!`,
    };

  } catch (error) {
    console.error("IFTTT webhook error:", error);
    
    return {
      success: false,
      message: "Failed to trigger IFTTT automation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}