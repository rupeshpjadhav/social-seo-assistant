import type { GroundingChunk, UsageMetadata } from '@google/genai';

export interface HistoryItem {
  text: string;
  timestamp: number;
  usage: UsageMetadata | null;
}

export interface YouTubeHistoryItem extends HistoryItem {
  sources: GroundingChunk[] | null;
}

export interface InstagramHistoryItem extends HistoryItem {}