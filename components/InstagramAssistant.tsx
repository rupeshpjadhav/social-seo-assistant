import React, { useState, useCallback } from 'react';
import { generateReelCoverImage, editThumbnailImage } from '../services/geminiService';
import Loader from './Loader';

interface InstagramAssistantProps {
  onGenerate: (params: { description: string; format: 'reel' | 'post' | 'carousel'; tone: string }) => void;
  isLoading: boolean;
}

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64Data] = result.split(',');
      const mimeType = file.type;
      resolve({ base64: base64Data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

const InstagramAssistant: React.FC<InstagramAssistantProps> = ({ onGenerate, isLoading }) => {
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<'reel' | 'post' | 'carousel'>('reel');
  const [tone, setTone] = useState<string>('Viral & Scroll-Stopping');
  const [error, setError] = useState<string | null>(null);
  
  // State for Cover Image Generator
  const [showCoverGenerator, setShowCoverGenerator] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setError('Please enter a description or topic for your Instagram content.');
      return;
    }
    setError(null);
    onGenerate({ description, format, tone });
  }, [description, format, tone, onGenerate]);

  const handleGenerateCoverImage = useCallback(async () => {
    if (!coverPrompt.trim()) {
      setImageError('Please enter a description for the cover image.');
      return;
    }
    setIsImageLoading(true);
    setImageError(null);
    setGeneratedImage(null);
    try {
      const result = uploadedImage
        ? await editThumbnailImage(coverPrompt, { data: uploadedImage.base64, mimeType: uploadedImage.mimeType })
        : await generateReelCoverImage(coverPrompt);
      
      const imageBytes = 'imageData' in result ? result.imageData : result.imageBytes;
      setGeneratedImage(`data:image/png;base64,${imageBytes}`);
    } catch (e: any) {
      setImageError(e.message || 'An unknown error occurred while generating the image.');
      setGeneratedImage(null);
    } finally {
      setIsImageLoading(false);
    }
  }, [coverPrompt, uploadedImage]);

  const handleDownloadImage = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'instagram-reel-cover.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsImageLoading(true);
      setImageError(null);
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setUploadedImage({ base64, mimeType });
      } catch {
        setImageError("Failed to read the uploaded image file.");
      } finally {
        setIsImageLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Format & Tone Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-300">
            Instagram Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'reel', label: '🎬 Reel', desc: 'Short vertical video' },
              { id: 'carousel', label: '📑 Carousel', desc: 'Multi-slide value' },
              { id: 'post', label: '🖼️ Single Post', desc: 'Photo / Visual' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id as any)}
                className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                  format === item.id
                    ? 'border-pink-500 bg-pink-500/10 text-pink-300 shadow-sm'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-gray-200">{item.label}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ig-tone" className="block text-sm font-semibold mb-2 text-gray-300">
            Caption Vibe / Strategy
          </label>
          <select
            id="ig-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
          >
            <option value="Viral & Scroll-Stopping">🔥 Viral & Scroll-Stopping (High curiosity hook)</option>
            <option value="High Saves & Educational Guide">💾 High Saves & Educational (Step-by-step value)</option>
            <option value="Relatable Storytelling & Emotional">💭 Relatable Storytelling (Personal & authentic)</option>
            <option value="Humorous & Punchy">😂 Humorous & Punchy (Meme-style / relatable)</option>
            <option value="Direct Call to Action & Sales">🎯 High Conversion & CTA (Product / Service focus)</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Adjusts the emotional tone and call-to-action trigger.</p>
        </div>
      </div>

      <div>
        <label htmlFor="ig-description" className="block text-lg font-semibold mb-2 text-gray-300">
          Reel / Post Content Description
        </label>
        <textarea
          id="ig-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., 3 productivity habits that saved me 10 hours a week as a remote developer. Showcase the morning routine and time-blocking tool."
          className="w-full h-32 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-300 text-gray-200 resize-none"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading || !description.trim()}
        className="w-full bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader />
            <span>Engineering Viral Instagram Caption...</span>
          </>
        ) : (
          <span>Generate Instagram Caption & 5 SEO Hashtags</span>
        )}
      </button>

      {/* Reel Cover Generator */}
      <div className="border-t border-gray-700/80 pt-6">
        <button
          onClick={() => setShowCoverGenerator(!showCoverGenerator)}
          className="w-full text-left text-base font-semibold text-gray-300 flex justify-between items-center hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>🎨</span>
            <span>Optional: Generate 9:16 Reel Cover Image</span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${showCoverGenerator ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCoverGenerator && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg text-center">
              <input
                type="file"
                id="cover-upload"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={isImageLoading}
              />
              <label htmlFor="cover-upload" className="cursor-pointer text-pink-400 hover:text-pink-300 font-semibold transition-colors">
                {uploadedImage ? 'Change reference image' : 'Upload a reference image (optional)'}
              </label>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP.</p>
            </div>

            {uploadedImage && (
              <div className="relative w-fit mx-auto">
                <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`} alt="Uploaded reference" className="rounded-lg w-28 h-auto border-2 border-gray-600" />
                <button 
                  onClick={() => setUploadedImage(null)} 
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none hover:bg-red-700 transition-colors"
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <textarea
              value={coverPrompt}
              onChange={(e) => setCoverPrompt(e.target.value)}
              placeholder={uploadedImage ? "e.g., Add '3 Habits for Focus' in bold aesthetic typography with a gradient overlay." : "e.g., A stylish creator working at an ultra-clean desk with warm neon ambient lighting, vertical 9:16 layout."}
              className="w-full h-24 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-300 text-gray-200 resize-none text-sm"
              disabled={isImageLoading}
            />
            <button
              onClick={handleGenerateCoverImage}
              disabled={isImageLoading || !coverPrompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isImageLoading ? 'Generating Cover...' : uploadedImage ? 'Edit & Generate Cover' : 'Generate 9:16 Reel Cover'}
            </button>
            {isImageLoading && (
              <div className="flex justify-center items-center p-4">
                <Loader />
              </div>
            )}
            {imageError && <p className="text-red-400 text-sm">{imageError}</p>}
            {generatedImage && !isImageLoading && (
              <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-700">
                <img src={generatedImage} alt="Generated Reel Cover" className="rounded-lg shadow-lg max-w-full md:max-w-xs border border-gray-700" />
                <div className="flex gap-4">
                  <button
                    onClick={handleDownloadImage}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Download Cover
                  </button>
                  <button
                    onClick={handleGenerateCoverImage}
                    disabled={isImageLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramAssistant;
