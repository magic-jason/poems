$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$portableRoot = Join-Path $root 'dist-portable'
$appDir = Join-Path $portableRoot '墨韵灵笔'
$zipPath = Join-Path $portableRoot 'poetry-painting-win-x64-portable.zip'
$releaseDir = Join-Path $root 'src-tauri/target/release'

Push-Location $root
try {
  npm run build
  npm run tauri:build

  if (Test-Path $appDir) {
    Remove-Item $appDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $appDir -Force | Out-Null

  $exe = Get-ChildItem $releaseDir -Filter '*.exe' |
    Where-Object { $_.Name -notmatch 'build-script' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $exe) {
    throw "未在 $releaseDir 找到可执行文件，请先在 Windows 上成功完成 Tauri release 构建。"
  }

  Copy-Item $exe.FullName (Join-Path $appDir '墨韵灵笔.exe') -Force

  Get-ChildItem $releaseDir -Filter '*.dll' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName $appDir -Force }

  $resourceDir = Join-Path $releaseDir 'resources'
  if (Test-Path $resourceDir) {
    Copy-Item $resourceDir (Join-Path $appDir 'resources') -Recurse -Force
  }

  @"
墨韵灵笔 Windows 绿色版
========================

1. 直接解压整个目录后运行 `墨韵灵笔.exe`
2. 首次启动需填写 Gemini API Key
3. 若需使用万象画卷，请在设置中补充 DashScope API Key
4. 用户配置保存在 %APPDATA%\poetry-painting\config.json
"@ | Set-Content -Path (Join-Path $appDir 'README.txt') -Encoding UTF8

  if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $appDir '*') -DestinationPath $zipPath

  Write-Host "Portable package created: $zipPath"
}
finally {
  Pop-Location
}
