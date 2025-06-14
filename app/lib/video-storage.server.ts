import { promises as fs } from 'fs';
import path from 'path';
import { VideoGenerationResult } from './video-generator';

const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'data')
  : process.cwd();

const VIDEOS_FILE = path.join(DATA_DIR, 'generated-videos.json');

export async function loadVideos(): Promise<VideoGenerationResult[]> {
  try {
    const data = await fs.readFile(VIDEOS_FILE, 'utf-8');
    const videos = JSON.parse(data);
    
    // Validate and clean up video data
    const validVideos = videos.filter((video: any) => 
      video && 
      video.id && 
      video.createdAt && 
      video.prompt
    );
    
    // Remove duplicates based on ID
    const uniqueVideos = validVideos.filter((video: any, index: number, self: any[]) => 
      index === self.findIndex((v: any) => v.id === video.id)
    );
    
    return uniqueVideos;
  } catch (error) {
    // If file doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Error loading videos:', error);
    return [];
  }
}

export async function saveVideo(video: VideoGenerationResult): Promise<void> {
  // Ensure data directory exists in production
  if (process.env.NODE_ENV === 'production') {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
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