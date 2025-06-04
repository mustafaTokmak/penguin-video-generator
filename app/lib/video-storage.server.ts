import { promises as fs } from 'fs';
import path from 'path';
import { VideoGenerationResult } from './video-generator';

const VIDEOS_FILE = path.join(process.cwd(), 'generated-videos.json');

export async function loadVideos(): Promise<VideoGenerationResult[]> {
  try {
    const data = await fs.readFile(VIDEOS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveVideo(video: VideoGenerationResult): Promise<void> {
  const videos = await loadVideos();
  videos.unshift(video); // Add new video at the beginning
  
  // Keep only the last 50 videos to prevent file from growing too large
  const trimmedVideos = videos.slice(0, 50);
  
  await fs.writeFile(VIDEOS_FILE, JSON.stringify(trimmedVideos, null, 2));
}

export async function deleteVideo(id: string): Promise<void> {
  const videos = await loadVideos();
  const filteredVideos = videos.filter(v => v.id !== id);
  await fs.writeFile(VIDEOS_FILE, JSON.stringify(filteredVideos, null, 2));
}