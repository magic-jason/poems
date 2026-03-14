use crate::settings;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_ANALYSIS_MODEL: &str = "gemini-2.5-flash";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzePoemRequest {
    pub title: String,
    pub author: String,
    pub content: String,
    pub style_name: String,
    pub style_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoemAnalysis {
    pub analysis: String,
    pub author_intro: String,
    pub image_prompt: String,
    pub pinyin_data: Vec<PinyinEntry>,
    pub vocabulary: Vec<VocabularyEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinyinEntry {
    pub char: String,
    pub pinyin: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabularyEntry {
    pub word: String,
    pub explanation: String,
}

pub fn build_analysis_request(
    title: &str,
    author: &str,
    content: &str,
    style_name: &str,
    style_prompt: &str,
) -> Value {
    json!({
        "contents": [{
            "parts": [{
                "text": build_analysis_prompt(title, author, content, style_name, style_prompt)
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "analysis": { "type": "STRING" },
                    "authorIntro": { "type": "STRING" },
                    "imagePrompt": { "type": "STRING" },
                    "pinyinData": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "char": { "type": "STRING" },
                                "pinyin": { "type": "STRING" }
                            },
                            "required": ["char", "pinyin"]
                        }
                    },
                    "vocabulary": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "word": { "type": "STRING" },
                                "explanation": { "type": "STRING" }
                            },
                            "required": ["word", "explanation"]
                        }
                    }
                },
                "required": ["analysis", "authorIntro", "imagePrompt", "pinyinData", "vocabulary"]
            }
        }
    })
}

pub async fn analyze_poem(request: AnalyzePoemRequest) -> Result<PoemAnalysis, String> {
    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    let api_key = settings
        .gemini_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "未配置 Gemini API Key，请先在设置中填写。".to_string())?;

    let endpoint = format!("{}/{}:generateContent", GEMINI_API_BASE, GEMINI_ANALYSIS_MODEL);
    let response = reqwest::Client::new()
        .post(endpoint)
        .query(&[("key", api_key.as_str())])
        .json(&build_analysis_request(
            &request.title,
            &request.author,
            &request.content,
            &request.style_name,
            &request.style_prompt,
        ))
        .send()
        .await
        .map_err(|error| format!("Gemini 请求失败：{error}"))?;

    if !response.status().is_success() {
        let details = response.text().await.unwrap_or_default();
        return Err(format!("Gemini 解析失败：{}", summarize_error(&details)));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("Gemini 响应解析失败：{error}"))?;
    let text = extract_response_text(&body)
        .ok_or_else(|| "Gemini 未返回可解析的文本结果。".to_string())?;

    serde_json::from_str::<PoemAnalysis>(&text)
        .map_err(|error| format!("解析诗词结果 JSON 失败：{error}"))
}


pub async fn generate_image(prompt: &str, model_type: &str) -> Result<String, String> {
    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    let api_key = settings
        .gemini_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "未配置 Gemini API Key，请先在设置中填写。".to_string())?;

    let model_name = match model_type {
        "paid" => "gemini-3.1-flash-image-preview",
        _ => "gemini-2.5-flash-image",
    };
    let endpoint = format!("{}/{}:generateContent", GEMINI_API_BASE, model_name);

    let response = reqwest::Client::new()
        .post(endpoint)
        .query(&[("key", api_key.as_str())])
        .json(&build_image_request(prompt, model_type))
        .send()
        .await
        .map_err(|error| format!("Gemini 生图请求失败：{error}"))?;

    if !response.status().is_success() {
        let details = response.text().await.unwrap_or_default();
        return Err(format!("Gemini 生图失败：{}", summarize_error(&details)));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("Gemini 生图响应解析失败：{error}"))?;

    extract_inline_image(&body).ok_or_else(|| "Gemini 未返回图片数据。".to_string())
}

fn build_image_request(prompt: &str, model_type: &str) -> Value {
    let final_prompt = format!(
        "STRICT NEGATIVE CONSTRAINTS (CRITICAL):
  - ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO CHARACTERS, NO WRITING, NO ALPHABET.
  - NO CHINESE CHARACTERS, NO CALLIGRAPHY, NO POEM TEXT, NO INSCRIPTIONS, NO KANJI, NO HANZI.
  - NO SIGNATURES, NO WATERMARKS, NO LOGOS, NO SEALS, NO STAMPS, NO RED SEALS.
  - NO BORDERS, NO FRAMES, NO MARGINS, NO SCROLLS, NO PAPER TEXTURE WITH WRITING.
  - THE IMAGE MUST BE A PURE PHOTOGRAPH OR PAINTING OF A SCENE WITH ZERO TEXTUAL ELEMENTS.
  - DO NOT ADD ANY TEXT TO THE IMAGE UNDER ANY CIRCUMSTANCES.

  IMAGE GENERATION TASK: Create a high-quality visual representation of the following scene.
  SCENE DESCRIPTION: {prompt}

  STYLE CONSTRAINTS:
  - All elements (people, clothing, architecture, objects, landscape) MUST be of traditional Chinese style.
  - Characters should wear traditional Chinese Hanfu or appropriate period clothing.
  - Architecture should follow traditional Chinese design (e.g., pagodas, courtyards, tiled roofs).
  - Objects should be traditional Chinese (e.g., Chinese ink brushes, fans, ceramics, lanterns).

  THE IMAGE MUST BE PURELY VISUAL WITH ZERO TEXTUAL ELEMENTS."
    );

    let mut generation_config = json!({
        "imageConfig": {
            "aspectRatio": "16:9"
        }
    });

    if model_type == "paid" {
        generation_config["imageConfig"]["imageSize"] = Value::String("2K".to_string());
    }

    json!({
        "contents": [{
            "parts": [{
                "text": final_prompt
            }]
        }],
        "generationConfig": generation_config
    })
}

fn extract_inline_image(body: &Value) -> Option<String> {
    body.get("candidates")?
        .as_array()?
        .iter()
        .flat_map(|candidate| candidate.get("content"))
        .flat_map(|content| content.get("parts"))
        .flat_map(|parts| parts.as_array())
        .flat_map(|parts| parts.iter())
        .find_map(|part| {
            let inline = part.get("inlineData")?;
            let mime = inline.get("mimeType")?.as_str()?;
            let data = inline.get("data")?.as_str()?;
            Some(format!("data:{mime};base64,{data}"))
        })
}

fn build_analysis_prompt(
    title: &str,
    author: &str,
    content: &str,
    style_name: &str,
    style_prompt: &str,
) -> String {
    format!(
        "你是一位精通中华传统文化的“诗画大宗师”。\n请根据以下古诗词和艺术风格，完成诗意解析、作者介绍、疑难词汇解释，提供用于AI图像生成的英文Prompt，并将原诗正文转换为带拼音的数据结构。\n\n古诗词（标题与作者）：《{title}》 {author}\n古诗词（正文）：\n{content}\n艺术风格：{style_name}\n风格要求：{style_prompt}\n\n重要提示（极其重要）：\n1. 生成的 imagePrompt 必须【完全避开】任何关于“文字”、“书法”、“诗句”、“印章”、“签名”、“卷轴”、“书本”或“纸张”的描述。\n2. 画面应纯粹表现诗中的【意境、山水、人物、草木、光影】，严禁出现任何形式的文本元素。\n3. 提示词应专注于视觉构图、色彩和氛围。\n4. 【字数限制】：\n   - analysis (诗意解析): 必须控制在 40 个汉字以内，用一句话提炼核心意象。\n   - authorIntro (作者介绍): 必须控制在 60 个汉字以内，简述作者生平及艺术风格。\n5. 【拼音数据结构】：\n   - 必须将传入的“古诗词（正文）”全文（*不要*包含标题和作者，包括标点符号）逐字拆解，组装成 pinyinData 数组返回。\n   - 每个元素必须包含 \"char\"（原字符）和 \"pinyin\"（该汉字的拼音，小写带声调）。对于标点符号，pinyin 字段留空字符串。\n6. 【重点词汇解释】：\n   - 提取出古诗中的 2 到 4 个疑难或重点词汇。\n   - 每个词汇配备精确的解释，信息必须准确无误。放入 vocabulary 数组中。\n\n请以JSON格式返回，示例：\n{{\n  \"analysis\": \"...\",\n  \"authorIntro\": \"...\",\n  \"imagePrompt\": \"...\",\n  \"pinyinData\": [\n    {{\"char\": \"床\", \"pinyin\": \"chuáng\"}},\n    {{\"char\": \"前\", \"pinyin\": \"qián\"}},\n    {{\"char\": \"明\", \"pinyin\": \"míng\"}},\n    {{\"char\": \"月\", \"pinyin\": \"yuè\"}},\n    {{\"char\": \"光\", \"pinyin\": \"guāng\"}},\n    {{\"char\": \"，\", \"pinyin\": \"\"}}\n  ],\n  \"vocabulary\": [\n    {{\"word\": \"明月\", \"explanation\": \"明亮的月亮。\"}}\n  ]\n}}"
    )
}

fn extract_response_text(body: &Value) -> Option<String> {
    body.get("candidates")?
        .as_array()?
        .iter()
        .flat_map(|candidate| candidate.get("content"))
        .flat_map(|content| content.get("parts"))
        .flat_map(|parts| parts.as_array())
        .flat_map(|parts| parts.iter())
        .find_map(|part| part.get("text").and_then(Value::as_str).map(str::to_owned))
}

fn summarize_error(details: &str) -> String {
    let trimmed = details.trim();
    if trimmed.is_empty() {
        "接口未返回详细错误信息。".to_string()
    } else {
        trimmed.chars().take(240).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::build_analysis_request;

    #[test]
    fn builds_gemini_analysis_request_body() {
        let body = build_analysis_request("静夜思", "李白", "床前明月光", "水墨", "淡雅");
        let text = serde_json::to_string(&body).unwrap();

        assert!(text.contains("静夜思"));
        assert!(text.contains("床前明月光"));
        assert!(text.contains("水墨"));
        assert!(text.contains("淡雅"));
        assert!(text.contains("responseMimeType"));
    }
}
