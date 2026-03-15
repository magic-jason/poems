use crate::{gemini, http_assets, settings};
use gemini::{AnalyzePoemRequest, PoemAnalysis};
use serde_json::{json, Value};
use tokio::time::{sleep, Duration};

const DASHSCOPE_API_BASE: &str = "https://dashscope.aliyuncs.com/api";
const DASHSCOPE_PRIMARY_TEXT_MODEL: &str = "qwen-plus";
const DASHSCOPE_FALLBACK_TEXT_MODEL: &str = "qwen3-max";
const NEGATIVE_PROMPT: &str = "文字, 书法, 诗句, 印章, 签名, 卷轴, 书本, 纸张, 字幕, 水印, letters, text, writing, watermark, signature, calligraphy, scroll, paper texture with writing";

#[derive(Debug, Clone)]
struct AnalysisModelError {
    model: &'static str,
    status_code: Option<u16>,
    message: String,
}

impl AnalysisModelError {
    fn allows_fallback(&self) -> bool {
        should_fallback_analysis_error(self.status_code, &self.message)
    }

    fn as_user_message(&self) -> String {
        format!("{} 解析失败：{}", self.model, self.message)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum AsyncTaskOutcome {
    Pending,
    Succeeded(String),
    Failed(String),
}

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
    build_dashscope_analysis_payload_for_model(request, DASHSCOPE_PRIMARY_TEXT_MODEL)
}

pub fn build_dashscope_analysis_payload_for_model(
    request: &AnalyzePoemRequest,
    model: &str,
) -> Value {
    let prompt = gemini::build_analysis_prompt(
        &request.title,
        &request.author,
        &request.content,
        &request.style_name,
        &request.style_prompt,
    );

    json!({
        "model": model,
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

    analyze_poem_with_api_key(request, &api_key).await
}

pub async fn analyze_poem_with_api_key(
    request: AnalyzePoemRequest,
    api_key: &str,
) -> Result<PoemAnalysis, String> {
    match analyze_poem_with_model(&request, api_key, DASHSCOPE_PRIMARY_TEXT_MODEL).await {
        Ok(analysis) => Ok(analysis),
        Err(primary_error) if primary_error.allows_fallback() => {
            log::warn!(
                "{}，自动切换到 {}",
                primary_error.as_user_message(),
                DASHSCOPE_FALLBACK_TEXT_MODEL
            );
            match analyze_poem_with_model(&request, api_key, DASHSCOPE_FALLBACK_TEXT_MODEL).await {
                Ok(analysis) => Ok(analysis),
                Err(fallback_error) => Err(format!(
                    "DashScope 解析失败：主模型 {}；备用模型 {}",
                    primary_error.as_user_message(),
                    fallback_error.as_user_message()
                )),
            }
        }
        Err(error) => Err(error.as_user_message()),
    }
}

async fn analyze_poem_with_model(
    request: &AnalyzePoemRequest,
    api_key: &str,
    model: &'static str,
) -> Result<PoemAnalysis, AnalysisModelError> {
    let url = format!(
        "{}/v1/services/aigc/text-generation/generation",
        DASHSCOPE_API_BASE
    );
    let response = reqwest::Client::new()
        .post(url)
        .bearer_auth(api_key)
        .json(&build_dashscope_analysis_payload_for_model(request, model))
        .send()
        .await
        .map_err(|error| AnalysisModelError {
            model,
            status_code: None,
            message: format!("请求失败：{error}"),
        })?;

    let status = response.status();
    if !status.is_success() {
        let details = response.text().await.unwrap_or_default();
        return Err(AnalysisModelError {
            model,
            status_code: Some(status.as_u16()),
            message: format!("HTTP {}：{}", status.as_u16(), summarize_error(&details)),
        });
    }

    let body: Value = response.json().await.map_err(|error| AnalysisModelError {
        model,
        status_code: None,
        message: format!("响应解析失败：{error}"),
    })?;
    let text = extract_analysis_text(&body).map_err(|message| AnalysisModelError {
        model,
        status_code: None,
        message,
    })?;

    serde_json::from_str::<PoemAnalysis>(&text).map_err(|error| AnalysisModelError {
        model,
        status_code: None,
        message: format!("结果 JSON 解析失败：{error}；原始内容：{}", summarize_error(&text)),
    })
}

pub async fn generate_image(prompt: &str) -> Result<String, String> {
    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    let api_key = settings
        .dashscope_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "未配置阿里云百炼 API Key，请先在设置中填写。".to_string())?;

    generate_image_with_api_key(prompt, &api_key).await
}

pub async fn generate_image_with_api_key(prompt: &str, api_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let sync_url = format!(
        "{}/v1/services/aigc/multimodal-generation/generation",
        DASHSCOPE_API_BASE
    );

    let sync_failure = match client
        .post(sync_url)
        .bearer_auth(api_key)
        .json(&build_dashscope_payload(prompt))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            let body: Value = response
                .json()
                .await
                .map_err(|error| format!("解析万相响应失败：{error}"))?;
            if let Some(image_url) = extract_sync_image_url(&body) {
                return http_assets::fetch_image_as_data_url(&image_url).await;
            }

            let message = format!(
                "wan2.6 返回成功但未找到图片地址：{}",
                summarize_error(&body.to_string())
            );
            log::warn!("{}", message);
            Some(message)
        }
        Ok(response) => {
            let details = response.text().await.unwrap_or_default();
            let message = format!("wan2.6 调用失败：{}", summarize_error(&details));
            log::warn!("{}，降级到 wan2.5", message);
            Some(message)
        }
        Err(error) => {
            let message = format!("wan2.6 请求异常：{error}");
            log::warn!("{}，降级到 wan2.5", message);
            Some(message)
        }
    };

    match generate_image_async(prompt, api_key).await {
        Ok(image) => Ok(image),
        Err(async_error) => Err(combine_image_failures(sync_failure, async_error)),
    }
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
    let task_id = extract_async_task_id(&create_body)?;

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

        match parse_async_task_outcome(&poll_body) {
            AsyncTaskOutcome::Succeeded(image_url) => {
                return http_assets::fetch_image_as_data_url(&image_url).await;
            }
            AsyncTaskOutcome::Failed(message) => {
                return Err(format!("万相生成失败：{message}"));
            }
            AsyncTaskOutcome::Pending => {}
        }
    }

    Err("万相生成超时（60 秒）。".to_string())
}

fn extract_analysis_text(body: &Value) -> Result<String, String> {
    body.pointer("/output/choices/0/message/content")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| {
            format!(
                "DashScope 未返回可解析的文本结果：{}",
                summarize_error(&body.to_string())
            )
        })
}


fn should_fallback_analysis_error(status_code: Option<u16>, details: &str) -> bool {
    if matches!(status_code, Some(429 | 503 | 504)) {
        return true;
    }

    let normalized = details.to_lowercase();
    [
        "quota",
        "insufficient",
        "rate limit",
        "too many requests",
        "throttl",
        "resource exhausted",
        "modelnotfound",
        "not available",
        "unavailable",
        "service unavailable",
        "temporarily unavailable",
    ]
    .iter()
    .any(|keyword| normalized.contains(keyword))
        || details.contains("额度")
        || details.contains("余额")
        || details.contains("欠费")
        || details.contains("限流")
        || details.contains("不可用")
        || details.contains("无可用")
}

fn extract_sync_image_url(body: &Value) -> Option<String> {
    body.pointer("/output/choices/0/message/content/0/image")
        .and_then(Value::as_str)
        .map(str::to_owned)
}

fn extract_async_task_id(body: &Value) -> Result<String, String> {
    body.pointer("/output/task_id")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| format!("未获取到万相任务 ID：{}", summarize_error(&body.to_string())))
}

fn parse_async_task_outcome(body: &Value) -> AsyncTaskOutcome {
    match body
        .pointer("/output/task_status")
        .and_then(Value::as_str)
        .unwrap_or_default()
    {
        "SUCCEEDED" => body
            .pointer("/output/results/0/url")
            .and_then(Value::as_str)
            .map(|url| AsyncTaskOutcome::Succeeded(url.to_string()))
            .unwrap_or_else(|| {
                AsyncTaskOutcome::Failed("万相任务成功但未返回图片地址。".to_string())
            }),
        "FAILED" => AsyncTaskOutcome::Failed(
            body.pointer("/output/message")
                .and_then(Value::as_str)
                .map(str::to_owned)
                .unwrap_or_else(|| "未知错误".to_string()),
        ),
        _ => AsyncTaskOutcome::Pending,
    }
}

fn combine_image_failures(sync_failure: Option<String>, async_error: String) -> String {
    match sync_failure {
        Some(sync_failure) => format!(
            "万相生成失败：{}；降级 wan2.5 后仍失败：{}",
            sync_failure, async_error
        ),
        None => async_error,
    }
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
    use super::{
        build_dashscope_analysis_payload, build_dashscope_analysis_payload_for_model,
        build_dashscope_payload, combine_image_failures, extract_analysis_text,
        extract_sync_image_url, parse_async_task_outcome, should_fallback_analysis_error,
        AsyncTaskOutcome,
    };
    use crate::gemini::AnalyzePoemRequest;
    use serde_json::json;

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


    #[test]
    fn builds_dashscope_fallback_analysis_payload_for_qwen3_max() {
        let payload = build_dashscope_analysis_payload_for_model(
            &AnalyzePoemRequest {
                title: "春晓".into(),
                author: "孟浩然".into(),
                content: "春眠不觉晓".into(),
                style_name: "水墨".into(),
                style_prompt: "淡雅".into(),
                model_type: Some("wanxiang".into()),
            },
            "qwen3-max",
        );
        let text = serde_json::to_string(&payload).unwrap();

        assert!(text.contains("qwen3-max"));
        assert!(text.contains("json_schema"));
        assert!(text.contains("春晓"));
    }

    #[test]
    fn detects_analysis_fallback_cases() {
        assert!(should_fallback_analysis_error(
            Some(429),
            r#"{"code":"QuotaExceeded","message":"insufficient quota"}"#
        ));
        assert!(should_fallback_analysis_error(
            Some(400),
            r#"{"code":"ModelNotFound","message":"qwen-plus is not available"}"#
        ));
        assert!(should_fallback_analysis_error(
            Some(503),
            "service temporarily unavailable"
        ));
        assert!(!should_fallback_analysis_error(
            Some(400),
            r#"{"code":"InvalidParameter","message":"bad schema"}"#
        ));
    }

    #[test]
    fn extracts_analysis_text_from_message_response() {
        let body = json!({
            "output": {
                "choices": [{
                    "message": {
                        "content": "{\"analysis\":\"月色清冷\"}"
                    }
                }]
            }
        });

        assert_eq!(
            extract_analysis_text(&body).unwrap(),
            "{\"analysis\":\"月色清冷\"}"
        );
    }

    #[test]
    fn extracts_sync_image_url_from_multimodal_response() {
        let body = json!({
            "output": {
                "choices": [{
                    "message": {
                        "content": [{
                            "image": "https://example.com/generated.png"
                        }]
                    }
                }]
            }
        });

        assert_eq!(
            extract_sync_image_url(&body),
            Some("https://example.com/generated.png".to_string())
        );
    }

    #[test]
    fn parses_async_task_outcomes() {
        let success = json!({
            "output": {
                "task_status": "SUCCEEDED",
                "results": [{ "url": "https://example.com/async.png" }]
            }
        });
        let failed = json!({
            "output": {
                "task_status": "FAILED",
                "message": "quota exceeded"
            }
        });
        let pending = json!({
            "output": {
                "task_status": "RUNNING"
            }
        });

        assert_eq!(
            parse_async_task_outcome(&success),
            AsyncTaskOutcome::Succeeded("https://example.com/async.png".to_string())
        );
        assert_eq!(
            parse_async_task_outcome(&failed),
            AsyncTaskOutcome::Failed("quota exceeded".to_string())
        );
        assert_eq!(parse_async_task_outcome(&pending), AsyncTaskOutcome::Pending);
    }

    #[test]
    fn combines_sync_and_async_failures_for_debugging() {
        assert_eq!(
            combine_image_failures(
                Some("wan2.6 调用失败：bad request".to_string()),
                "万相 v2.5 创建任务失败：quota exceeded".to_string(),
            ),
            "万相生成失败：wan2.6 调用失败：bad request；降级 wan2.5 后仍失败：万相 v2.5 创建任务失败：quota exceeded"
        );
        assert_eq!(
            combine_image_failures(None, "only async failed".to_string()),
            "only async failed"
        );
    }
}
