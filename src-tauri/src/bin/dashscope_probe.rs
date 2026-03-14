use app_lib::{
    dashscope,
    gemini::{AnalyzePoemRequest, PoemAnalysis},
    settings,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use std::{env, fs, path::PathBuf};

const DEFAULT_TITLE: &str = "静夜思";
const DEFAULT_AUTHOR: &str = "李白";
const DEFAULT_CONTENT: &str = "床前明月光，疑是地上霜。举头望明月，低头思故乡。";
const DEFAULT_STYLE_NAME: &str = "水墨淡彩";
const DEFAULT_STYLE_PROMPT: &str = "采用中国传统写意手法。强调‘墨分五色’（焦、浓、重、淡、清）的变化。宣纸质感、留白意境、皴法、气韵生动、水墨晕染、禅意。画面构图疏朗，严禁使用鲜艳的合成色彩，以黑白灰为主，点缀少量赭石或花青。";
const DEFAULT_IMAGE_PROMPT: &str = "A moonlit courtyard in traditional Chinese style, silver moonlight on the ground, a solitary scholar gazing at the moon, ink wash atmosphere, pure visual scene, no text.";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Mode {
    Full,
    Analyze,
    Image,
}

#[derive(Debug)]
struct Args {
    mode: Mode,
    title: String,
    author: String,
    content: String,
    style_name: String,
    style_prompt: String,
    prompt: Option<String>,
    output: PathBuf,
}

fn main() {
    if let Err(error) = tauri::async_runtime::block_on(run()) {
        eprintln!("[dashscope-probe] {error}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), String> {
    let args = parse_args(env::args().skip(1))?;
    let api_key = load_dashscope_api_key()?;

    match args.mode {
        Mode::Analyze => {
            let analysis = run_analyze(&args, &api_key).await?;
            println!("[dashscope-probe] analysis ok");
            println!("[dashscope-probe] imagePrompt={}", analysis.image_prompt);
        }
        Mode::Image => {
            let prompt = args.prompt.unwrap_or_else(|| DEFAULT_IMAGE_PROMPT.to_string());
            let output = run_image(&prompt, &api_key, &args.output).await?;
            println!("[dashscope-probe] image ok: {}", output.display());
        }
        Mode::Full => {
            let analysis = run_analyze(&args, &api_key).await?;
            println!("[dashscope-probe] analysis ok");
            println!("[dashscope-probe] imagePrompt={}", analysis.image_prompt);
            let output = run_image(&analysis.image_prompt, &api_key, &args.output).await?;
            println!("[dashscope-probe] full flow ok: {}", output.display());
        }
    }

    Ok(())
}

async fn run_analyze(args: &Args, api_key: &str) -> Result<PoemAnalysis, String> {
    println!("[dashscope-probe] running analyze with qwen-plus...");
    dashscope::analyze_poem_with_api_key(
        AnalyzePoemRequest {
            title: args.title.clone(),
            author: args.author.clone(),
            content: args.content.clone(),
            style_name: args.style_name.clone(),
            style_prompt: args.style_prompt.clone(),
            model_type: Some("wanxiang".to_string()),
        },
        api_key,
    )
    .await
}

async fn run_image(prompt: &str, api_key: &str, output: &PathBuf) -> Result<PathBuf, String> {
    println!("[dashscope-probe] running image with wan2.6 / wan2.5 fallback...");
    let data_url = dashscope::generate_image_with_api_key(prompt, api_key).await?;
    write_data_url_to_file(&data_url, output)
}

fn load_dashscope_api_key() -> Result<String, String> {
    if let Ok(api_key) = env::var("DASHSCOPE_API_KEY") {
        if !api_key.trim().is_empty() {
            return Ok(api_key);
        }
    }

    let settings = settings::load_settings().map_err(|error| error.to_string())?;
    settings
        .dashscope_api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            "未找到本地 DashScope API Key。请先设置环境变量 DASHSCOPE_API_KEY，或先启动桌面应用保存一次设置。".to_string()
        })
}

fn write_data_url_to_file(data_url: &str, output: &PathBuf) -> Result<PathBuf, String> {
    let (_, payload) = data_url
        .split_once(',')
        .ok_or_else(|| "返回的图片数据不是合法的 data URL。".to_string())?;
    let bytes = STANDARD
        .decode(payload)
        .map_err(|error| format!("解码图片数据失败：{error}"))?;
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建输出目录失败：{error}"))?;
    }
    fs::write(output, bytes).map_err(|error| format!("写入图片文件失败：{error}"))?;
    Ok(output.clone())
}

fn parse_args<I>(args: I) -> Result<Args, String>
where
    I: IntoIterator<Item = String>,
{
    let mut mode = Mode::Full;
    let mut title = DEFAULT_TITLE.to_string();
    let mut author = DEFAULT_AUTHOR.to_string();
    let mut content = DEFAULT_CONTENT.to_string();
    let mut style_name = DEFAULT_STYLE_NAME.to_string();
    let mut style_prompt = DEFAULT_STYLE_PROMPT.to_string();
    let mut prompt: Option<String> = None;
    let mut output = env::temp_dir().join("poetry-painting-dashscope-probe.png");

    let mut iter = args.into_iter();
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--mode" => {
                let value = next_arg(&mut iter, "--mode")?;
                mode = match value.as_str() {
                    "full" => Mode::Full,
                    "analyze" => Mode::Analyze,
                    "image" => Mode::Image,
                    other => return Err(format!("不支持的 mode：{other}，可选值为 full/analyze/image")),
                };
            }
            "--title" => title = next_arg(&mut iter, "--title")?,
            "--author" => author = next_arg(&mut iter, "--author")?,
            "--content" => content = next_arg(&mut iter, "--content")?,
            "--style-name" => style_name = next_arg(&mut iter, "--style-name")?,
            "--style-prompt" => style_prompt = next_arg(&mut iter, "--style-prompt")?,
            "--prompt" => prompt = Some(next_arg(&mut iter, "--prompt")?),
            "--output" => output = PathBuf::from(next_arg(&mut iter, "--output")?),
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            other => return Err(format!("未知参数：{other}，可用 --help 查看说明")),
        }
    }

    Ok(Args {
        mode,
        title,
        author,
        content,
        style_name,
        style_prompt,
        prompt,
        output,
    })
}

fn next_arg<I>(iter: &mut I, flag: &str) -> Result<String, String>
where
    I: Iterator<Item = String>,
{
    iter.next()
        .ok_or_else(|| format!("参数 {flag} 缺少取值"))
}

fn print_help() {
    println!(
        "dashscope_probe\n\n  --mode full|analyze|image\n  --title <标题>\n  --author <作者>\n  --content <正文>\n  --style-name <风格名>\n  --style-prompt <风格提示词>\n  --prompt <仅 image 模式使用的英文提示词>\n  --output <输出 png 路径>\n\n默认会优先读取 DASHSCOPE_API_KEY；若未设置，则尝试读取桌面版配置文件中的 DashScope key。"
    );
}
