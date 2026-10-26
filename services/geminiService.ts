import { GroundingChunk, UsageMetadata } from "@google/genai";
import { YouTubeContentResult, InstagramContentResult } from "../types";

export type { YouTubeContentResult, InstagramContentResult };

export interface YouTubeRequestParams {
  description?: string;
  link?: string;
  format?: 'video' | 'shorts';
  tone?: string;
}

export interface InstagramRequestParams {
  description: string;
  format?: 'reel' | 'post' | 'carousel';
  tone?: string;
}

export const generateYouTubeContent = async (params: YouTubeRequestParams): Promise<YouTubeContentResult> => {
  const response = await fetch("/api/youtube", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate YouTube content from backend.");
  }

  return response.json();
};

export const generateInstagramContentFromText = async (params: InstagramRequestParams | string): Promise<InstagramContentResult> => {
  const payload = typeof params === 'string' ? { description: params } : params;
  const response = await fetch("/api/instagram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate Instagram content.");
  }

  return response.json();
};

export const generateVideoIdeas = async (niche: string): Promise<InstagramContentResult> => {
  const response = await fetch("/api/ideas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ niche }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate video ideas.");
  }

  return response.json();
};

export const generateThumbnailImage = async (prompt: string): Promise<{ imageBytes: string, usage: UsageMetadata | null }> => {
  const response = await fetch("/api/thumbnail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate thumbnail.");
  }

  return response.json();
};

export const generateReelCoverImage = async (prompt: string): Promise<{ imageBytes: string, usage: UsageMetadata | null }> => {
  const response = await fetch("/api/reel-cover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate Reel cover.");
  }

  return response.json();
};

export const editThumbnailImage = async (prompt: string, image: { data: string, mimeType: string }): Promise<{ imageData: string, usage: UsageMetadata | null }> => {
  const response = await fetch("/api/edit-thumbnail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, image }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to edit thumbnail image.");
  }

  return response.json();
};
