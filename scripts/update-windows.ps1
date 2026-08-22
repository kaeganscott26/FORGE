$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
    throw "This update procedure must run on Windows."
}

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ExpectedOrigin = "https://github.com/kaeganscott26/FORGE"
Set-Location -LiteralPath $RepositoryRoot

if ((git branch --show-current) -ne "main") { throw "FORGE must be on main before updating." }
$Origin = (git config --get remote.origin.url).TrimEnd("/")
if ($Origin.EndsWith(".git")) { $Origin = $Origin.Substring(0, $Origin.Length - 4) }
if ($Origin -ne $ExpectedOrigin) { throw "FORGE has an untrusted origin: $Origin" }
$SourceChanges = @(git status --porcelain -- "." ":(exclude).obsidian/**")
if ($SourceChanges.Count -gt 0) { throw "FORGE has source changes outside .obsidian; refusing to update." }

$Before = (git rev-parse HEAD).Trim()
$ObsidianStashed = $false
$Succeeded = $false
$InstalledRoot = $null

try {
    $ObsidianChanges = @(git status --porcelain -- ".obsidian")
    if ($ObsidianChanges.Count -gt 0) {
        git stash push --include-untracked --message "FORGE Windows updater local Obsidian state" -- ".obsidian" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not preserve local Obsidian state." }
        $ObsidianStashed = $true
    }

    git fetch --prune origin main
    if ($LASTEXITCODE -ne 0) { throw "Could not fetch origin/main." }
    git merge-base --is-ancestor HEAD origin/main
    if ($LASTEXITCODE -ne 0) { throw "Local FORGE history has diverged from origin/main." }
    git merge --ff-only origin/main
    if ($LASTEXITCODE -ne 0) { throw "Could not fast-forward FORGE to origin/main." }

    & (Join-Path $PSScriptRoot "package-windows.ps1")

    if (Get-Process -Name "FORGE" -ErrorAction SilentlyContinue) { throw "Close FORGE before installing the verified Windows update." }
    $Version = node -p "require('./package.json').version"
    $Installer = Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot "dist_electron") -File -Filter "FORGE-$Version-*.exe" | Select-Object -First 1
    if (-not $Installer) { throw "The verified NSIS installer is missing." }
    $Install = Start-Process -FilePath $Installer.FullName -ArgumentList "/S" -Wait -PassThru
    if ($Install.ExitCode -ne 0) { throw "The Windows installer exited with code $($Install.ExitCode)." }

    $PackagedAsar = Join-Path $RepositoryRoot "dist_electron\win-unpacked\resources\app.asar"
    $InstalledRoots = @(
        (Join-Path $env:LOCALAPPDATA "Programs\forge"),
        (Join-Path $env:LOCALAPPDATA "Programs\FORGE"),
        (Join-Path $env:ProgramFiles "FORGE")
    )
    $InstalledRoot = $InstalledRoots | Where-Object { Test-Path -LiteralPath (Join-Path $_ "resources\app.asar") } | Select-Object -First 1
    if (-not $InstalledRoot) { throw "The installed FORGE runtime could not be found after the installer completed." }
    $InstalledAsar = Join-Path $InstalledRoot "resources\app.asar"
    if ((Get-FileHash -Algorithm SHA256 $PackagedAsar).Hash -ne (Get-FileHash -Algorithm SHA256 $InstalledAsar).Hash) {
        throw "The installed Windows app.asar does not match the verified package."
    }

    git restore -- "apps/desktop/out/main/index.js"
    if ($LASTEXITCODE -ne 0) { throw "Could not restore the tracked generated bundle after packaging." }
    $Succeeded = $true
}
finally {
    if (-not $Succeeded) { git reset --hard $Before | Out-Null }
    if ($ObsidianStashed) {
        git stash pop --index "stash@{0}" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "The update completed, but local Obsidian state could not be restored automatically." }
    }
}

Write-Host "FORGE for Windows is updated, installed, and verified at $InstalledRoot."
