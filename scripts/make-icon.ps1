$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$bg = [System.Drawing.ColorTranslator]::FromHtml('#F2EFEA')
$inks = @(
  [System.Drawing.ColorTranslator]::FromHtml('#2A8FCE'),
  [System.Drawing.ColorTranslator]::FromHtml('#F1EEE9'),
  [System.Drawing.ColorTranslator]::FromHtml('#1C4E6E'),
  [System.Drawing.ColorTranslator]::FromHtml('#A8D74F')
)

function New-RoundedPath {
  param([single]$X, [single]$Y, [single]$W, [single]$H, [single]$R)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $R * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-MarkBitmap {
  param([int]$Size)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)

  [single]$s = $Size / 512.0
  $bgPath = New-RoundedPath -X 0 -Y 0 -W $Size -H $Size -R ([single](112 * $s))
  $bgBrush = New-Object System.Drawing.SolidBrush($bg)
  $g.FillPath($bgBrush, $bgPath)
  $bgBrush.Dispose()
  $bgPath.Dispose()

  $centers = @(106, 206, 306, 406)
  [single]$radius = 78

  for ($i = 0; $i -lt 4; $i++) {
    $brush = New-Object System.Drawing.SolidBrush($inks[$i])
    [single]$x = ($centers[$i] - $radius) * $s
    [single]$y = (256 - $radius) * $s
    [single]$d = 2 * $radius * $s
    $g.FillEllipse($brush, $x, $y, $d, $d)
    $brush.Dispose()
  }

  $g.Dispose()
  return $bmp
}

$png = New-MarkBitmap -Size 512
$png.Save((Join-Path $buildDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()

$sizes = @(256, 128, 64, 48, 32, 16)
$blobs = @()

foreach ($size in $sizes) {
  $bmp = New-MarkBitmap -Size $size
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $blobs += , @{ Size = $size; Data = $ms.ToArray() }
  $ms.Dispose()
  $bmp.Dispose()
}

$icoPath = Join-Path $buildDir 'icon.ico'
$stream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter($stream)

$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$blobs.Count)

$offset = 6 + (16 * $blobs.Count)
foreach ($blob in $blobs) {
  $dim = [int]$blob.Size
  if ($dim -ge 256) { $dim = 0 }
  $writer.Write([Byte]$dim)
  $writer.Write([Byte]$dim)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$blob.Data.Length)
  $writer.Write([UInt32]$offset)
  $offset += $blob.Data.Length
}
foreach ($blob in $blobs) { $writer.Write($blob.Data) }

$writer.Flush()
$writer.Dispose()
$stream.Dispose()

Write-Output "wrote build/icon.png (512x512) and build/icon.ico ($($blobs.Count) sizes)"
