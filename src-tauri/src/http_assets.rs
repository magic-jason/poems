use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use reqwest::header::CONTENT_TYPE;

pub fn bytes_to_data_url(content_type: &str, bytes: &[u8]) -> String {
    format!("data:{content_type};base64,{}", BASE64_STANDARD.encode(bytes))
}

pub async fn fetch_image_as_data_url(url: &str) -> Result<String, String> {
    let response = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .map_err(|error| format!("下载生成图片失败：{error}"))?;

    if !response.status().is_success() {
        return Err(format!("下载生成图片失败 ({})", response.status()));
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .unwrap_or("image/png")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取图片内容失败：{error}"))?;

    Ok(bytes_to_data_url(&content_type, bytes.as_ref()))
}

#[cfg(test)]
mod tests {
    use super::bytes_to_data_url;

    #[test]
    fn encodes_png_bytes_as_data_url() {
        let url = bytes_to_data_url("image/png", &[1, 2, 3]);
        assert!(url.starts_with("data:image/png;base64,"));
    }
}
