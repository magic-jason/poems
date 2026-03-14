import { GoogleGenAI, Type } from "@google/genai";
import { analyzePoemDesktop, generateImageDesktop, isDesktopRuntime, type ModelType } from "./desktop";

export interface PoemAnalysis {
  analysis: string;
  authorIntro: string;
  imagePrompt: string;
  pinyinData: Array<{ char: string; pinyin: string }>;
  vocabulary: Array<{ word: string; explanation: string }>;
}

async function analyzePoemWeb(title: string, author: string, content: string, styleName: string, stylePrompt: string): Promise<PoemAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey as string });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `你是一位精通中华传统文化的“诗画大宗师”。
请根据以下古诗词和艺术风格，完成诗意解析、作者介绍、疑难词汇解释，提供用于AI图像生成的英文Prompt，并将原诗正文转换为带拼音的数据结构。

古诗词（标题与作者）：《${title}》 ${author}
古诗词（正文）：
${content}
艺术风格：${styleName}
风格要求：${stylePrompt}

重要提示（极其重要）：
1. 生成的 imagePrompt 必须【完全避开】任何关于“文字”、“书法”、“诗句”、“印章”、“签名”、“卷轴”、“书本”或“纸张”的描述。
2. 画面应纯粹表现诗中的【意境、山水、人物、草木、光影】，严禁出现任何形式的文本元素。
3. 提示词应专注于视觉构图、色彩和氛围。
4. 【字数限制】：
   - analysis (诗意解析): 必须控制在 40 个汉字以内，用一句话提炼核心意象。
   - authorIntro (作者介绍): 必须控制在 60 个汉字以内，简述作者生平及艺术风格。
5. 【拼音数据结构】：
   - 必须将传入的“古诗词（正文）”全文（*不要*包含标题和作者，包括标点符号）逐字拆解，组装成 pinyinData 数组返回。
   - 每个元素必须包含 "char"（原字符）和 "pinyin"（该汉字的拼音，小写带声调）。对于标点符号，pinyin 字段留空字符串。
6. 【重点词汇解释】：
   - 提取出古诗中的 2 到 4 个疑难或重点词汇。
   - 每个词汇配备精确的解释，信息必须准确无误。放入 vocabulary 数组中。

请以JSON格式返回，示例：
{
  "analysis": "...",
  "authorIntro": "...",
  "imagePrompt": "...",
  "pinyinData": [
    {"char": "床", "pinyin": "chuáng"},
    {"char": "前", "pinyin": "qián"},
    {"char": "明", "pinyin": "míng"},
    {"char": "月", "pinyin": "yuè"},
    {"char": "光", "pinyin": "guāng"},
    {"char": "，", "pinyin": ""}
  ],
  "vocabulary": [
    {"word": "明月", "explanation": "明亮的月亮。"}
  ]
}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          authorIntro: { type: Type.STRING },
          imagePrompt: { type: Type.STRING },
          pinyinData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                char: { type: Type.STRING },
                pinyin: { type: Type.STRING }
              },
              required: ["char", "pinyin"]
            }
          },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["word", "explanation"]
            }
          }
        },
        required: ["analysis", "authorIntro", "imagePrompt", "pinyinData", "vocabulary"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis.");
  }

  return JSON.parse(response.text);
}

/**
 * Helper to fetch image from URL and convert to Base64 via local proxy
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const proxiedUrl = `/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  const imgResponse = await fetch(proxiedUrl);
  if (!imgResponse.ok) {
    throw new Error(`下载生成图片失败 (${imgResponse.status})`);
  }
  const blob = await imgResponse.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Wanxiang v2.5 Async Generation (Fallback)
 */
async function generateImageWanxiangAsync(prompt: string, apiKey: string): Promise<string> {
  const negativePrompt = "文字, 书法, 诗句, 印章, 签名, 卷轴, 书本, 纸张, 字幕, 水印, letters, text, writing, watermark, signature, calligraphy, scroll, paper texture with writing";
  
  // 1. Create Task
  const createResponse = await fetch('/dashscope-api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: "wan2.5-t2i-preview",
      input: { prompt: `${prompt}. Traditional Chinese style, pure visual scene.` },
      parameters: { size: "1280*720", n: 1, negative_prompt: negativePrompt }
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`万相 v2.5 创建任务失败: ${await createResponse.text()}`);
  }

  const createData = await createResponse.json();
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error("未获取到任务 ID");

  // 2. Poll Task
  let attempts = 0;
  const maxAttempts = 30; // 30 * 2s = 60s
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2000));
    const taskResponse = await fetch(`/dashscope-api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!taskResponse.ok) throw new Error("轮询任务状态失败");
    const taskData = await taskResponse.json();
    const status = taskData.output?.task_status;

    if (status === 'SUCCEEDED') {
      const url = taskData.output?.results?.[0]?.url;
      if (!url) throw new Error("任务成功但未返回 URL");
      return fetchImageAsBase64(url);
    } else if (status === 'FAILED') {
      throw new Error(`生成失败: ${taskData.output?.message || '未知错误'}`);
    }
    attempts++;
  }
  throw new Error("生成超时（60秒）");
}

async function generateImageWanxiangWeb(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("未配置阿里云百炼 API Key（VITE_DASHSCOPE_API_KEY）。");
  }

  try {
    // Attempt wan2.6 Synchronous call first
    const negativePrompt = "文字, 书法, 诗句, 印章, 签名, 卷轴, 书本, 纸张, 字幕, 水印, letters, text, writing, watermark, signature, calligraphy, scroll, paper texture with writing";
    const requestBody = {
      model: "wan2.6-t2i",
      input: {
        messages: [{
          role: "user",
          content: [{ text: `${prompt}. Traditional Chinese style, all elements (people, clothing, architecture) must be traditional Chinese. Pure visual scene with absolutely zero text elements.` }]
        }]
      },
      parameters: { prompt_extend: true, watermark: false, n: 1, negative_prompt: negativePrompt, size: "1696*960" }
    };

    const response = await fetch('/dashscope-api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.code) {
        const imageUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
        if (imageUrl) return fetchImageAsBase64(imageUrl);
      }
    }
    console.warn("wan2.6 调用失败或额度不足，尝试降级到 wan2.5...");
  } catch (e) {
    console.warn("wan2.6 请求异常:", e);
  }

  // Fallback to wan2.5 Async
  return generateImageWanxiangAsync(prompt, apiKey);
}

async function generateImageWeb(prompt: string, modelType: 'free' | 'paid' | 'wanxiang'): Promise<string> {

  // Delegate to wanxiang model if selected
  if (modelType === 'wanxiang') {
    return generateImageWanxiangWeb(prompt);
  }

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


export async function analyzePoem(title: string, author: string, content: string, styleName: string, stylePrompt: string, modelType: ModelType): Promise<PoemAnalysis> {
  if (isDesktopRuntime()) {
    return analyzePoemDesktop(title, author, content, styleName, stylePrompt, modelType);
  }

  return analyzePoemWeb(title, author, content, styleName, stylePrompt);
}

export async function generateImage(prompt: string, modelType: ModelType): Promise<string> {
  if (isDesktopRuntime()) {
    return generateImageDesktop(prompt, modelType);
  }

  return generateImageWeb(prompt, modelType);
}
