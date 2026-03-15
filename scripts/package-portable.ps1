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

  $preferredExe = Join-Path $releaseDir 'app.exe'
  if (Test-Path $preferredExe) {
    $exe = Get-Item $preferredExe
  }
  else {
    $exeCandidates = Get-ChildItem $releaseDir -Filter '*.exe' |
      Where-Object {
        $_.Name -notmatch 'build-script' -and
        $_.BaseName -notmatch 'probe'
      }

    if ($exeCandidates.Count -eq 1) {
      $exe = $exeCandidates[0]
    }
    elseif ($exeCandidates.Count -gt 1) {
      $candidateNames = ($exeCandidates | ForEach-Object { $_.Name }) -join ', '
      throw "在 $releaseDir 找到多个候选可执行文件：$candidateNames。请明确指定主程序 exe。"
    }
    else {
      throw "未在 $releaseDir 找到主程序 exe（已排除 build-script 和 probe 二进制）。"
    }
  }

  Copy-Item $exe.FullName (Join-Path $appDir '墨韵灵笔.exe') -Force

  Get-ChildItem $releaseDir -Filter '*.dll' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName $appDir -Force }

  $resourceDir = Join-Path $releaseDir 'resources'
  if (Test-Path $resourceDir) {
    Copy-Item $resourceDir (Join-Path $appDir 'resources') -Recurse -Force
  }

  $readmeLines = @(
    '墨韵灵笔 Windows 绿色版',
    '========================',
    '',
    '1. 直接解压整个目录后运行 墨韵灵笔.exe',
    '2. 首次启动需填写 Gemini API Key',
    '3. 若需使用万象画卷，请在设置中补充 DashScope API Key',
    '4. 用户配置保存在 %APPDATA%\poetry-painting\config.json'
  )
  $readmeLines | Set-Content -Path (Join-Path $appDir 'README.txt') -Encoding UTF8

  if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $appDir '*') -DestinationPath $zipPath

  Write-Host "Portable package created: $zipPath"
}
finally {
  Pop-Location
}
