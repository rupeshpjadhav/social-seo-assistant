import React, { useState, useCallback, useRef } from 'react';
import YouTubeAssistant from './components/YouTubeAssistant';
import InstagramAssistant from './components/InstagramAssistant';
import OutputDisplay from './components/OutputDisplay';
import { 
  generateYouTubeContent, 
  generateInstagramContentFromText 
} from './services/geminiService';
import type { YouTubeContentResult, InstagramContentResult } from './types';

type Tab = 'youtube' | 'instagram';

interface CurrentResult {
  type: Tab;
  text: string;
  sources?: any[] | null;
}

type LastRequest = 
  | { type: 'youtube'; params: { description: string; link: string; format: 'video' | 'shorts'; tone: string } }
  | { type: 'instagram'; params: { description: string; format: 'reel' | 'post' | 'carousel'; tone: string } };

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('youtube');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<CurrentResult | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);

  const handleGenerateYouTube = useCallback(async (params: { description: string; link: string; format: 'video' | 'shorts'; tone: string }) => {
    lastRequestRef.current = { type: 'youtube', params };
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);
    try {
      const result: YouTubeContentResult = await generateYouTubeContent(params);
      setCurrentResult({
        type: 'youtube',
        text: result.text,
        sources: result.sources,
      });
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred while generating YouTube content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateInstagram = useCallback(async (params: { description: string; format: 'reel' | 'post' | 'carousel'; tone: string }) => {
    lastRequestRef.current = { type: 'instagram', params };
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);
    try {
      const result: InstagramContentResult = await generateInstagramContentFromText(params);
      setCurrentResult({
        type: 'instagram',
        text: result.text,
        sources: null,
      });
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred while generating Instagram content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (!lastRequestRef.current) return;
    if (lastRequestRef.current.type === 'youtube') {
      handleGenerateYouTube(lastRequestRef.current.params);
    } else {
      handleGenerateInstagram(lastRequestRef.current.params);
    }
  }, [handleGenerateYouTube, handleGenerateInstagram]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="bg-gray-950 min-h-screen text-white font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Banner & Header */}
      <header className="bg-gray-900 border-b border-gray-800 shadow-xl">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/20 text-xl font-bold">
                ⚡
              </div>
              <div>
                <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                  Social SEO Assistant
                </h1>
                <p className="text-xs text-gray-400">
                  Platform-Native Viral Content, SEO Captions & Updated 5-Hashtag Algorithm
                </p>
              </div>
            </div>

            {/* Platform Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                YouTube SEO 2026
              </span>
              <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
                Instagram 5-Hashtags Rule
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl flex flex-col gap-8">
        {/* Main Creation Card */}
        <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-sm">
          {/* Platform Tab Navigation */}
          <div className="border-b border-gray-800 mb-6">
            <nav className="-mb-px flex space-x-2">
              <button
                onClick={() => handleTabChange('youtube')}
                className={`flex items-center gap-2 px-6 py-3.5 text-base font-bold rounded-t-xl transition-all duration-200 border-b-2 ${
                  activeTab === 'youtube'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>▶️</span>
                <span>YouTube Creator Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                  Videos & Shorts
                </span>
              </button>

              <button
                onClick={() => handleTabChange('instagram')}
                className={`flex items-center gap-2 px-6 py-3.5 text-base font-bold rounded-t-xl transition-all duration-200 border-b-2 ${
                  activeTab === 'instagram'
                    ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>📸</span>
                <span>Instagram Reels & Posts</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                  5-Hashtags SEO
                </span>
              </button>
            </nav>
          </div>

          {/* Form Content */}
          {activeTab === 'youtube' && (
            <YouTubeAssistant onGenerate={handleGenerateYouTube} isLoading={isLoading} />
          )}
          {activeTab === 'instagram' && (
            <InstagramAssistant onGenerate={handleGenerateInstagram} isLoading={isLoading} />
          )}
        </div>
        
        {/* Output Display Section */}
        {(currentResult || isLoading || error) && (
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                <span>🚀</span>
                <span>Platform Optimized Viral Content</span>
              </h2>
              {currentResult && (
                <button
                  onClick={() => setCurrentResult(null)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear Result
                </button>
              )}
            </div>
            <OutputDisplay
              text={currentResult?.text || ''}
              sources={currentResult?.sources}
              loading={isLoading}
              error={error}
              platform={currentResult?.type || activeTab}
              onRetry={lastRequestRef.current ? handleRetry : undefined}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-12 py-6 text-center text-xs text-gray-500">
        Social SEO Assistant • Engineered for YouTube & Instagram Viral Algorithms (Idea by Rupesh Jadhav)
      </footer>
    </div>
  );
};

export default App;
