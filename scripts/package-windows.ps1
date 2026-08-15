$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($env:OS -ne "Windows_NT") {
    throw "This packaging procedure must run on Windows."
}

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $RepositoryRoot

function Invoke-CheckedNative {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command exited with code $LASTEXITCODE."
    }
}

foreach ($Command in @("node", "npm")) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $Command"
    }
}

$PythonCommand = $null
foreach ($Candidate in @("py", "python")) {
    if (Get-Command $Candidate -ErrorAction SilentlyContinue) {
        $PythonCommand = $Candidate
        break
    }
}
if (-not $PythonCommand) {
    throw "Python 3 is required to build Windows native Node modules. Install Python and retry."
}

foreach ($RequiredFile in @("package.json", "package-lock.json", "scripts\prepare-node-pty.mjs")) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepositoryRoot $RequiredFile) -PathType Leaf)) {
        throw "Required project file is missing: $RequiredFile"
    }
}

# node-pty is rebuilt for Electron during Windows packaging. Fail early when the
# native C++ environment is incomplete instead of discovering it after the FORGE
# source gate has already completed.
$ProgramFilesX86 = ${env:ProgramFiles(x86)}
if (-not $ProgramFilesX86) {
    throw "ProgramFiles(x86) is unavailable; an x64 Windows build host is required."
}

$VsWhere = Join-Path $ProgramFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path -LiteralPath $VsWhere -PathType Leaf)) {
    throw "Visual Studio Build Tools were not detected. Install Visual Studio 2022 Build Tools (or Visual Studio 2022) with the Desktop development with C++ workload, then retry."
}

$VsInstallations = @(& $VsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath)
if ($LASTEXITCODE -ne 0 -or $VsInstallations.Count -eq 0) {
    throw "No Visual Studio installation with the x64/x86 C++ build tools was detected. Install the Desktop development with C++ workload, then retry."
}
$VisualStudioPath = ($VsInstallations | Select-Object -First 1).Trim()

$MsvcRoot = Join-Path $VisualStudioPath "VC\Tools\MSVC"
$MsvcToolsets = @(
    Get-ChildItem -LiteralPath $MsvcRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending
)
$MsvcToolset = $MsvcToolsets |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "bin\Hostx64\x64\cl.exe") -PathType Leaf } |
    Select-Object -First 1
if (-not $MsvcToolset) {
    throw "MSVC x64 compiler tools were not found under $MsvcRoot. Repair or modify the Visual Studio C++ workload and retry."
}

$SpectreLibrary = Join-Path $MsvcToolset.FullName "lib\spectre\x64\vcruntime.lib"
if (-not (Test-Path -LiteralPath $SpectreLibrary -PathType Leaf)) {
    throw @"
The matching x64 Spectre-mitigated MSVC libraries are missing for toolset $($MsvcToolset.Name).
Open Visual Studio Installer -> Modify -> Individual components, search for "Spectre", and install the x64/x86 Spectre-mitigated libraries that match the installed MSVC toolset (for VS 2022 this is normally the latest v143 x64/x86 Spectre component).
This prerequisite is required by node-pty and prevents MSB8040 during Electron native-module rebuilds.
"@
}

$WindowsKitsRoot = Join-Path $ProgramFilesX86 "Windows Kits\10\Lib"
$WindowsSdk = @(
    Get-ChildItem -LiteralPath $WindowsKitsRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Where-Object {
            (Test-Path -LiteralPath (Join-Path $_.FullName "ucrt\x64\ucrt.lib") -PathType Leaf) -and
            (Test-Path -LiteralPath (Join-Path $_.FullName "um\x64\kernel32.lib") -PathType Leaf)
        }
) | Select-Object -First 1
if (-not $WindowsSdk) {
    throw "A complete Windows 10/11 SDK for Desktop C++ applications was not detected. Add a Windows SDK through Visual Studio Installer and retry."
}

if ($PythonCommand -eq "py") {
    Invoke-CheckedNative "py" @("-3", "--version")
} else {
    Invoke-CheckedNative "python" @("--version")
}
Invoke-CheckedNative "node" @("--version")
Invoke-CheckedNative "npm" @("--version")

Write-Host "Windows native-build preflight passed:"
Write-Host "  Visual Studio: $VisualStudioPath"
Write-Host "  MSVC toolset:  $($MsvcToolset.Name)"
Write-Host "  Windows SDK:   $($WindowsSdk.Name)"
Write-Host "  Spectre libs:  $SpectreLibrary"

Invoke-CheckedNative "npm" @("ci")
Invoke-CheckedNative "npm" @("run", "typecheck")
Invoke-CheckedNative "npm" @("run", "lint")
Invoke-CheckedNative "npm" @("test")
Invoke-CheckedNative "npm" @("run", "package:win")

$VersionOutput = @(& node -p "require('./package.json').version")
if ($LASTEXITCODE -ne 0 -or $VersionOutput.Count -eq 0) {
    throw "Unable to read the FORGE version from package.json."
}
$Version = ($VersionOutput | Select-Object -First 1).Trim()
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
