import React, { useState, useEffect, useRef } from 'react';

interface ProfileProps {
  isApiKeySet: boolean;
  onSignOut: () => void;
  onAddApiKeyClick: () => void;
  sessionTokensUsed: number;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
}

const Profile: React.FC<ProfileProps> = ({ 
  isApiKeySet, 
  onSignOut, 
  onAddApiKeyClick, 
  sessionTokensUsed,
  dailyTokensUsed,
  dailyTokenLimit
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleAddApiKeyClick = () => {
    onAddApiKeyClick();
    setMenuOpen(false);
  }

  const handleSignOutClick = () => {
    onSignOut();
    setMenuOpen(false);
  }

  const tokensRemaining = Math.max(0, dailyTokenLimit - dailyTokensUsed);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-teal-400 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 flex flex-col p-2 gap-1">
          <div className="p-2 border-b border-gray-700 mb-1">
            <div className="flex justify-between items-baseline">
                <p className="text-xs text-gray-400">SESSION USAGE</p>
                <p className="text-base font-bold text-teal-400">{sessionTokensUsed.toLocaleString()} Tokens</p>
            </div>
             <div className="flex justify-between items-baseline mt-2">
                <p className="text-xs text-gray-400">REMAINING TODAY</p>
                <p className="text-base font-bold text-gray-300">{tokensRemaining.toLocaleString()} Tokens</p>
            </div>
          </div>
          <button
            onClick={handleAddApiKeyClick}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
          >
            {isApiKeySet ? 'Manage API Key' : 'Add API Key'}
          </button>
          <button
            onClick={handleSignOutClick}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-red-600/50 hover:text-white rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;