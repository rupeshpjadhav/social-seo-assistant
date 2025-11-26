import React, { useState, useCallback } from 'react';
import { generateThumbnailImage, editThumbnailImage, generateVideoIdeas } from '../services/geminiService';
import Loader from './Loader';
import CopyIcon from './CopyIcon';

interface YouTubeAssistantProps {
  onGenerate: (data: { description: string; link: string }) => void;
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
      setError('Please enter a video description or a YouTube link.');
      return;
    }
    setError(null);
    onGenerate({ description, link });
  }, [description, link, onGenerate]);
  
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
      // Not tracking token usage here as it's a sub-feature.
      // The main app can be updated to track this if needed.
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
      } catch (err) {
        setThumbnailError("Failed to read the uploaded image file.");
      } finally {
        setIsThumbnailLoading(false);
      }
    }
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="yt-description" className="block text-lg font-semibold mb-2 text-gray-300">
          Video Description
        </label>
        <textarea
          id="yt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., A tutorial on how to bake a sourdough bread from scratch for beginners."
          className="w-full h-32 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200 resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-4">
        <hr className="flex-grow border-gray-600" />
        <span className="text-gray-400 font-semibold">OR</span>
        <hr className="flex-grow border-gray-600" />
      </div>
      
      <div>
        <label htmlFor="yt-link" className="block text-lg font-semibold mb-2 text-gray-300">
          YouTube Video Link
        </label>
        <input
          id="yt-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading || (!description.trim() && !link.trim())}
        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Generating...' : 'Generate YouTube Content'}
      </button>

      <div className="border-t border-gray-700 pt-6">
        <button
            onClick={() => setShowIdeaGenerator(!showIdeaGenerator)}
            className="w-full text-left text-lg font-semibold text-gray-300 flex justify-between items-center"
        >
            <span>Video Idea Generator</span>
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
            <div className="mt-4 flex flex-col gap-4 animate-fade-in">
                 <textarea
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g., minimalist home decor, retro gaming, vegan cooking..."
                    className="w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200 resize-none"
                    disabled={isIdeasLoading}
                />
                 <button
                    onClick={handleGenerateIdeas}
                    disabled={isIdeasLoading || !niche.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isIdeasLoading ? 'Generating...' : 'Generate Video Ideas'}
                </button>
                {isIdeasLoading && (
                    <div className="flex justify-center items-center p-4">
                        <Loader />
                    </div>
                )}
                {ideasError && <p className="text-red-400 text-sm">{ideasError}</p>}
                {videoIdeas && !isIdeasLoading && (
                    <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <button
                          onClick={handleCopyIdeas}
                          className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-3 rounded-md transition-all duration-200 flex items-center gap-2 text-sm"
                        >
                          <CopyIcon className="w-4 h-4" />
                          {isIdeasCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="whitespace-pre-wrap break-words font-sans text-gray-300 text-sm leading-relaxed">
                            {videoIdeas}
                        </pre>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-6">
        <button
            onClick={() => setShowThumbnailGenerator(!showThumbnailGenerator)}
            className="w-full text-left text-lg font-semibold text-gray-300 flex justify-between items-center"
        >
            <span>Create Thumbnail</span>
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
            <div className="mt-4 flex flex-col gap-4 animate-fade-in">
                 <div className="p-4 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg text-center">
                    <input
                        type="file"
                        id="thumbnail-upload"
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        disabled={isThumbnailLoading}
                    />
                    <label htmlFor="thumbnail-upload" className="cursor-pointer text-teal-400 hover:text-teal-300 font-semibold transition-colors">
                        {uploadedImage ? 'Change reference image' : 'Upload a reference image'}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Optional. PNG, JPG, WEBP.</p>
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
                    placeholder={uploadedImage ? "e.g., Add the text 'Easy Sourdough' in a bold, clean font at the bottom." : "e.g., A minimalist design with a loaf of golden-brown sourdough bread on a dark background."}
                    className="w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200 resize-none"
                    disabled={isThumbnailLoading}
                />
                 <button
                    onClick={handleGenerateThumbnail}
                    disabled={isThumbnailLoading || !thumbnailPrompt.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isThumbnailLoading ? 'Generating...' : uploadedImage ? 'Edit & Generate Thumbnail' : 'Generate Thumbnail'}
                </button>
                {isThumbnailLoading && (
                    <div className="flex justify-center items-center p-4">
                        <Loader />
                    </div>
                )}
                {thumbnailError && <p className="text-red-400 text-sm">{thumbnailError}</p>}
                {generatedImage && !isThumbnailLoading && (
                    <div className="flex flex-col items-center gap-4">
                        <img src={generatedImage} alt="Generated YouTube Thumbnail" className="rounded-lg shadow-lg max-w-full md:max-w-md border-2 border-gray-600" />
                        <div className="flex gap-4">
                             <button
                                onClick={handleDownloadImage}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Download
                            </button>
                             <button
                                onClick={handleGenerateThumbnail}
                                disabled={isThumbnailLoading}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Recreate
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
