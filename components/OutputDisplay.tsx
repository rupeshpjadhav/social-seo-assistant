import React, { useState } from 'react';
import Loader from './Loader';
import CopyIcon from './CopyIcon';
import type { GroundingChunk } from '@google/genai';

interface OutputDisplayProps {
  text: string;
  loading: boolean;
  error: string | null;
  sources?: GroundingChunk[] | null;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ text, loading, error, sources }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  if (loading) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg border border-gray-700">
        <Loader />
        <p className="mt-4 text-gray-400">AI is thinking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">
        <p className="font-semibold">An Error Occurred</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!text) {
    return null;
  }

  return (
    <div className="mt-4 relative bg-gray-900 border border-gray-700 rounded-lg p-6">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-3 rounded-md transition-all duration-200 flex items-center gap-2 text-sm"
      >
        <CopyIcon className="w-4 h-4" />
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="whitespace-pre-wrap break-words font-mono text-gray-300 text-sm leading-relaxed">
        {text}
      </pre>
      {sources && sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Sources:</h3>
          <ul className="list-disc list-inside space-y-1">
            {sources.map((source, index) => (
              source.web?.uri && (
                <li key={index} className="text-sm">
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