import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const app = express();
const PORT = 3000;

// Enable JSON parsing with a large size limit to support base64 image editing uploads
app.use(express.json({ limit: "50mb" }));

// Initialize GoogleGenAI with v1beta so thinkingConfig and all active Gemini models are supported
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  apiVersion: "v1beta",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Supported fast text models with automatic failover
const textModels = [
  "gemini-4-hydrogen",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
];
const imageModel = "imagen-4.0-generate-001";
const imageEditModel = "gemini-2.5-flash-image";

// Track models temporarily experiencing high demand so subsequent requests skip them immediately
const COOLDOWN_MS = 3 * 60 * 1000;
const modelCooldownUntil = new Map<string, number>();

function formatErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred.";
  const rawMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return rawMsg;
}

// Clean conversational chatter ("Here is your...", etc.) and instructional 1,2,3,4 labels
function cleanGeneratedResponse(text: string): string {
  if (!text) return '';
  return text
    // Remove conversational opener lines like "Here is your...", "Here's the...", "Sure!", "Certainly!"
    .replace(/^(?:Here (?:is|are) (?:your|the|an|some)|Here's (?:your|the|an|some)|Sure[!,.]?|Certainly[!,.]?)[^\n]*\n+/i, '')
    // Remove lines like "1. Above The Fold:", "1. **Above The Fold**:", "2. Detailed Video Breakdown:", etc.
    .replace(/^[ \t]*[1-4]\.\s*\*{0,2}(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Timestamps(?: \/ Chapters)?(?: Outline)?|Call [Tt]o Action(?:\s*\(CTA\))?|CTA)[^*:\n]*\*{0,2}:?[ \t]*/gim, '')
    // Remove numbers 1-4 preceding bold meta headers in description
    .replace(/^[ \t]*[1-4]\.\s*\*\*(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Timestamps|Chapters|Call [Tt]o Action|CTA)[^*]*\*\*:?[ \t]*/gim, '')
    // Remove standalone bold meta-labels
    .replace(/^[ \t]*\*{1,2}(?:Above [Tt]he [Ff]old|Detailed Video Breakdown|Video Breakdown|Call [Tt]o Action(?:\s*\(CTA\))?)\*{1,2}:?[ \t]*\n?/gim, '')
    .trim();
}

function isTransientError(err: any, errMsg: string): boolean {
  const status = err?.status || err?.code;
  const lower = errMsg.toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 504 ||
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    errMsg.includes('503') ||
    errMsg.includes('429') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily') ||
    lower.includes('timed out') ||
    lower.includes('aborted')
  );
}

function getOrderedModels(): string[] {
  const now = Date.now();
  const healthy: string[] = [];
  const cooling: string[] = [];

  for (const model of textModels) {
    const until = modelCooldownUntil.get(model) ?? 0;
    if (until > now) {
      cooling.push(model);
    } else {
      healthy.push(model);
    }
  }

  return [...healthy, ...cooling];
}

function buildModelConfig(model: string, useSearch: boolean, abortSignal: AbortSignal): Record<string, any> {
  const config: Record<string, any> = { abortSignal };
  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }
  if (model === "gemini-4-hydrogen" || model === "gemini-3-flash-preview") {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (model === "gemini-2.5-flash") {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

async function generateTextWithFallback(params: {
  contents: string;
  useSearch?: boolean;
}) {
  const orderedModels = getOrderedModels();
  const hedgeDelayMs = params.useSearch ? 4500 : 3500;
  const perAttemptTimeoutMs = 25000;

  return new Promise<any>((resolve, reject) => {
    let settled = false;
    let nextIndex = 0;
    let inFlight = 0;
    let lastError: any = null;
    const activeEntries: Array<{ model: string; controller: AbortController }> = [];
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      for (const entry of activeEntries) {
        if (!entry.controller.signal.aborted) {
          entry.controller.abort();
        }
      }
    };

    const launchNext = () => {
      if (settled || nextIndex >= orderedModels.length) {
        if (!settled && inFlight === 0) {
          settled = true;
          cleanup();
          reject(lastError || new Error("All AI models failed to respond."));
        }
        return;
      }

      const model = orderedModels[nextIndex++];
      const controller = new AbortController();
      activeEntries.push({ model, controller });
      inFlight++;

      const timeoutHandle = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }, perAttemptTimeoutMs);

      // Schedule a hedged backup model if this model is slow to respond
      if (hedgeTimer) clearTimeout(hedgeTimer);
      if (nextIndex < orderedModels.length) {
        hedgeTimer = setTimeout(() => {
          if (!settled) {
            launchNext();
          }
        }, hedgeDelayMs);
      }

      ai.models.generateContent({
        model,
        contents: params.contents,
        config: buildModelConfig(model, !!params.useSearch, controller.signal),
      }).then((response) => {
        clearTimeout(timeoutHandle);
        inFlight--;
        if (!settled) {
          settled = true;
          modelCooldownUntil.delete(model);
          // Briefly deprioritize any slower models that were still hanging when this backup won
          const softCooldown = Date.now() + 60 * 1000;
          for (const entry of activeEntries) {
            if (entry.model !== model && !entry.controller.signal.aborted) {
              const existing = modelCooldownUntil.get(entry.model) ?? 0;
              if (existing < softCooldown) {
                modelCooldownUntil.set(entry.model, softCooldown);
              }
            }
          }
          cleanup();
          resolve(response);
        }
      }).catch((err: any) => {
        clearTimeout(timeoutHandle);
        inFlight--;
        if (settled) return;

        lastError = err;
        const errMsg = formatErrorMessage(err);
        console.warn(`Model ${model} failed: "${errMsg}".`);

        if (isTransientError(err, errMsg)) {
          modelCooldownUntil.set(model, Date.now() + COOLDOWN_MS);
        }

        // Immediately launch the next fallback without waiting for hedge timer
        if (nextIndex < orderedModels.length) {
          launchNext();
        } else if (inFlight === 0) {
          settled = true;
          cleanup();
          reject(lastError);
        }
      });
    };

    launchNext();
  });
}

// API endpoints
app.post("/api/youtube", async (req, res) => {
  try {
    const { description, link, format = 'video', tone = 'viral' } = req.body;
    let promptContext = '';
    const useSearch = !!link;

    if (description && link) {
      promptContext = `The user provided a link to their YouTube content: "${link}" and a description: "${description}". Search the link if possible for context, and combine with the description.`;
    } else if (description) {
      promptContext = `The user provided this video description/topic: "${description}".`;
    } else if (link) {
      promptContext = `The user provided this YouTube link: "${link}". Analyze the topic and content based on this link.`;
    } else {
      return res.status(400).json({ error: "Either a description or a link must be provided." });
    }

    const isShorts = format === 'shorts';

    const prompt = `
You are an elite YouTube SEO specialist and viral video strategist who understands the current YouTube recommendation algorithm, search ranking factors, CTR psychology, and viewer retention.

Target Format: ${isShorts ? 'YouTube Shorts (Vertical short-form video)' : 'YouTube Long-Form Video'}
Target Tone/Vibe: ${tone}
Content Context: ${promptContext}

CRITICAL OUTPUT CONSTRAINTS:
- NEVER include conversational openings or greetings like "Here is your...", "Sure!", or "Here's...". Start directly with the first heading.
- The description MUST be 100% copy-paste ready. NEVER include labels starting with 1, 2, 3, 4 (such as "1. Above the fold", "2. Detailed Video Breakdown", etc.).

Please generate the content pack using the EXACT Markdown headings below:

${isShorts ? `
### **Click-Worthy Shorts Titles**
Provide 4-5 high-impact, curiosity-driven titles (under 60 characters each for mobile screens). Include "#Shorts" on 2 of them.

### **Shorts Description (Search-Optimized)**
Write the actual, final Shorts description (under 150 words). It MUST be 100% copy-paste ready with NO meta-labels or instructional numbering like 1, 2, 3, 4. Load it with natural search keywords and end with a strong engagement call-to-action.

### **Hashtags (3–5 YouTube Hashtags)**
Provide exactly 3 to 5 targeted hashtags (starting with #Shorts or #YouTubeShorts, followed by high-volume niche tags). Format on a single line.

### **YouTube Tags (Comma-Separated)**
Provide a comma-separated list of 15-20 top-performing, high-ranking search tags (under 500 characters total) ready to paste into YouTube Studio.

### **Viral Retention Hook & Strategy**
Provide:
1. First 3-second visual/verbal hook script to prevent swiping away.
2. Suggested loop or audio transition to maximize retention above 100%.
` : `
### **High-CTR Video Titles**
Provide 5 distinct, click-worthy titles optimized for high CTR and algorithmic distribution:
- 1x Curiosity Gap Title
- 1x High-Volume Search SEO Title
- 1x Bold / Contrarian Title
- 1x Transformation / How-To Title
- 1x Numbers / Listicle Title

### **SEO-Optimized YouTube Description**
Write the actual, final YouTube description exactly as the creator will paste it into YouTube Studio.

CRITICAL RULES:
- DO NOT INCLUDE ANY LABELS OR UNWANTED TEXT STARTING WITH 1, 2, 3, 4 (such as "1. Above the fold", "2. Detailed Video Breakdown", "3. Timestamps", "4. Call to Action").
- NO explanatory headers or bullet numbers inside the description. It must be 100% copy-paste ready.
- The description must flow naturally in this order:
  * An immediate 2-line hook with primary SEO keywords.
  * 2-3 engaging, well-spaced paragraphs explaining the video topic and solutions, naturally embedding high-ranking search keywords.
  * Natural Timestamps / Chapters:
    00:00 - Introduction & The Core Problem
    01:15 - Key Breakthrough
    03:45 - Step-by-Step Breakdown
    06:20 - Common Mistakes to Avoid
    08:30 - Final Takeaway & Next Steps
  * Natural Call to Action and channel links:
    🔔 Subscribe for more high-impact videos: [Your Channel Link]
    💬 Leave a comment: Which part was most helpful to you?
    📌 Helpful resources & links: [Your Links]

### **Hashtags (3–5 YouTube Hashtags)**
Provide exactly 3 to 5 hyper-relevant, high-intent hashtags. Format on a single line.

### **YouTube Studio Tags (Comma-Separated)**
Provide a comma-separated list of 20-25 high-search, low-competition tags (under 500 characters total).

### **Viral Pinned Comment**
Write an engaging question or curiosity prompt designed to be pinned at the top of the comment section to drive high comment velocity in the first hour.
`}
    `.trim();

    const response = await generateTextWithFallback({
      contents: prompt,
      useSearch,
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? null;
    let rawText = response.text || "";

    const cleanedText = cleanGeneratedResponse(rawText);

    res.json({
      text: cleanedText,
      sources,
      usage: response.usageMetadata ?? null,
    });
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error generating YouTube content on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/instagram", async (req, res) => {
  try {
    const { description, format = 'reel', tone = 'viral' } = req.body;
    if (!description) {
      return res.status(400).json({ error: "Description is required." });
    }

    const prompt = `
You are a world-class Instagram algorithm strategist, viral Reels creator, and Instagram SEO expert.

Platform: Instagram
Format: ${format.toUpperCase()} (e.g. ${format === 'reel' ? 'Instagram Reel video' : format === 'carousel' ? 'Instagram Carousel' : 'Instagram Single Post'})
Tone/Style: ${tone}
User Content / Idea: "${description}"

CRITICAL OUTPUT CONSTRAINTS:
- NEVER include conversational openings or greetings like "Here is your...", "Sure!", or "Here's...". Start directly with the first heading.
- STRICT HASHTAG LIMIT: Use ONLY 3 TO 5 TARGETED HASHTAGS (maximum 5 hashtags total!). NEVER provide 15-30 hashtags.
- NO META LABELS: The caption must be 100% copy-paste ready without explanatory labels (do NOT write "Hook:", "Body:", "CTA:", "1.", "2.", "3.").

Generate the viral-ready post pack with the following EXACT Markdown sections:

### **Hook Options (First Line)**
Provide 3 scroll-stopping first-line hook variations (each under 125 characters) that compel viewers to tap "...more" to read the rest.

### **Instagram Caption**
Provide the actual, final copy-paste ready caption:
- Starts directly with the winning hook
- Visual, skimmable layout with clean line breaks and tasteful emoji accents
- Body packed with value, relatable storytelling, or step-by-step insight
- Natural keyword integration for Instagram Search SEO
- High-converting Call to Action (CTA) asking viewers to "Save this for later" or "Share this with someone who needs it"
- DO NOT include meta labels or numbering like 1, 2, 3, 4.

### **Hashtags (Strictly 5 High-Impact Tags)**
Provide EXACTLY 5 high-impact, curated hashtags following the 1-broad / 3-niche / 1-intent rule. Format cleanly on a single line starting with #.

### **Instagram Search Keywords**
List 5-7 high-volume keywords used in the caption that optimize this post for Instagram Search & Explore indexing.

### **Viral Audio & On-Screen Hook Tip**
Provide:
1. The 3-second on-screen text hook to place at the start of the ${format === 'reel' ? 'Reel' : 'Post'}.
2. Recommended audio style (e.g., trending upbeat synth, dramatic suspense, chill lofi, or direct original voiceover) to pair with the visual.
    `.trim();

    const response = await generateTextWithFallback({
      contents: prompt,
      useSearch: false,
    });

    let rawText = response.text || "";
    const cleanedText = cleanGeneratedResponse(rawText);

    res.json({
      text: cleanedText,
      usage: response.usageMetadata ?? null,
    });
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error generating Instagram content on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/ideas", async (req, res) => {
  try {
    const { niche } = req.body;
    if (!niche) {
      return res.status(400).json({ error: "Niche is required." });
    }

    const prompt = `
You are a creative strategist for top YouTube and Instagram creators. A user wants viral video ideas for their niche: "${niche}".

NEVER include conversational chatter like "Here is your...". Start directly with the first idea.

Generate 5-7 high-performing, trend-aligned video concepts designed for maximum CTR and viral reach.

For each idea, provide:
1. **Title**: Catchy, high-CTR, SEO-optimized title.
2. **Concept Hook**: 1-2 sentence core premise that hooks the audience immediately.
3. **Format Recommendation**: Whether this works best as a Long-form YouTube Video, a YouTube Short, or an Instagram Reel.

Format the output clearly with bold markdown headings.
    `.trim();

    const response = await generateTextWithFallback({
      contents: prompt,
      useSearch: false,
    });

    let rawText = response.text || "";
    const cleanedText = cleanGeneratedResponse(rawText);

    res.json({
      text: cleanedText,
      usage: response.usageMetadata ?? null,
    });
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error generating video ideas on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/thumbnail", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: `Create a visually stunning, high-contrast, and eye-catching YouTube thumbnail. The design should be modern, clean, and easily readable at small sizes. Main subject: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/png',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
      throw new Error("The API did not return any image.");
    }

    res.json({ imageBytes: base64ImageBytes, usage: null });
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error generating thumbnail image on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/reel-cover", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: `Create a vibrant, eye-catching, and high-energy Instagram Reel cover image. The design should be trendy, bold, and optimized for a vertical 9:16 format. Main subject: ${prompt}`,
      config: {
        numberOfImages: 1,
        aspectRatio: '9:16',
        outputMimeType: 'image/png',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
      throw new Error("The API did not return any image.");
    }

    res.json({ imageBytes: base64ImageBytes, usage: null });
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error generating reel cover image on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/edit-thumbnail", async (req, res) => {
  try {
    const { prompt, image } = req.body;
    if (!prompt || !image || !image.data || !image.mimeType) {
      return res.status(400).json({ error: "Prompt and image (data, mimeType) are required." });
    }

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
            text: `You are a professional graphic designer creating social media graphics. Edit the provided image based on the following instruction: "${prompt}". The output should be only the edited image, with no added text unless specifically requested.`,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return res.json({ imageData: part.inlineData.data, usage: response.usageMetadata ?? null });
        }
      }
    }

    throw new Error("The API did not return an edited image.");
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error("Error editing thumbnail on server:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Error starting server:", err);
});
