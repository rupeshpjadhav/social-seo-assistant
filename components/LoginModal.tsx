import React, { useEffect, useRef } from 'react';

// Add the 'google' object to the window interface for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

// IMPORTANT: Replace this placeholder with your actual Google Client ID
// You can get one from the Google Cloud Console: https://console.cloud.google.com/
const GOOGLE_CLIENT_ID = '196559013699-enk0hpjbcnkrbm94ffrha54svo4lt41e.apps.googleusercontent.com';

interface LoginModalProps {
  onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const googleSignInButtonRef = useRef<HTMLDivElement>(null);
  const isPlaceholderClientId = GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID');

  useEffect(() => {
    // Do not proceed if the client ID is a placeholder, the Google script hasn't loaded, or the button container is missing
    if (isPlaceholderClientId || !window.google || !googleSignInButtonRef.current) {
      return;
    }
    
    // Initialize the Google Identity Services client
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        // This callback is triggered upon successful sign-in.
        // A real application would send the response.credential (a JWT) to a backend for verification.
        // For this client-side app, we'll proceed directly to the logged-in state.
        console.log('Google Sign-In Successful. JWT:', response.credential);
        onLogin();
      },
    });

    // Render the Google Sign-In button in the designated div
    window.google.accounts.id.renderButton(
      googleSignInButtonRef.current,
      { 
        theme: 'filled_black', 
        size: 'large', 
        type: 'standard', 
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: '320' // Match the width of the modal content area
      }
    );
  }, [onLogin, isPlaceholderClientId]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-700 animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-teal-400 mb-2">Welcome!</h2>
        <p className="text-center text-gray-400 mb-8">Sign in to access your content assistant.</p>
        
        <div className="flex flex-col items-center gap-4 min-h-[50px]">
          {isPlaceholderClientId ? (
            <div className="text-center p-4 bg-yellow-900/50 border border-yellow-500 text-yellow-300 rounded-lg">
              <p className="font-semibold">Configuration Required</p>
              <p className="text-sm mt-1">
                To enable Google Sign-In, please replace the placeholder client ID in 
                <code className="bg-gray-700 text-white px-1 py-0.5 rounded mx-1">components/LoginModal.tsx</code> 
                with your own from the Google Cloud Console.
              </p>
            </div>
          ) : (
            // The Google Sign-In button will be rendered inside this div
            <div ref={googleSignInButtonRef} id="googleSignInButton"></div>
          )}
        </div>
         <p className="text-xs text-gray-500 text-center mt-6">
            Sign-in is handled securely by Google.
        </p>

      </div>
    </div>
  );
};

export default LoginModal;