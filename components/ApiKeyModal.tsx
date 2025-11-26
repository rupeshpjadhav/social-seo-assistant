import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSubmit: (apiKey: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API Key cannot be empty.');
      return;
    }
    setError('');
    onSubmit(apiKey);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-gray-700 animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-3xl font-bold text-center text-teal-400 mb-2">Manage API Key</h2>
        <p className="text-center text-gray-400 mb-6">Your Google AI API key is stored locally in your browser and is required for all content generation.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="api-key" className="sr-only">Google AI API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google AI API Key"
              className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200"
            />
             {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            Save Key
          </button>
        </form>
         <p className="text-xs text-gray-500 text-center mt-6">
            You can generate a key from Google AI Studio.
        </p>

      </div>
    </div>
  );
};

export default ApiKeyModal;