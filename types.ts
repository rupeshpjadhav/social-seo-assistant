import type { GroundingChunk, UsageMetadata } from '@google/genai';

export interface YouTubeContentResult {
  text: string;
  sources: GroundingChunk[] | null;
  usage: UsageMetadata | null;
}

export interface InstagramContentResult {
  text: string;
  usage: UsageMetadata | null;
}