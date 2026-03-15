use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const APP_DIR_NAME: &str = "poetry-painting";
const SETTINGS_FILE_NAME: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub gemini_api_key: Option<String>,
    pub dashscope_api_key: Option<String>,
    pub last_model_type: Option<String>,
    pub last_used_style: Option<String>,
}

pub fn load_settings() -> io::Result<AppSettings> {
    let root = settings_dir()?;
    load_settings_at(&root)
}

pub fn save_settings(settings: &AppSettings) -> io::Result<()> {
    let root = settings_dir()?;
    save_settings_at(&root, settings)
}

pub fn load_settings_at(root: &Path) -> io::Result<AppSettings> {
    let path = settings_file_path(root);

    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = fs::read_to_string(path)?;
    let settings = serde_json::from_str::<AppSettings>(&contents)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;

    Ok(normalize_settings(settings))
}

pub fn save_settings_at(root: &Path, settings: &AppSettings) -> io::Result<()> {
    fs::create_dir_all(root)?;
    let path = settings_file_path(root);
    let contents = serde_json::to_string_pretty(&normalize_settings(settings.clone()))
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(path, contents)
}

fn settings_dir() -> io::Result<PathBuf> {
    let base = dirs::config_dir().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Unable to determine user config directory",
        )
    })?;

    Ok(base.join(APP_DIR_NAME))
}

fn settings_file_path(root: &Path) -> PathBuf {
    root.join(SETTINGS_FILE_NAME)
}

fn normalize_settings(settings: AppSettings) -> AppSettings {
    AppSettings {
        gemini_api_key: normalize_optional_value(settings.gemini_api_key),
        dashscope_api_key: normalize_optional_value(settings.dashscope_api_key),
        last_model_type: normalize_optional_value(settings.last_model_type),
        last_used_style: normalize_optional_value(settings.last_used_style),
    }
}

fn normalize_optional_value(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{load_settings_at, save_settings_at, AppSettings};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_root(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("poetry-painting-{name}-{unique}"))
    }

    #[test]
    fn saves_and_loads_settings_round_trip() {
        let settings = AppSettings {
            gemini_api_key: Some("g-key".into()),
            dashscope_api_key: Some("d-key".into()),
            last_model_type: Some("free".into()),
            last_used_style: Some("水墨淡彩".into()),
        };

        let root = test_root("settings-round-trip");
        save_settings_at(Path::new(&root), &settings).unwrap();
        let loaded = load_settings_at(Path::new(&root)).unwrap();

        assert_eq!(loaded.gemini_api_key.as_deref(), Some("g-key"));
        assert_eq!(loaded.dashscope_api_key.as_deref(), Some("d-key"));
        assert_eq!(loaded.last_model_type.as_deref(), Some("free"));
        assert_eq!(loaded.last_used_style.as_deref(), Some("水墨淡彩"));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn loads_settings_with_trimmed_values() {
        let root = test_root("settings-trimmed");
        fs::create_dir_all(&root).unwrap();
        fs::write(
            root.join("config.json"),
            r#"{
  "geminiApiKey": "  g-key  \n",
  "dashscopeApiKey": "\t d-key \r\n",
  "lastModelType": " wanxiang ",
  "lastUsedStyle": " 水墨淡彩 "
}"#,
        )
        .unwrap();

        let loaded = load_settings_at(Path::new(&root)).unwrap();

        assert_eq!(loaded.gemini_api_key.as_deref(), Some("g-key"));
        assert_eq!(loaded.dashscope_api_key.as_deref(), Some("d-key"));
        assert_eq!(loaded.last_model_type.as_deref(), Some("wanxiang"));
        assert_eq!(loaded.last_used_style.as_deref(), Some("水墨淡彩"));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn missing_settings_file_returns_default_settings() {
        let root = test_root("settings-default");
        let loaded = load_settings_at(Path::new(&root)).unwrap();

        assert_eq!(loaded, AppSettings::default());
        assert!(!root.exists());
    }
}
