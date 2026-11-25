export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface YouTubeContentResult {
  text: string;
  sources: GroundingChunk[] | null;
  usage: UsageMetadata | null;
}

export interface InstagramContentResult {
  text: string;
  usage: UsageMetadata | null;
}