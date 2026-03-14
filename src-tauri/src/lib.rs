pub mod dashscope;
pub mod gemini;
mod http_assets;
pub mod settings;

use gemini::{AnalyzePoemRequest, PoemAnalysis};
use serde::Deserialize;
use settings::AppSettings;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GenerateImageRequest {
  prompt: String,
  model_type: String,
}

#[tauri::command]
fn load_settings() -> Result<AppSettings, String> {
  settings::load_settings().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
  settings::save_settings(&settings).map_err(|error| error.to_string())
}

#[tauri::command]
async fn analyze_poem(payload: AnalyzePoemRequest) -> Result<PoemAnalysis, String> {
  match payload.model_type.as_deref() {
    Some("wanxiang") => dashscope::analyze_poem(payload).await,
    Some("free") | Some("paid") | None => gemini::analyze_poem(payload).await,
    Some(other) => Err(format!("不支持的解析模型类型：{other}")),
  }
}

#[tauri::command]
async fn generate_image(payload: GenerateImageRequest) -> Result<String, String> {
  match payload.model_type.as_str() {
    "wanxiang" => dashscope::generate_image(&payload.prompt).await,
    "free" | "paid" => gemini::generate_image(&payload.prompt, &payload.model_type).await,
    other => Err(format!("不支持的模型类型：{other}")),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![load_settings, save_settings, analyze_poem, generate_image])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
