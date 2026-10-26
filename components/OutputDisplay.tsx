import React, { useState, useMemo } from 'react';
import Loader from './Loader';
import CopyIcon from './CopyIcon';
import type { GroundingChunk } from '@google/genai';

interface OutputDisplayProps {
  text: string;
  loading: boolean;
  error: string | null;
  sources?: GroundingChunk[] | null;
  platform?: 'youtube' | 'instagram';
  onRetry?: () => void;
}

interface ParsedSection {
  title: string;
  content: string;
  isStrategy: boolean;
  isHashtags: boolean;
  isTags: boolean;
  isCaption: boolean;
  isTitles: boolean;
}

// Clean unwanted instructional labels starting with 1, 2, 3, 4 from video description
function cleanDescriptionText(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove conversational intros
    .replace(/^(?:Here (?:is|are) (?:your|the|an|some)|Here's (?:your|the|an|some)|Sure[!,.]?|Certainly[!,.]?)[^\n]*\n+/i, '')
    // Remove lines like "1. Above The Fold (First 2-3 lines...):", "1. **Above The Fold**:", "2. Detailed Video Breakdown:", etc.
    .replace(/^[ \t]*[1-4]\.\s*\*{0,2}(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Timestamps(?: \/ Chapters)?(?: Outline)?|Call [Tt]o Action(?:\s*\(CTA\))?|CTA)[^*:\n]*\*{0,2}:?[ \t]*/gim, '')
    // Remove numbers 1-4 preceding bold meta headers in description
    .replace(/^[ \t]*[1-4]\.\s*\*\*(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Timestamps|Chapters|Call [Tt]o Action|CTA)[^*]*\*\*:?[ \t]*/gim, '')
    // Remove standalone bold meta labels like "**Above The Fold:**", "**Detailed Breakdown:**"
    .replace(/^[ \t]*\*{1,2}(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Call [Tt]o Action(?:\s*\(CTA\))?)\*{1,2}:?[ \t]*\n?/gim, '')
    .trim();
}

// Identify strategy / production advice sections that must NOT be part of raw post copy
function isStrategySection(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('retention') ||
    t.includes('strategy') ||
    t.includes('hook & strategy') ||
    t.includes('audio') ||
    t.includes('pinned comment') ||
    t.includes('keywords') ||
    t.includes('hook options')
  );
}

// Strip conversational lines ("Here is your...") and markdown headings
function cleanRawContentBlock(raw: string): string {
  if (!raw) return '';
  const lines = raw.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    // Exclude conversational openings
    if (/^(?:Here (?:is|are) (?:your|the|an|some)|Here's (?:your|the|an|some)|Sure[!,.]?|Certainly[!,.]?)/i.test(trimmed)) {
      return false;
    }
    // Exclude markdown headings like ### **...** or ## ...
    if (/^#{1,6}\s+/.test(trimmed)) {
      return false;
    }
    return true;
  });

  return cleanDescriptionText(filtered.join('\n')).trim();
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ text, loading, error, sources, platform, onRetry }) => {
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isCopiedStrategy, setIsCopiedStrategy] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'raw'>('cards');

  // Parse markdown sections into structured chunks
  const parsedSections = useMemo((): ParsedSection[] => {
    if (!text) return [];

    const lines = text.split('\n');
    const sections: ParsedSection[] = [];
    let currentTitle = 'Overview';
    let currentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(?:###\s+)?\*{0,2}([\w\s&–—()/-]+?)\*{0,2}:?\s*$/);
      const isExplicitHeading = line.startsWith('###') || (line.startsWith('**') && line.endsWith('**') && line.length < 60);

      if (isExplicitHeading && headingMatch) {
        if (currentLines.length > 0) {
          const isCaption = currentTitle.toLowerCase().includes('caption') || currentTitle.toLowerCase().includes('description');
          const isTitles = currentTitle.toLowerCase().includes('title');
          const isHashtags = currentTitle.toLowerCase().includes('hashtag');
          const isTags = currentTitle.toLowerCase().includes('tag') || currentTitle.toLowerCase().includes('keyword');
          const isStrategy = isStrategySection(currentTitle);
          const rawContent = currentLines.join('\n').trim();

          sections.push({
            title: currentTitle,
            content: isCaption ? cleanDescriptionText(rawContent) : cleanRawContentBlock(rawContent),
            isStrategy,
            isHashtags,
            isTags,
            isCaption,
            isTitles,
          });
          currentLines = [];
        }
        currentTitle = headingMatch[1].replace(/[*#]/g, '').trim();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const isCaption = currentTitle.toLowerCase().includes('caption') || currentTitle.toLowerCase().includes('description');
      const isTitles = currentTitle.toLowerCase().includes('title');
      const isHashtags = currentTitle.toLowerCase().includes('hashtag');
      const isTags = currentTitle.toLowerCase().includes('tag') || currentTitle.toLowerCase().includes('keyword');
      const isStrategy = isStrategySection(currentTitle);
      const rawContent = currentLines.join('\n').trim();

      sections.push({
        title: currentTitle,
        content: isCaption ? cleanDescriptionText(rawContent) : cleanRawContentBlock(rawContent),
        isStrategy,
        isHashtags,
        isTags,
        isCaption,
        isTitles,
      });
    }

    return sections;
  }, [text]);

  // Separate content sections (actual post items) from strategy sections (creator playbook)
  const { contentSections, strategySections } = useMemo(() => {
    const content: ParsedSection[] = [];
    const strategy: ParsedSection[] = [];

    for (const section of parsedSections) {
      if (section.isStrategy) {
        strategy.push(section);
      } else {
        content.push(section);
      }
    }

    return { contentSections: content, strategySections: strategy };
  }, [parsedSections]);

  // Build the clean RAW text for display and for Copy Full Pack
  // NO "Here is your...", NO headings, NO strategy notes
  const cleanRawText = useMemo((): string => {
    if (!text) return '';

    // If sections were detected, join ONLY the content sections (Titles, Description/Caption, Hashtags, Tags)
    if (contentSections.length > 0) {
      return contentSections
        .map(sec => cleanRawContentBlock(sec.content))
        .filter(c => c.length > 0)
        .join('\n\n');
    }

    // Fallback if no markdown sections matched: clean conversational openings and headings
    return cleanRawContentBlock(text);
  }, [text, contentSections]);

  // Build strategy text for independent copying
  const strategyText = useMemo((): string => {
    if (strategySections.length === 0) return '';
    return strategySections
      .map(sec => `[${sec.title}]\n${sec.content}`)
      .join('\n\n');
  }, [strategySections]);

  const handleCopyAll = () => {
    if (!cleanRawText) return;
    navigator.clipboard.writeText(cleanRawText).then(() => {
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 2500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleCopySection = (content: string, index: number, isCaption?: boolean) => {
    const textToCopy = isCaption ? cleanDescriptionText(content) : cleanRawContentBlock(content);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedSectionIndex(index);
      setTimeout(() => setCopiedSectionIndex(null), 2500);
    });
  };

  const handleCopyStrategy = () => {
    if (!strategyText) return;
    navigator.clipboard.writeText(strategyText).then(() => {
      setIsCopiedStrategy(true);
      setTimeout(() => setIsCopiedStrategy(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-900 rounded-2xl border border-gray-700/80">
        <Loader />
        <p className="mt-4 text-base font-medium text-gray-300">
          Crafting algorithm-optimized {platform === 'instagram' ? 'Instagram' : 'YouTube'} content...
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {platform === 'instagram' 
            ? 'Applying 5-hashtag rule, hook psychology & Instagram Explore search keywords' 
            : 'Generating clean copy-paste description, CTR titles, chapter timestamps & Studio tags'}
        </p>
      </div>
    );
  }

  if (error) {
    let cleanMessage = error;
    try {
      const parsed = JSON.parse(error);
      if (parsed?.error?.message) {
        cleanMessage = parsed.error.message;
      }
    } catch {}

    const isHighDemand = cleanMessage.includes('503') || cleanMessage.toLowerCase().includes('high demand') || cleanMessage.includes('UNAVAILABLE');

    return (
      <div className="p-6 bg-red-950/60 border border-red-500/50 text-red-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-red-300 text-base">
            <span>{isHighDemand ? '⏳' : '⚠️'}</span>
            <span>{isHighDemand ? 'AI Model Temporarily Busy' : 'Generation Error'}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-colors shadow flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Try Again</span>
            </button>
          )}
        </div>
        <p className="text-sm text-red-200/90 leading-relaxed">
          {isHighDemand 
            ? "The AI service is experiencing a temporary spike in traffic. Our system automatically switches to fallback models, so clicking 'Try Again' will usually succeed immediately."
            : cleanMessage}
        </p>
        {onRetry && (
          <div className="pt-2">
            <button
              onClick={onRetry}
              className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Re-run Generation</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!text) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/90 border border-gray-700/80 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
            platform === 'instagram'
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}>
            {platform === 'instagram' ? 'Instagram Viral Pack' : 'YouTube SEO Pack'}
          </span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            ⚡ Clean Copy Ready (Headings & Chat Intros Excluded)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-gray-800 p-1 rounded-lg border border-gray-700 flex text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Formatted Cards
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'raw' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Raw Text (Clean)
            </button>
          </div>

          <button
            onClick={handleCopyAll}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-1.5 px-3.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs shadow-sm active:scale-95"
            title="Copies all clean content without headings, chatter, or strategy notes"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            {isCopiedAll ? 'Copied Full Pack!' : 'Copy Full Pack (Clean)'}
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="space-y-6">
          {/* Main Content Sections (Titles, Description/Caption, Hashtags, Tags) */}
          <div className="space-y-4">
            {contentSections.map((section, idx) => (
              <div 
                key={idx}
                className={`bg-gray-900 border rounded-xl p-5 transition-all ${
                  section.isHashtags
                    ? 'border-pink-500/40 bg-gradient-to-br from-gray-900 via-pink-950/10 to-gray-900'
                    : section.isCaption
                    ? 'border-teal-500/40 bg-gradient-to-br from-gray-900 via-teal-950/10 to-gray-900'
                    : 'border-gray-700/80'
                }`}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-200 tracking-tight">
                      {section.title}
                    </h3>
                    {section.isCaption && (
                      <span className="text-[11px] bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-500/30">
                        Copy-Paste Ready
                      </span>
                    )}
                    {section.isHashtags && (
                      <span className="text-[11px] bg-pink-500/20 text-pink-300 font-semibold px-2 py-0.5 rounded-full border border-pink-500/30">
                        Strict 5 Tags
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopySection(section.content, idx, section.isCaption)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-1 px-2.5 rounded-md transition-colors flex items-center gap-1.5 text-xs border border-gray-700 hover:border-gray-600"
                  >
                    <CopyIcon className="w-3 h-3" />
                    {copiedSectionIndex === idx ? 'Copied!' : `Copy ${section.title.split(' ')[0]}`}
                  </button>
                </div>

                {section.isHashtags ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {section.content
                        .split(/\s+/)
                        .filter(tag => tag.startsWith('#'))
                        .map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="bg-pink-500/15 border border-pink-500/40 text-pink-300 font-mono text-sm px-3 py-1 rounded-lg select-all"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-mono whitespace-pre-wrap">
                      {section.content}
                    </p>
                  </div>
                ) : section.isTags ? (
                  <div className="bg-gray-950/70 p-3.5 rounded-lg border border-gray-800 font-mono text-xs text-gray-300 leading-relaxed break-words">
                    {section.content}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words font-sans text-gray-200 text-sm leading-relaxed space-y-2">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Separate Format Card for Creator Playbook / Viral Retention Strategy */}
          {strategySections.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-gray-900 border-2 border-indigo-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-indigo-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-base">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-indigo-200">
                      Viral Retention & Creator Playbook
                    </h3>
                    <p className="text-xs text-indigo-300/70">
                      Filming notes, hook scripts & retention strategies (Excluded from raw post copy)
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopyStrategy}
                  className="bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-sm border border-indigo-400/30"
                >
                  <CopyIcon className="w-3 h-3" />
                  {isCopiedStrategy ? 'Copied Strategy!' : 'Copy Strategy Guide'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategySections.map((sec, sIdx) => (
                  <div 
                    key={sIdx} 
                    className="bg-gray-950/60 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>{sec.title}</span>
                      </h4>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {sec.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Raw Text View (Guaranteed 100% clean of headings, chat intros, and strategy notes) */
        <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800 text-xs text-gray-400">
            <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <span>✓</span> Raw Clean Output Ready for Direct Copy-Paste
            </span>
            <span className="text-[11px] text-gray-500">
              No headings • No chat intros • No strategy clutter
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-gray-200 text-sm leading-relaxed selection:bg-teal-500 selection:text-black">
            {cleanRawText}
          </pre>
        </div>
      )}

      {/* Sources from Google Search Grounding if available */}
      {sources && sources.length > 0 && (
        <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Referenced Search Grounding Sources:
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {sources.map((source, index) => (
              source.web?.uri && (
                <li key={index} className="text-xs">
                  <a
                    href={source.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                    title={source.web.title || ''}
                  >
                    {source.web.title || source.web.uri}
                  </a>
                </li>
              )
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OutputDisplay;