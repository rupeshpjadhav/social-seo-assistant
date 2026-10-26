import React, { useState, useCallback } from 'react';
import { generateThumbnailImage, editThumbnailImage, generateVideoIdeas } from '../services/geminiService';
import Loader from './Loader';
import CopyIcon from './CopyIcon';

interface YouTubeAssistantProps {
  onGenerate: (data: { description: string; link: string; format: 'video' | 'shorts'; tone: string }) => void;
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

const YouTubeAssistant: React.FC<YouTubeAssistantProps> = ({ onGenerate, isLoading }) => {
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [format, setFormat] = useState<'video' | 'shorts'>('video');
  const [tone, setTone] = useState<string>('Viral Hook & High CTR');
  const [error, setError] = useState<string | null>(null);

  // State for Video Idea Generator
  const [showIdeaGenerator, setShowIdeaGenerator] = useState(false);
  const [niche, setNiche] = useState('');
  const [videoIdeas, setVideoIdeas] = useState<string | null>(null);
  const [isIdeasLoading, setIsIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [isIdeasCopied, setIsIdeasCopied] = useState(false);

  // State for Thumbnail Generator
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
  const [thumbnailPrompt, setThumbnailPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() && !link.trim()) {
      setError('Please enter a video description or a YouTube video link.');
      return;
    }
    setError(null);
    onGenerate({ description, link, format, tone });
  }, [description, link, format, tone, onGenerate]);
  
  const handleGenerateIdeas = useCallback(async () => {
    if (!niche.trim()) {
      setIdeasError('Please enter your niche or an area of interest.');
      return;
    }
    setIsIdeasLoading(true);
    setIdeasError(null);
    setVideoIdeas(null);
    try {
      const result = await generateVideoIdeas(niche);
      setVideoIdeas(result.text);
    } catch (e: any) {
      setIdeasError(e.message || 'An unknown error occurred while generating ideas.');
    } finally {
      setIsIdeasLoading(false);
    }
  }, [niche]);

  const handleCopyIdeas = useCallback(() => {
    if (!videoIdeas) return;
    navigator.clipboard.writeText(videoIdeas).then(() => {
      setIsIdeasCopied(true);
      setTimeout(() => setIsIdeasCopied(false), 2500);
    });
  }, [videoIdeas]);
  
  const handleGenerateThumbnail = useCallback(async () => {
    if (!thumbnailPrompt.trim()) {
      setThumbnailError('Please enter a description for the thumbnail.');
      return;
    }
    setIsThumbnailLoading(true);
    setThumbnailError(null);
    setGeneratedImage(null);
    try {
      const result = uploadedImage
        ? await editThumbnailImage(thumbnailPrompt, { data: uploadedImage.base64, mimeType: uploadedImage.mimeType })
        : await generateThumbnailImage(thumbnailPrompt);
      
      const imageBytes = 'imageData' in result ? result.imageData : result.imageBytes;
      setGeneratedImage(`data:image/png;base64,${imageBytes}`);
    } catch (e: any) {
      setThumbnailError(e.message || 'An unknown error occurred while generating the image.');
      setGeneratedImage(null);
    } finally {
      setIsThumbnailLoading(false);
    }
  }, [thumbnailPrompt, uploadedImage]);

  const handleDownloadImage = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'youtube-thumbnail.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsThumbnailLoading(true);
      setThumbnailError(null);
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setUploadedImage({ base64, mimeType });
      } catch {
        setThumbnailError("Failed to read the uploaded image file.");
      } finally {
        setIsThumbnailLoading(false);
      }
    }
  };
  
  return (
    <div className="flex flex-col gap-6">

      {/* Format & Tone Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-300">
            Content Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'video', label: '🎥 Standard Video', desc: 'Long-form (16:9)' },
              { id: 'shorts', label: '⚡ YouTube Shorts', desc: 'Vertical (<60s)' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  format === item.id
                    ? 'border-red-500 bg-red-500/10 text-red-300 shadow-sm'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-sm text-gray-200">{item.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="yt-tone" className="block text-sm font-semibold mb-2 text-gray-300">
            Strategy & Tone
          </label>
          <select
            id="yt-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          >
            <option value="Viral Hook & High CTR">🔥 Viral Hook & High CTR (Curiosity & broad appeal)</option>
            <option value="SEO & Search Authority (How-To)">🔍 Search Authority & How-To (High search volume)</option>
            <option value="Storytelling & High Retention">📖 Storytelling & High Retention (Emotional arc)</option>
            <option value="Contrarian & Debate-Driven">⚡ Bold / Contrarian (Provocative & discussion)</option>
            <option value="Product Review & Breakdown">📦 Deep-Dive / Product Review (Decision making)</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Tunes titles and description hook psychology.</p>
        </div>
      </div>

      <div>
        <label htmlFor="yt-description" className="block text-lg font-semibold mb-2 text-gray-300">
          Video Topic or Draft Script
        </label>
        <textarea
          id="yt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Step-by-step tutorial on building a profitable SaaS with Next.js in 48 hours without code bloat. Explain the tech stack, pricing model, and deployment."
          className="w-full h-32 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-300 text-gray-200 resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-4">
        <hr className="flex-grow border-gray-700" />
        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">OR Analyze Existing Video Link</span>
        <hr className="flex-grow border-gray-700" />
      </div>
      
      <div>
        <label htmlFor="yt-link" className="block text-sm font-semibold mb-2 text-gray-300">
          YouTube Video Link (Optional)
        </label>
        <input
          id="yt-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-300 text-gray-200 text-sm"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading || (!description.trim() && !link.trim())}
        className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:via-rose-500 hover:to-amber-500 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader />
            <span>Generating Viral YouTube SEO Pack...</span>
          </>
        ) : (
          <span>Generate YouTube {format === 'shorts' ? 'Shorts' : 'Video'} Content Pack</span>
        )}
      </button>

      {/* Video Idea Generator Accordion */}
      <div className="border-t border-gray-700/80 pt-6">
        <button
          onClick={() => setShowIdeaGenerator(!showIdeaGenerator)}
          className="w-full text-left text-base font-semibold text-gray-300 flex justify-between items-center hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>💡</span>
            <span>Video Idea & Topic Brainstormer</span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${showIdeaGenerator ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showIdeaGenerator && (
          <div className="mt-4 flex flex-col gap-4">
            <textarea
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., AI productivity tools, personal finance for Gen Z, sourdough baking, indie game development..."
              className="w-full h-24 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-300 text-gray-200 resize-none text-sm"
              disabled={isIdeasLoading}
            />
            <button
              onClick={handleGenerateIdeas}
              disabled={isIdeasLoading || !niche.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isIdeasLoading ? 'Brainstorming Viral Concepts...' : 'Generate 5-7 Video Ideas'}
            </button>
            {isIdeasLoading && (
              <div className="flex justify-center items-center p-4">
                <Loader />
              </div>
            )}
            {ideasError && <p className="text-red-400 text-sm">{ideasError}</p>}
            {videoIdeas && !isIdeasLoading && (
              <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-5">
                <button
                  onClick={handleCopyIdeas}
                  className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-1.5 px-3 rounded-md transition-all duration-200 flex items-center gap-1.5 text-xs border border-gray-700"
                >
                  <CopyIcon className="w-3.5 h-3.5" />
                  {isIdeasCopied ? 'Copied!' : 'Copy Ideas'}
                </button>
                <div className="whitespace-pre-wrap break-words font-sans text-gray-300 text-sm leading-relaxed pr-16">
                  {videoIdeas}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Generator Accordion */}
      <div className="border-t border-gray-700/80 pt-6">
        <button
          onClick={() => setShowThumbnailGenerator(!showThumbnailGenerator)}
          className="w-full text-left text-base font-semibold text-gray-300 flex justify-between items-center hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>🖼️</span>
            <span>Optional: Generate 16:9 YouTube Thumbnail</span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${showThumbnailGenerator ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showThumbnailGenerator && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg text-center">
              <input
                type="file"
                id="thumbnail-upload"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={isThumbnailLoading}
              />
              <label htmlFor="thumbnail-upload" className="cursor-pointer text-red-400 hover:text-red-300 font-semibold transition-colors">
                {uploadedImage ? 'Change reference image' : 'Upload a reference image (optional)'}
              </label>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP.</p>
            </div>

            {uploadedImage && (
              <div className="relative w-fit mx-auto">
                <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`} alt="Uploaded reference" className="rounded-lg w-32 h-auto border-2 border-gray-600" />
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
              value={thumbnailPrompt}
              onChange={(e) => setThumbnailPrompt(e.target.value)}
              placeholder={uploadedImage ? "e.g., Add bold yellow text 'I BUILT THIS' and a glowing green profit arrow." : "e.g., High-contrast YouTube thumbnail: A developer looking shocked at a laptop screen showing a viral analytics dashboard, dramatic lighting."}
              className="w-full h-24 p-4 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-300 text-gray-200 resize-none text-sm"
              disabled={isThumbnailLoading}
            />
            <button
              onClick={handleGenerateThumbnail}
              disabled={isThumbnailLoading || !thumbnailPrompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isThumbnailLoading ? 'Generating Thumbnail...' : uploadedImage ? 'Edit & Generate Thumbnail' : 'Generate 16:9 Thumbnail'}
            </button>
            {isThumbnailLoading && (
              <div className="flex justify-center items-center p-4">
                <Loader />
              </div>
            )}
            {thumbnailError && <p className="text-red-400 text-sm">{thumbnailError}</p>}
            {generatedImage && !isThumbnailLoading && (
              <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-xl border border-gray-700">
                <img src={generatedImage} alt="Generated YouTube Thumbnail" className="rounded-lg shadow-lg max-w-full md:max-w-md border border-gray-700" />
                <div className="flex gap-4">
                  <button
                    onClick={handleDownloadImage}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Download Thumbnail
                  </button>
                  <button
                    onClick={handleGenerateThumbnail}
                    disabled={isThumbnailLoading}
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

export default YouTubeAssistant;
