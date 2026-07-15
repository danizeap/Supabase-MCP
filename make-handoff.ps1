# Build a clean, ready-to-send copy of this tool for a non-technical teammate.
#
# It bundles a portable Node runtime, so the teammate needs NOTHING installed except Claude Code:
# they open the folder, trust it once, and say "hi". It deliberately LEAVES OUT the developer /
# Drydock files that would otherwise make their Claude behave like an engineering agent.
#
# How to run: right-click this file > "Run with PowerShell", or in a terminal:
#     powershell -ExecutionPolicy Bypass -File .\make-handoff.ps1

$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Supabase-Media-Tool'

Write-Host "Source folder : $src"
Write-Host "Building       : $out"
Write-Host ""

# Require a filled-in .env and installed dependencies.
$envFile = Join-Path $src '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "No .env found in the source folder. Fill in .env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) first, then re-run."
}
if (-not (Test-Path (Join-Path $src 'node_modules'))) {
    Write-Error "No node_modules found. Run 'npm install' in the source folder once, then re-run this script."
}

# Start from a clean output folder.
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out '.claude\commands') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out 'runtime') -Force | Out-Null

# --- Runtime files the tool needs ---
Write-Host "Copying compiled code and dependencies (this can take a minute)..."
Copy-Item (Join-Path $src 'dist')         (Join-Path $out 'dist')         -Recurse
Copy-Item (Join-Path $src 'node_modules') (Join-Path $out 'node_modules') -Recurse
Copy-Item (Join-Path $src 'package.json') (Join-Path $out 'package.json')
Copy-Item $envFile                        (Join-Path $out '.env')
Copy-Item (Join-Path $src '.claude\commands\upload-media.md') (Join-Path $out '.claude\commands\upload-media.md')

# --- Friendly assistant instructions become the handoff folder's CLAUDE.md ---
Copy-Item (Join-Path $src 'handoff\CLAUDE.md') (Join-Path $out 'CLAUDE.md')

# --- Bundle a portable Node runtime so the teammate installs NOTHING (falls back to system node) ---
$bundledNode = $false
try {
    Write-Host "Downloading a portable Node runtime (about 90 MB, one time)..."
    $idx = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
    $ver = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version
    $nodeUrl = "https://nodejs.org/dist/$ver/win-x64/node.exe"
    Invoke-WebRequest -Uri $nodeUrl -OutFile (Join-Path $out 'runtime\node.exe') -UseBasicParsing
    $bundledNode = $true
    Write-Host "Bundled Node $ver (win-x64) - the teammate won't need to install anything."
} catch {
    Remove-Item (Join-Path $out 'runtime') -Recurse -Force -ErrorAction SilentlyContinue
    Write-Warning "Couldn't download the portable Node runtime: $($_.Exception.Message)"
    Write-Warning "Falling back to system Node - the teammate will need to install Node.js (nodejs.org) themselves."
}

# --- Pre-approve the storage server + its tools so the teammate gets as few prompts as possible ---
$settings = @'
{
  "enableAllProjectMcpServers": true,
  "permissions": {
    "allow": ["mcp__supabase-storage"]
  }
}
'@
Set-Content -Path (Join-Path $out '.claude\settings.json')       -Value $settings -Encoding utf8
Set-Content -Path (Join-Path $out '.claude\settings.local.json') -Value $settings -Encoding utf8

# --- .mcp.json: use the bundled Node if we got it, otherwise the teammate's system node ---
if ($bundledNode) { $nodeCmd = '${CLAUDE_PROJECT_DIR:-.}/runtime/node.exe' } else { $nodeCmd = 'node' }
$mcpObj = [ordered]@{
    mcpServers = [ordered]@{
        'supabase-storage' = [ordered]@{
            type    = 'stdio'
            command = $nodeCmd
            args    = @('${CLAUDE_PROJECT_DIR:-.}/dist/index.js')
        }
    }
}
$mcpObj | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $out '.mcp.json') -Encoding utf8

# --- A short, friendly note (in case the teammate ever opens a file) ---
if ($bundledNode) {
    $installLine = "Everything is already set up, including the software it needs to run. You don't have to install anything except Claude Code (which you're using now)."
} else {
    $installLine = "One quick thing to install first: Node.js from https://nodejs.org (the big green LTS button, just click through it)."
}
$startHere = @"
# You're all set

This folder lets you create storage buckets and upload media (images, video, design files) to
Supabase just by chatting with Claude.

$installLine

## To start
1. Open THIS folder in Claude Code.
2. If it asks, click "Yes, trust this folder".
3. Type:  hi

Claude will greet you, show what storage you have, and guide you from there. Or just say what you
want, like: "upload C:\Users\me\Pictures\logo.png to the brand-logos bucket".

Nothing here can delete or overwrite files, so you can't break anything.
"@
Set-Content -Path (Join-Path $out 'START-HERE.md') -Value $startHere -Encoding utf8

Write-Host ""
Write-Host "Done. Ready-to-send folder created:" -ForegroundColor Green
Write-Host "    $out"
Write-Host ""
Write-Host "Next steps for you:"
Write-Host "  1. Right-click that folder > Send to > Compressed (zipped) folder."
Write-Host "  2. Send the zip to your teammate over a PRIVATE channel (it contains the Supabase key)."
if ($bundledNode) {
    Write-Host ""
    Write-Host "First-run for the teammate (nothing to install):"
    Write-Host "  1. Unzip, then open the folder in Claude Code."
    Write-Host "  2. Click 'Yes, trust this folder'."
    Write-Host "  3. Type 'hi'. Done."
}
