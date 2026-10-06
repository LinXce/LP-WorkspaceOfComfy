param(
  [switch]$Desktop
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$icon = Join-Path $root 'build\icon.ico'
$iconPng = Join-Path $root 'build\icon.png'
$target = Join-Path $root 'start.bat'

if (-not (Test-Path $icon)) { Write-Error "missing icon: $icon"; exit 1 }
if (-not (Test-Path $target)) { Write-Error "missing launcher: $target"; exit 1 }

$locations = @($root)
if ($Desktop) {
  $locations += [Environment]::GetFolderPath('Desktop')
}

$shell = New-Object -ComObject WScript.Shell

foreach ($dir in $locations) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $linkPath = Join-Path $dir 'LP-Tagger.lnk'

  $link = $shell.CreateShortcut($linkPath)
  $link.TargetPath = $target
  $link.WorkingDirectory = $root
  $link.IconLocation = "$icon,0"
  $link.Description = 'LP-Tagger'
  $link.Save()

  Write-Output "created $linkPath"
}

Write-Output "icon: $icon"
if (Test-Path $iconPng) { Write-Output "png : $iconPng" }
