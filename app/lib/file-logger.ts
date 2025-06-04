import { promises as fs } from "node:fs";
import path from "node:path";

export interface GeneratedVideo {
  id: string;
  videoUrl: string;
  prompt: string;
  enhancedPrompt: string;
  createdAt: string;
  status: "generated" | "approved" | "rejected";
  duration?: number;
}

const VIDEOS_LOG_FILE = path.join(process.cwd(), "generated-videos.json");

export async function logGeneratedVideo(video: GeneratedVideo): Promise<void> {
  try {
    let videos: GeneratedVideo[] = [];

    // Try to read existing file
    try {
      const content = await fs.readFile(VIDEOS_LOG_FILE, "utf-8");
      videos = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      videos = [];
    }

    // Add new video
    videos.push(video);

    // Write back to file
    await fs.writeFile(VIDEOS_LOG_FILE, JSON.stringify(videos, null, 2));

    console.log(`Logged video ${video.id} to ${VIDEOS_LOG_FILE}`);
  } catch (error) {
    console.error("Failed to log generated video:", error);
    throw new Error("Failed to save video log");
  }
}

export async function updateVideoStatus(
  videoId: string,
  status: "approved" | "rejected",
): Promise<void> {
  try {
    let videos: GeneratedVideo[] = [];

    // Read existing file
    try {
      const content = await fs.readFile(VIDEOS_LOG_FILE, "utf-8");
      videos = JSON.parse(content);
    } catch (error) {
      throw new Error("No videos log file found");
    }

    // Find and update video
    const videoIndex = videos.findIndex((vid) => vid.id === videoId);
    if (videoIndex === -1) {
      throw new Error(`Video with ID ${videoId} not found`);
    }

    videos[videoIndex].status = status;

    // Write back to file
    await fs.writeFile(VIDEOS_LOG_FILE, JSON.stringify(videos, null, 2));

    console.log(`Updated video ${videoId} status to ${status}`);
  } catch (error) {
    console.error("Failed to update video status:", error);
    throw new Error("Failed to update video status");
  }
}

export async function getGeneratedVideos(): Promise<GeneratedVideo[]> {
  try {
    const content = await fs.readFile(VIDEOS_LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist, return empty array
    return [];
  }
}

export async function getApprovedVideos(): Promise<GeneratedVideo[]> {
  const allVideos = await getGeneratedVideos();
  return allVideos.filter((vid) => vid.status === "approved");
}
