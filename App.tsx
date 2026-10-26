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
    <div className="bg-gray-950 min-h-screen text-white font-sans selection:bg-teal-500 selection:text-black overflow-x-hidden">
      {/* Top Banner & Header */}
      <header className="bg-gray-900 border-b border-gray-800 shadow-xl">
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/20 text-lg sm:text-xl font-bold shrink-0">
                ⚡
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
                  Social SEO Assistant
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Idea by{' '}
                  <a
                    href="https://www.linkedin.com/in/rupeshj/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors font-medium"
                  >
                    Rupesh Jadhav
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl flex flex-col gap-6 sm:gap-8">
        {/* Main Creation Card */}
        <div className="bg-gray-900/95 border border-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          {/* Mobile-First Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-gray-950 rounded-xl border border-gray-800 mb-6 gap-1">
            <button
              onClick={() => handleTabChange('youtube')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-all ${
                activeTab === 'youtube'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>▶️</span>
              <span>YouTube</span>
              <span className="hidden sm:inline text-xs font-normal opacity-75">(Videos & Shorts)</span>
            </button>

            <button
              onClick={() => handleTabChange('instagram')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-all ${
                activeTab === 'instagram'
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>📸</span>
              <span>Instagram</span>
              <span className="hidden sm:inline text-xs font-normal opacity-75">(Reels & Posts)</span>
            </button>
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
          <div className="bg-gray-900/95 border border-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-200 flex items-center gap-2">
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
      <footer className="border-t border-gray-900 mt-8 sm:mt-12 py-6 text-center text-xs text-gray-500 px-4">
        Social SEO Assistant • Engineered for YouTube & Instagram Viral Algorithms (Idea by{' '}
        <a
          href="https://www.linkedin.com/in/rupeshj/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors font-medium"
        >
          Rupesh Jadhav
        </a>
        )
      </footer>
    </div>
  );
};

export default App;
