import React, { useState } from 'react';
import type { YouTubeHistoryItem, InstagramHistoryItem, HistoryItem } from '../types';

type Tab = 'youtube' | 'instagram';

interface HistoryPanelProps {
  youtubeHistory: YouTubeHistoryItem[];
  instagramHistory: InstagramHistoryItem[];
  activeTab: Tab;
  onSelectItem: (type: Tab, item: HistoryItem) => void;
  onClearHistory: (type: Tab) => void;
}

const ChevronIcon: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);


const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  youtubeHistory, 
  instagramHistory, 
  activeTab, 
  onSelectItem,
  onClearHistory
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const history = activeTab === 'youtube' ? youtubeHistory : instagramHistory;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center text-left focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls="history-list"
      >
        <h2 className="text-2xl font-bold text-gray-200">Generation History</h2>
        <ChevronIcon isExpanded={isExpanded} />
      </button>

      {isExpanded && (
        <div id="history-list" className="mt-4 animate-fade-in">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => onClearHistory(activeTab)}
              disabled={history.length === 0}
              className="text-sm text-gray-400 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto border border-gray-700 max-h-96">
            {history.length === 0 ? (
              <div className="flex items-center justify-center h-full py-10">
                <p className="text-gray-500">No history yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {history.map((item, index) => (
                  <li key={item.timestamp + '-' + index}>
                    <button
                      onClick={() => onSelectItem(activeTab, item)}
                      className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors duration-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <p className="text-sm text-gray-300 truncate">
                        {item.text.split('\n')[0]}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
