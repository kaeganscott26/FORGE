$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
    throw "This installation procedure must run on Windows."
}

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $RepositoryRoot

function Get-Sha256([string]$Path) {
    $Hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        $Stream = [System.IO.File]::OpenRead($Path)
        try { return ([System.BitConverter]::ToString($Hasher.ComputeHash($Stream))).Replace("-", "") }
        finally { $Stream.Dispose() }
    }
    finally { $Hasher.Dispose() }
}

function Get-RegisteredInstallRoots {
    $Keys = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    foreach ($Key in $Keys) {
        Get-ItemProperty -Path $Key -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -eq "FORGE" -or $_.DisplayName -like "FORGE *" } |
            ForEach-Object {
                if ($_.InstallLocation) { $_.InstallLocation.Trim('"') }
                elseif ($_.DisplayIcon) {
                    $IconPath = ($_.DisplayIcon -replace ',\d+$', '').Trim('"')
                    if ($IconPath) { Split-Path -Parent $IconPath }
                }
            }
    }
}

if (Get-Process -Name "FORGE" -ErrorAction SilentlyContinue) { throw "Close FORGE before installing the verified Windows update." }

& node scripts/verify-build-manifest.mjs
if ($LASTEXITCODE -ne 0) { throw "Windows build manifest verification failed with exit code $LASTEXITCODE." }
$ManifestPath = Join-Path $RepositoryRoot "dist_electron\build-manifest.json"
$BuildManifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$InstallerArtifact = $BuildManifest.artifacts | Where-Object { $_.kind -eq "nsis" } | Select-Object -First 1
if (-not $InstallerArtifact) { throw "The verified Windows build manifest does not contain an NSIS installer." }
$InstallerPath = Join-Path $RepositoryRoot $InstallerArtifact.path
if ((Get-Sha256 $InstallerPath).ToLowerInvariant() -ne $InstallerArtifact.sha256) { throw "The selected NSIS installer does not match the verified build manifest." }

$Install = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru
if ($Install.ExitCode -ne 0) { throw "The Windows installer exited with code $($Install.ExitCode)." }

$InstalledRoots = @(
    @(Get-RegisteredInstallRoots),
    (Join-Path $env:LOCALAPPDATA "Programs\forge"),
    (Join-Path $env:LOCALAPPDATA "Programs\FORGE"),
    (Join-Path $env:ProgramFiles "FORGE")
) | ForEach-Object { $_ } | Where-Object { $_ } | Select-Object -Unique
$InstalledRoot = $InstalledRoots | Where-Object {
    (Test-Path -LiteralPath (Join-Path $_ "FORGE.exe") -PathType Leaf) -and
    (Test-Path -LiteralPath (Join-Path $_ "resources\app.asar") -PathType Leaf)
} | Select-Object -First 1
if (-not $InstalledRoot) { throw "The installed FORGE runtime could not be found after the installer completed." }

& node scripts/verify-installed-windows-runtime.mjs $InstalledRoot
if ($LASTEXITCODE -ne 0) { throw "Installed Windows runtime verification failed with exit code $LASTEXITCODE." }

Write-Host "Installed and verified FORGE for Windows at $InstalledRoot."
