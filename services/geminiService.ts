import { GroundingChunk, UsageMetadata, YouTubeContentResult, InstagramContentResult } from "../types";

export type { GroundingChunk, UsageMetadata, YouTubeContentResult, InstagramContentResult };

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

async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  if (data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return `${fallback} (HTTP ${response.status})`;
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
    throw new Error(await parseErrorResponse(response, "Failed to generate YouTube content from backend."));
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
    throw new Error(await parseErrorResponse(response, "Failed to generate Instagram content."));
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
    throw new Error(await parseErrorResponse(response, "Failed to generate video ideas."));
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
    throw new Error(await parseErrorResponse(response, "Failed to generate thumbnail."));
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
    throw new Error(await parseErrorResponse(response, "Failed to generate Reel cover."));
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
    throw new Error(await parseErrorResponse(response, "Failed to edit thumbnail image."));
  }

  return response.json();
};
