import { promises as fs } from "fs";
import path from "path";

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  enhancedPrompt: string;
  createdAt: string;
  status: "generated" | "approved" | "rejected";
  revisedPrompt?: string;
}

const IMAGES_LOG_FILE = path.join(process.cwd(), "generated-images.json");

export async function logGeneratedImage(image: GeneratedImage): Promise<void> {
  try {
    let images: GeneratedImage[] = [];
    
    // Try to read existing file
    try {
      const content = await fs.readFile(IMAGES_LOG_FILE, "utf-8");
      images = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      images = [];
    }
    
    // Add new image
    images.push(image);
    
    // Write back to file
    await fs.writeFile(IMAGES_LOG_FILE, JSON.stringify(images, null, 2));
    
    console.log(`Logged image ${image.id} to ${IMAGES_LOG_FILE}`);
  } catch (error) {
    console.error("Failed to log generated image:", error);
    throw new Error("Failed to save image log");
  }
}

export async function updateImageStatus(imageId: string, status: "approved" | "rejected"): Promise<void> {
  try {
    let images: GeneratedImage[] = [];
    
    // Read existing file
    try {
      const content = await fs.readFile(IMAGES_LOG_FILE, "utf-8");
      images = JSON.parse(content);
    } catch (error) {
      throw new Error("No images log file found");
    }
    
    // Find and update image
    const imageIndex = images.findIndex(img => img.id === imageId);
    if (imageIndex === -1) {
      throw new Error(`Image with ID ${imageId} not found`);
    }
    
    images[imageIndex].status = status;
    
    // Write back to file
    await fs.writeFile(IMAGES_LOG_FILE, JSON.stringify(images, null, 2));
    
    console.log(`Updated image ${imageId} status to ${status}`);
  } catch (error) {
    console.error("Failed to update image status:", error);
    throw new Error("Failed to update image status");
  }
}

export async function getGeneratedImages(): Promise<GeneratedImage[]> {
  try {
    const content = await fs.readFile(IMAGES_LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist, return empty array
    return [];
  }
}

export async function getApprovedImages(): Promise<GeneratedImage[]> {
  const allImages = await getGeneratedImages();
  return allImages.filter(img => img.status === "approved");
}