use crate::{gemini, http_assets, settings};
use gemini::{AnalyzePoemRequest, PoemAnalysis};
use serde_json::{json, Value};
use tokio::time::{sleep, Duration};

const DASHSCOPE_API_BASE: &str = "https://dashscope.aliyuncs.com/api";
const DASHSCOPE_TEXT_MODEL: &str = "qwen-plus";
const NEGATIVE_PROMPT: &str = "文字, 书法, 诗句, 印章, 签名, 卷轴, 书本, 纸张, 字幕, 水印, letters, text, writing, watermark, signature, calligraphy, scroll, paper texture with writing";

pub fn build_dashscope_payload(prompt: &str) -> Value {
    json!({
        "model": "wan2.6-t2i",
        "input": {
            "messages": [{
                "role": "user",
                "content": [{
                    "text": format!("{prompt}. Traditional Chinese style, all elements (people, clothing, architecture) must be traditional Chinese. Pure visual scene with absolutely zero text elements.")
                }]
            }]
        },
        "parameters": {
            "prompt_extend": true,
            "watermark": false,
            "n": 1,
            "negative_prompt": NEGATIVE_PROMPT,
            "size": "1696*960"
        }
    })
}

fn poem_analysis_schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "analysis": { "type": "string" },
            "authorIntro": { "type": "string" },
            "imagePrompt": { "type": "string" },
            "pinyinData": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "char": { "type": "string" },
                        "pinyin": { "type": "string" }
                    },
                    "required": ["char", "pinyin"]
                }
            },
            "vocabulary": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "word": { "type": "string" },
                        "explanation": { "type": "string" }
                    },
                    "required": ["word", "explanation"]
                }
            }
        },
        "required": ["analysis", "authorIntro", "imagePrompt", "pinyinData", "vocabulary"]
    })
}

pub fn build_dashscope_analysis_payload(request: &AnalyzePoemRequest) -> Value {
    let prompt = gemini::build_analysis_prompt(
        &request.title,
        &request.author,
        &request.content,
        &request.style_name,
        &request.style_prompt,
    );

    json!({
        "model": DASHSCOPE_TEXT_MODEL,
        "input": {
            "messages": [
                {
                    "role": "system",
                    "content": "你是一位精通中华传统文化的诗画大宗师。请严格遵守要求，只输出符合 schema 的 JSON 对象。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        },
        "parameters": {
            "result_format": "message",
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "poem_analysis",
                    "strict": true,
                    "schema": poem_analysis_schema()
                }
            }
        }
    })
}

fn build_dashscope_async_payload(prompt: &str) -> Value {
    json!({
        "model": "wan2.5-t2i-preview",
        "input": {
            "prompt": format!("{prompt}. Traditional Chinese style, pure visual scene.")
        },
        "parameters": {
            "size": "1280*720",
            "n": 1,
            "negative_prompt": NEGATIVE_PROMPT
        }
    })
}

pub async fn analyze_poem(request: AnalyzePoemRequest) -> Result<PoemAnalysis, String> {
    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    let api_key = settings
        .dashscope_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "未配置 DashScope API Key，请先在设置中填写。".to_string())?;

    let url = format!(
        "{}/v1/services/aigc/text-generation/generation",
        DASHSCOPE_API_BASE
    );
    let response = reqwest::Client::new()
        .post(url)
        .bearer_auth(&api_key)
        .json(&build_dashscope_analysis_payload(&request))
        .send()
        .await
        .map_err(|error| format!("DashScope 解析请求失败：{error}"))?;

    if !response.status().is_success() {
        let details = response.text().await.unwrap_or_default();
        return Err(format!("DashScope 解析失败：{}", summarize_error(&details)));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("DashScope 解析响应失败：{error}"))?;
    let text = body
        .pointer("/output/choices/0/message/content")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("DashScope 未返回可解析的文本结果：{}", summarize_error(&body.to_string())))?;

    serde_json::from_str::<PoemAnalysis>(text)
        .map_err(|error| format!("解析 DashScope 结果 JSON 失败：{error}；原始内容：{}", summarize_error(text)))
}

pub async fn generate_image(prompt: &str) -> Result<String, String> {
    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    let api_key = settings
        .dashscope_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "未配置阿里云百炼 API Key，请先在设置中填写。".to_string())?;

    let client = reqwest::Client::new();
    let sync_url = format!(
        "{}/v1/services/aigc/multimodal-generation/generation",
        DASHSCOPE_API_BASE
    );

    match client
        .post(sync_url)
        .bearer_auth(&api_key)
        .json(&build_dashscope_payload(prompt))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            let body: Value = response
                .json()
                .await
                .map_err(|error| format!("解析万相响应失败：{error}"))?;
            if body.get("code").is_none() {
                if let Some(image_url) = body
                    .pointer("/output/choices/0/message/content/0/image")
                    .and_then(Value::as_str)
                {
                    return http_assets::fetch_image_as_data_url(image_url).await;
                }
            }
        }
        Ok(response) => {
            let details = response.text().await.unwrap_or_default();
            log::warn!("wan2.6 调用失败，降级到 wan2.5：{}", summarize_error(&details));
        }
        Err(error) => {
            log::warn!("wan2.6 请求异常，降级到 wan2.5：{error}");
        }
    }

    generate_image_async(prompt, &api_key).await
}

async fn generate_image_async(prompt: &str, api_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let create_url = format!(
        "{}/v1/services/aigc/text2image/image-synthesis",
        DASHSCOPE_API_BASE
    );
    let create_response = client
        .post(create_url)
        .bearer_auth(api_key)
        .header("X-DashScope-Async", "enable")
        .json(&build_dashscope_async_payload(prompt))
        .send()
        .await
        .map_err(|error| format!("万相 v2.5 创建任务失败：{error}"))?;

    if !create_response.status().is_success() {
        let details = create_response.text().await.unwrap_or_default();
        return Err(format!("万相 v2.5 创建任务失败：{}", summarize_error(&details)));
    }

    let create_body: Value = create_response
        .json()
        .await
        .map_err(|error| format!("解析万相任务响应失败：{error}"))?;
    let task_id = create_body
        .pointer("/output/task_id")
        .and_then(Value::as_str)
        .ok_or_else(|| "未获取到万相任务 ID。".to_string())?;

    let poll_url = format!("{}/v1/tasks/{task_id}", DASHSCOPE_API_BASE);
    for _ in 0..30 {
        sleep(Duration::from_secs(2)).await;
        let poll_response = client
            .get(&poll_url)
            .bearer_auth(api_key)
            .send()
            .await
            .map_err(|error| format!("轮询万相任务失败：{error}"))?;

        if !poll_response.status().is_success() {
            let details = poll_response.text().await.unwrap_or_default();
            return Err(format!("轮询万相任务失败：{}", summarize_error(&details)));
        }

        let poll_body: Value = poll_response
            .json()
            .await
            .map_err(|error| format!("解析万相轮询结果失败：{error}"))?;
        match poll_body
            .pointer("/output/task_status")
            .and_then(Value::as_str)
            .unwrap_or_default()
        {
            "SUCCEEDED" => {
                let image_url = poll_body
                    .pointer("/output/results/0/url")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "万相任务成功但未返回图片地址。".to_string())?;
                return http_assets::fetch_image_as_data_url(image_url).await;
            }
            "FAILED" => {
                let message = poll_body
                    .pointer("/output/message")
                    .and_then(Value::as_str)
                    .unwrap_or("未知错误");
                return Err(format!("万相生成失败：{message}"));
            }
            _ => {}
        }
    }

    Err("万相生成超时（60 秒）。".to_string())
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
    use super::{build_dashscope_analysis_payload, build_dashscope_payload};
    use crate::gemini::AnalyzePoemRequest;

    #[test]
    fn builds_dashscope_payload_with_negative_prompt() {
        let payload = build_dashscope_payload("moonlit river");
        let text = serde_json::to_string(&payload).unwrap();

        assert!(text.contains("wan2.6-t2i"));
        assert!(text.contains("negative_prompt"));
        assert!(text.contains("moonlit river"));
    }

    #[test]
    fn builds_dashscope_analysis_payload_with_json_schema() {
        let payload = build_dashscope_analysis_payload(&AnalyzePoemRequest {
            title: "静夜思".into(),
            author: "李白".into(),
            content: "床前明月光".into(),
            style_name: "水墨".into(),
            style_prompt: "淡雅".into(),
            model_type: Some("wanxiang".into()),
        });
        let text = serde_json::to_string(&payload).unwrap();

        assert!(text.contains("qwen-plus"));
        assert!(text.contains("json_schema"));
        assert!(text.contains("strict"));
        assert!(text.contains("additionalProperties"));
        assert!(text.contains("analysis"));
        assert!(text.contains("authorIntro"));
        assert!(text.contains("静夜思"));
    }
}
