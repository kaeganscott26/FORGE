$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
    throw "This packaging procedure must run on Windows."
}

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $RepositoryRoot

foreach ($Command in @("node", "npm")) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $Command"
    }
}

foreach ($RequiredFile in @("package.json", "package-lock.json", "scripts\prepare-node-pty.mjs")) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $RequiredFile) -PathType Leaf)) {
        throw "Required project file is missing: $RequiredFile"
    }
}

npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run package:win

$Version = node -p "require('./package.json').version"
$OutputDirectory = Join-Path $RepositoryRoot "dist_electron"
$InstallerArtifacts = @(Get-ChildItem -LiteralPath $OutputDirectory -File -Filter "FORGE-$Version-*.exe")
if ($InstallerArtifacts.Count -eq 0) {
    Write-Error "Expected NSIS installer for FORGE $Version was not produced."
    Get-ChildItem -LiteralPath $OutputDirectory -File | Select-Object -ExpandProperty FullName | Write-Host
    throw "Windows artifact verification failed."
}

$PtyRoot = Join-Path $OutputDirectory "win-unpacked\resources\app.asar.unpacked\node_modules\node-pty"
$RequiredPtyResources = @("pty.node", "conpty.node", "conpty_console_list.node")
foreach ($Resource in $RequiredPtyResources) {
    if (-not (Get-ChildItem -LiteralPath $PtyRoot -Recurse -File -Filter $Resource -ErrorAction SilentlyContinue | Select-Object -First 1)) {
        throw "The Windows package is missing the required node-pty resource: $Resource"
    }
}

Write-Host "Windows packaging succeeded for FORGE $Version:"
$InstallerArtifacts | ForEach-Object { Write-Host "  $($_.FullName)" }
Write-Host "  Verified Windows node-pty resources in $PtyRoot"
