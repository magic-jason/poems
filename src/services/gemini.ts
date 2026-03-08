import { GoogleGenAI, Type } from "@google/genai";

export interface PoemAnalysis {
  analysis: string;
  authorIntro: string;
  imagePrompt: string;
}

export async function analyzePoem(poem: string, styleName: string, stylePrompt: string): Promise<PoemAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey as string });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `你是一位精通中华传统文化的“诗画大宗师”。
请根据以下古诗词和艺术风格，完成诗意解析和作者介绍，并提供一段用于AI图像生成的英文Prompt。

古诗词：${poem}
艺术风格：${styleName}
风格要求：${stylePrompt}

重要提示（极其重要）：
1. 生成的 imagePrompt 必须【完全避开】任何关于“文字”、“书法”、“诗句”、“印章”、“签名”、“卷轴”、“书本”或“纸张”的描述。
2. 画面应纯粹表现诗中的【意境、山水、人物、草木、光影】，严禁出现任何形式的文本元素。
3. 提示词应专注于视觉构图、色彩和氛围。
4. 【字数限制】：
   - analysis (诗意解析): 必须控制在 40 个汉字以内，用一句话提炼核心意象。
   - authorIntro (作者介绍): 必须控制在 60 个汉字以内，简述作者生平及艺术风格。

请以JSON格式返回：
{
  "analysis": "诗意解析：一句话提炼，40字以内。",
  "authorIntro": "作者介绍：简明扼要，60字以内。",
  "imagePrompt": "英文Prompt：一段纯视觉的英文描述，严禁包含 'text', 'calligraphy', 'writing', 'characters', 'poem', 'alphabet', 'words' 等单词。"
}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          authorIntro: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["analysis", "authorIntro", "imagePrompt"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis.");
  }

  return JSON.parse(response.text);
}

export async function generateImage(prompt: string, modelType: 'free' | 'paid'): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey as string });

  const modelName = modelType === 'paid' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';

  // Force no text and Chinese elements in the image prompt
  const finalPrompt = `STRICT NEGATIVE CONSTRAINTS (CRITICAL):
  - ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS, NO WRITING, NO ALPHABET.
  - NO CHINESE CHARACTERS, NO CALLIGRAPHY, NO POEM TEXT, NO INSCRIPTIONS, NO KANJI, NO HANZI.
  - NO SIGNATURES, NO WATERMARKS, NO LOGOS, NO SEALS, NO STAMPS, NO RED SEALS.
  - NO BORDERS, NO FRAMES, NO MARGINS, NO SCROLLS, NO PAPER TEXTURE WITH WRITING.
  - THE IMAGE MUST BE A PURE PHOTOGRAPH OR PAINTING OF A SCENE WITH ZERO TEXTUAL ELEMENTS.
  - DO NOT ADD ANY TEXT TO THE IMAGE UNDER ANY CIRCUMSTANCES.
  
  IMAGE GENERATION TASK: Create a high-quality visual representation of the following scene.
  SCENE DESCRIPTION: ${prompt}
  
  STYLE CONSTRAINTS:
  - All elements (people, clothing, architecture, objects, landscape) MUST be of traditional Chinese style.
  - Characters should wear traditional Chinese Hanfu or appropriate period clothing.
  - Architecture should follow traditional Chinese design (e.g., pagodas, courtyards, tiled roofs).
  - Objects should be traditional Chinese (e.g., Chinese ink brushes, fans, ceramics, lanterns).
  
  THE IMAGE MUST BE PURELY VISUAL WITH ZERO TEXTUAL ELEMENTS.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          text: finalPrompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        ...(modelType === 'paid' ? { imageSize: "2K" } : {})
      }
    }
  });

  let base64Image = "";
  if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!base64Image) {
    throw new Error("Failed to generate image.");
  }

  return base64Image;
}
