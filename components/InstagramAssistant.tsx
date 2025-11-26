import React, { useState, useCallback } from 'react';
import { generateReelCoverImage, editThumbnailImage } from '../services/geminiService';
import Loader from './Loader';


interface InstagramAssistantProps {
  onGenerate: (description: string) => void;
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
      setError('Please enter a reel description.');
      return;
    }
    setError(null);
    onGenerate(description);
  }, [description, onGenerate]);

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
      } catch (err) {
        setImageError("Failed to read the uploaded image file.");
      } finally {
        setIsImageLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="ig-description" className="block text-lg font-semibold mb-2 text-gray-300">
          Reel Description
        </label>
        <textarea
          id="ig-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Quick time-lapse of me painting a mountain landscape."
          className="w-full h-32 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200 resize-none"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isLoading || !description.trim()}
        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Generating...' : 'Generate Instagram Content'}
      </button>

      <div className="border-t border-gray-700 pt-6">
        <button
            onClick={() => setShowCoverGenerator(!showCoverGenerator)}
            className="w-full text-left text-lg font-semibold text-gray-300 flex justify-between items-center"
        >
            <span>Reel Cover Image</span>
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
            <div className="mt-4 flex flex-col gap-4 animate-fade-in">
                 <div className="p-4 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg text-center">
                    <input
                        type="file"
                        id="cover-upload"
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        disabled={isImageLoading}
                    />
                    <label htmlFor="cover-upload" className="cursor-pointer text-teal-400 hover:text-teal-300 font-semibold transition-colors">
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
                    value={coverPrompt}
                    onChange={(e) => setCoverPrompt(e.target.value)}
                    placeholder={uploadedImage ? "e.g., Add 'Mykonos Travel Diary' text in a stylish script font." : "e.g., A beautiful sunset over the ocean with vibrant colors."}
                    className="w-full h-24 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-300 text-gray-200 resize-none"
                    disabled={isImageLoading}
                />
                 <button
                    onClick={handleGenerateCoverImage}
                    disabled={isImageLoading || !coverPrompt.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isImageLoading ? 'Generating...' : uploadedImage ? 'Edit & Generate Cover' : 'Generate Cover Image'}
                </button>
                {isImageLoading && (
                    <div className="flex justify-center items-center p-4">
                        <Loader />
                    </div>
                )}
                {imageError && <p className="text-red-400 text-sm">{imageError}</p>}
                {generatedImage && !isImageLoading && (
                    <div className="flex flex-col items-center gap-4">
                        <img src={generatedImage} alt="Generated Reel Cover" className="rounded-lg shadow-lg max-w-full md:max-w-xs border-2 border-gray-600" />
                        <div className="flex gap-4">
                             <button
                                onClick={handleDownloadImage}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Download
                            </button>
                             <button
                                onClick={handleGenerateCoverImage}
                                disabled={isImageLoading}
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

export default InstagramAssistant;
