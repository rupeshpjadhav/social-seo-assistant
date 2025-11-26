import React, { useState, useCallback } from 'react';
import YouTubeAssistant from './components/YouTubeAssistant';
import InstagramAssistant from './components/InstagramAssistant';
import HistoryPanel from './components/HistoryPanel';
import OutputDisplay from './components/OutputDisplay';
import { 
  generateYouTubeContent, 
  generateInstagramContentFromText 
} from './services/geminiService';
import type { YouTubeHistoryItem, InstagramHistoryItem, HistoryItem } from './types';

type Tab = 'youtube' | 'instagram';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('youtube');
  const [youtubeHistory, setYoutubeHistory] = useState<YouTubeHistoryItem[]>([]);
  const [instagramHistory, setInstagramHistory] = useState<InstagramHistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedItem, setDisplayedItem] = useState<{ type: Tab, item: HistoryItem } | null>(null);

  const handleGenerateYouTube = useCallback(async ({ description, link }: { description: string; link: string }) => {
    setIsLoading(true);
    setError(null);
    setDisplayedItem(null);
    try {
      const result = await generateYouTubeContent({ description, link });
      const newHistoryItem: YouTubeHistoryItem = {
        text: result.text,
        sources: result.sources,
        timestamp: Date.now(),
        usage: result.usage,
      };
      setYoutubeHistory(prev => [newHistoryItem, ...prev]);
      setDisplayedItem({ type: 'youtube', item: newHistoryItem });
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateInstagram = useCallback(async (description: string) => {
    setIsLoading(true);
    setError(null);
    setDisplayedItem(null);
    try {
      const result = await generateInstagramContentFromText(description);
      const newHistoryItem: InstagramHistoryItem = {
        text: result.text,
        timestamp: Date.now(),
        usage: result.usage,
      };
      setInstagramHistory(prev => [newHistoryItem, ...prev]);
      setDisplayedItem({ type: 'instagram', item: newHistoryItem });
    } catch (e: any)      {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectItem = useCallback((type: Tab, item: HistoryItem) => {
    setIsLoading(false);
    setError(null);
    setDisplayedItem({ type, item });
  }, []);

  const clearDisplay = useCallback(() => {
    setDisplayedItem(null);
  }, []);
  
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    clearDisplay();
    setError(null);
  }

  const handleClearHistory = (type: Tab) => {
    if (window.confirm('Are you sure you want to clear the entire history for this tab?')) {
      if (type === 'youtube') {
        setYoutubeHistory([]);
      } else {
        setInstagramHistory([]);
      }
      clearDisplay();
    }
  };

  const tabButtonClasses = (tabName: Tab) =>
    `px-6 py-3 text-lg font-semibold rounded-t-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 ${
      activeTab === tabName
        ? 'bg-gray-800 text-teal-400 border-b-2 border-teal-400'
        : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
    }`;

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
              Social Media Content Assistant
            </h1>
            <p className="text-center text-gray-400 mt-2">
              AI-powered content generation for YouTube and Instagram (Idea by Rupesh Jadhav)
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 flex flex-col gap-8">
        <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl">
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-4">
              <button onClick={() => handleTabChange('youtube')} className={tabButtonClasses('youtube')}>
                YouTube Assistant
              </button>
              <button onClick={() => handleTabChange('instagram')} className={tabButtonClasses('instagram')}>
                Instagram Assistant
              </button>
            </nav>
          </div>

          {activeTab === 'youtube' && (
            <YouTubeAssistant onGenerate={handleGenerateYouTube} isLoading={isLoading} />
          )}
          {activeTab === 'instagram' && (
            <InstagramAssistant onGenerate={handleGenerateInstagram} isLoading={isLoading} />
          )}
        </div>
        
        {(displayedItem || isLoading || error) && (
          <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Generated Content</h2>
            <OutputDisplay
              text={displayedItem?.item.text || ''}
              sources={displayedItem?.type === 'youtube' ? (displayedItem.item as YouTubeHistoryItem).sources : null}
              loading={isLoading}
              error={error}
            />
          </div>
        )}

        <HistoryPanel
          youtubeHistory={youtubeHistory}
          instagramHistory={instagramHistory}
          activeTab={activeTab}
          onSelectItem={handleSelectItem}
          onClearHistory={handleClearHistory}
        />
      </main>
    </div>
  );
};

export default App;
