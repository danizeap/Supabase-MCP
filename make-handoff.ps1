# Build a clean, ready-to-send copy of this tool for a non-technical teammate.
#
# What it does: creates "Supabase-Media-Tool" on your Desktop containing only what the tool
# needs to run (compiled code, dependencies, your filled-in .env, and friendly assistant
# instructions) - and deliberately LEAVES OUT the developer/Drydock files that would otherwise
# make the teammate's Claude behave like an engineering agent instead of a media helper.
#
# How to run: right-click this file > "Run with PowerShell", or in a terminal:
#     powershell -ExecutionPolicy Bypass -File .\make-handoff.ps1

$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Supabase-Media-Tool'

Write-Host "Source folder : $src"
Write-Host "Building       : $out"
Write-Host ""

# Require a filled-in .env so the teammate is pre-configured (no setup on their end).
$envFile = Join-Path $src '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "No .env found in the source folder. Fill in .env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) first, then re-run."
}
if (-not (Test-Path (Join-Path $src 'node_modules'))) {
    Write-Error "No node_modules found. Run 'npm install' in the source folder once, then re-run this script."
}

# Start from a clean output folder.
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out '.claude\commands') -Force | Out-Null

# --- Runtime files the tool needs to run ---
Write-Host "Copying compiled code and dependencies (this can take a minute)..."
Copy-Item (Join-Path $src 'dist')         (Join-Path $out 'dist')         -Recurse
Copy-Item (Join-Path $src 'node_modules') (Join-Path $out 'node_modules') -Recurse
Copy-Item (Join-Path $src 'package.json') (Join-Path $out 'package.json')
Copy-Item (Join-Path $src '.mcp.json')    (Join-Path $out '.mcp.json')
Copy-Item $envFile                        (Join-Path $out '.env')
Copy-Item (Join-Path $src '.claude\commands\upload-media.md') (Join-Path $out '.claude\commands\upload-media.md')

# --- Friendly assistant instructions become the handoff folder's CLAUDE.md ---
Copy-Item (Join-Path $src 'handoff\CLAUDE.md') (Join-Path $out 'CLAUDE.md')

# --- Optional courtesy doc ---
if (Test-Path (Join-Path $src 'START-HERE.md')) {
    Copy-Item (Join-Path $src 'START-HERE.md') (Join-Path $out 'START-HERE.md')
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
# Project scope (applies after the one-time "trust this folder" click) ...
Set-Content -Path (Join-Path $out '.claude\settings.json')       -Value $settings -Encoding utf8
# ... and local scope (honored even before trust, for the smoothest possible first run).
Set-Content -Path (Join-Path $out '.claude\settings.local.json') -Value $settings -Encoding utf8

Write-Host ""
Write-Host "Done. Ready-to-send folder created:" -ForegroundColor Green
Write-Host "    $out"
Write-Host ""
Write-Host "Next steps for you:"
Write-Host "  1. Right-click that folder > Send to > Compressed (zipped) folder."
Write-Host "  2. Send the zip to your teammate over a PRIVATE channel (it contains the Supabase key)."
Write-Host ""
Write-Host "First-run steps for the teammate (one time):"
Write-Host "  1. Install Node.js from nodejs.org (the big green LTS button)."
Write-Host "  2. Unzip, then open the folder in Claude Code."
Write-Host "  3. Click 'Yes, trust this folder' when asked."
Write-Host "  4. Type 'hi' - Claude greets them and shows their storage. Done."
