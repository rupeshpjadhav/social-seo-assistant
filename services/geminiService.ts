import { GoogleGenAI, GenerateContentResponse, GroundingChunk, Modality, UsageMetadata } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-4.0-generate-001";
const imageEditModel = "gemini-2.5-flash-image-preview";

export interface YouTubeContentResult {
  text: string;
  sources: GroundingChunk[] | null;
  usage: UsageMetadata | null;
}

export interface InstagramContentResult {
  text: string;
  usage: UsageMetadata | null;
}

const generateContentWithSearch = async (prompt: string, useSearch: boolean): Promise<YouTubeContentResult> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      ...(useSearch && { config: { tools: [{ googleSearch: {} }] } }),
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? null;
    
    return {
      text: response.text,
      sources,
      usage: response.usageMetadata ?? null,
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content from AI. The API key might be invalid or the service may be down. Please check the console for more details.");
  }
};

const generateSimpleContent = async (prompt: string): Promise<InstagramContentResult> => {
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
    });
    return {
        text: response.text,
        usage: response.usageMetadata ?? null,
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content from AI. The API key might be invalid or the service may be down. Please check the console for more details.");
  }
};


export const generateYouTubeContent = ({ description, link }: { description?: string; link?: string }): Promise<YouTubeContentResult> => {
  let promptContext = '';
  const useSearch = !!link;

  if (description && link) {
    promptContext = `A user has provided a link to their YouTube video: "${link}" and a short description: "${description}". Use information gathered by searching the link as the primary source, and the description for additional context.`;
  } else if (description) {
    promptContext = `A user has provided the following short description for their new video: "${description}".`;
  } else if (link) {
    promptContext = `A user has provided a link to their YouTube video: "${link}". Analyze the video's content by searching for information about this link to generate the required content.`;
  } else {
    return Promise.reject(new Error("Either a description or a link must be provided."));
  }
  
  const prompt = `
    You are an expert YouTube SEO and content strategist with deep knowledge of current trends. ${promptContext}
    
    Your task is to generate a complete, SEO-optimized content pack for this video that the user can copy and paste directly into YouTube.
    
    The output must be well-structured in a single block of text and include the following sections, clearly labeled with markdown bold headings:
    
    **Titles**: Provide 3-5 compelling and keyword-rich title options based on the video's content, optimized for high click-through rates.
    **Description**: Write an engaging, detailed description (2-3 paragraphs) that summarizes the video, incorporates top-ranking keywords naturally, and includes a strong call-to-action.
    **Keywords**: List 10-15 highly relevant, high-ranking keywords. Mix broad and long-tail keywords.
    **Hashtags**: List 5-10 relevant and trending hashtags that will maximize reach.
    **Tags**: Provide a comma-separated list of 20-30 top-performing and relevant tags for the YouTube tags section. Include a mix of specific and general tags.
  `;
  return generateContentWithSearch(prompt, useSearch);
};

export const generateInstagramContentFromText = (reelDescription: string): Promise<InstagramContentResult> => {
  const prompt = `
    You are a savvy Instagram marketing expert specializing in Reels, with a pulse on what's currently trending. A user is creating a Reel with this short description: "${reelDescription}".

    Generate a compelling and SEO-optimized post for them. The output should be a single block of text ready to be copy-pasted.
    
    It must include:
    1. An engaging caption that hooks the viewer (2-4 sentences) and integrates a top keyword naturally.
    2. A list of 5-7 relevant, high-ranking keywords, labeled with **Keywords:**.
    3. A set of 15-20 high-performing hashtags, including a mix of trending, niche, and broad-reach options, labeled with **Hashtags:**.
  `;
  return generateSimpleContent(prompt);
};

export const generateVideoIdeas = async (niche: string): Promise<InstagramContentResult> => {
  const prompt = `
    You are a creative strategist for top YouTube creators. A user wants video ideas for their channel, which is focused on "${niche}".
    
    Your task is to generate a list of 5-7 creative, engaging, and unique video ideas that have the potential to perform well.
    
    For each idea, provide:
    1. A catchy, SEO-friendly title.
    2. A brief, 1-2 sentence description of the video concept.
    
    Format the output clearly using markdown bold headings for each title. Ensure the entire response is a single block of text.
  `;
  return generateSimpleContent(prompt);
};

export const generateThumbnailImage = async (prompt: string): Promise<{imageBytes: string, usage: UsageMetadata | null}> => {
  try {
    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: `Create a visually stunning, high-contrast, and eye-catching YouTube thumbnail. The design should be modern, clean, and easily readable at small sizes. Main subject: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/png',
      },
    });

    const base64ImageBytes: string | undefined = response.generatedImages[0]?.image.imageBytes;

    if (!base64ImageBytes) {
      throw new Error("The API did not return an image.");
    }
    
    return { imageBytes: base64ImageBytes, usage: null };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate thumbnail. The service may be unavailable or the prompt may have been rejected. Please check the console for details.");
  }
};

export const generateReelCoverImage = async (prompt: string): Promise<{imageBytes: string, usage: UsageMetadata | null}> => {
  try {
    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: `Create a vibrant, eye-catching, and high-energy Instagram Reel cover image. The design should be trendy, bold, and optimized for a vertical 9:16 format. Main subject: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '9:16',
        outputMimeType: 'image/png',
      },
    });

    const base64ImageBytes: string | undefined = response.generatedImages[0]?.image.imageBytes;

    if (!base64ImageBytes) {
      throw new Error("The API did not return an image.");
    }
    
    return { imageBytes: base64ImageBytes, usage: null };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate Reel cover. The service may be unavailable or the prompt may have been rejected. Please check the console for details.");
  }
};


export const editThumbnailImage = async (prompt: string, image: {data: string, mimeType: string}): Promise<{imageData: string, usage: UsageMetadata | null}> => {
    try {
        const response = await ai.models.generateContent({
            model: imageEditModel,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: image.data,
                            mimeType: image.mimeType,
                        },
                    },
                    {
                        text: `You are a professional graphic designer creating a YouTube thumbnail. Edit the provided image based on the following instruction: "${prompt}". The output should be only the edited image, with no added text unless specifically requested.`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        // The response contains multiple parts, we need to find the image part
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return { imageData: part.inlineData.data, usage: response.usageMetadata ?? null };
            }
        }

        // If no image is found in the response
        throw new Error("The API did not return an edited image.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit thumbnail. The service may be unavailable or the prompt may have been rejected. Please check the console for details.");
    }
};