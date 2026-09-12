[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Container })]
  [string]$MapWzDirectory,

  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string]$WzLibPath,

  [string]$ManifestPath = (Join-Path $PSScriptRoot '..\..\public\themes\upon-the-sky\map-200090010.json'),

  [switch]$Write
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ChildNode {
  param(
    [Parameter(Mandatory = $true)]$Node,
    [Parameter(Mandatory = $true)][string]$Text
  )

  return @($Node.Nodes | Where-Object { $_.Text -eq $Text }) | Select-Object -First 1
}

function Resolve-OutlinkNode {
  param(
    [Parameter(Mandatory = $true)]$RootNode,
    [Parameter(Mandatory = $true)]$FrameNode
  )

  $outlinkNode = Get-ChildNode -Node $FrameNode -Text '_outlink'
  if ($null -eq $outlinkNode -or [string]::IsNullOrWhiteSpace([string]$outlinkNode.Value)) {
    return $FrameNode
  }

  $resolvedPath = ([string]$outlinkNode.Value -replace '/', '\') -replace '^Map[\\/]', ''
  $resolvedNode = $RootNode.FindNodeByPath($resolvedPath, $true)
  if ($null -eq $resolvedNode -or $resolvedNode.FullPath -eq $RootNode.FullPath) {
    throw "Unable to resolve _outlink '$($outlinkNode.Value)' from '$($FrameNode.FullPath)'."
  }

  return $resolvedNode
}

function Get-ResolvedFrameMetadata {
  param(
    [Parameter(Mandatory = $true)]$RootNode,
    [Parameter(Mandatory = $true)]$FrameNode
  )

  # In these WZ nodes, _outlink redirects the pixel payload to Obj/_Canvas;
  # the authoritative anchor remains metadata on the logical frame. If future
  # data stores the anchor on the resolved payload instead, accept that too.
  $resolvedNode = Resolve-OutlinkNode -RootNode $RootNode -FrameNode $FrameNode
  $originNode = Get-ChildNode -Node $FrameNode -Text 'origin'
  if ($null -eq $originNode) {
    $originNode = Get-ChildNode -Node $resolvedNode -Text 'origin'
  }

  $png = $resolvedNode.Value
  if ($null -eq $png -or $null -eq $png.Width -or $null -eq $png.Height) {
    throw "Resolved frame '$($resolvedNode.FullPath)' does not contain a PNG payload."
  }

  $usedCenterFallback = $false
  if ($null -ne $originNode) {
    $originX = [int]$originNode.Value.X
    $originY = [int]$originNode.Value.Y
  }
  else {
    $usedCenterFallback = $true
    $originX = [int][Math]::Floor([double]$png.Width / 2)
    $originY = [int][Math]::Floor([double]$png.Height / 2)
    Write-Warning "WZ origin is missing for '$($FrameNode.FullPath)' after resolving '$($resolvedNode.FullPath)'; using image center $originX,$originY."
  }

  return [pscustomobject]@{
    OriginX = $originX
    OriginY = $originY
    Width = [int]$png.Width
    Height = [int]$png.Height
    UsedCenterFallback = $usedCenterFallback
    ResolvedPath = $resolvedNode.FullPath
  }
}

$resolvedManifestPath = (Resolve-Path -LiteralPath $ManifestPath).Path
Add-Type -Path (Resolve-Path -LiteralPath $WzLibPath).Path

$structure = New-Object WzComparerR2.WzLib.Wz_Structure
$rootNode = New-Object WzComparerR2.WzLib.Wz_Node('Map')
$structure.LoadWzFolder((Resolve-Path -LiteralPath $MapWzDirectory).Path, [ref]$rootNode, $false)

$manifest = Get-Content -LiteralPath $resolvedManifestPath -Raw | ConvertFrom-Json
$warnings = 0
$changes = 0

foreach ($layer in $manifest.objects.layers) {
  foreach ($mapObject in $layer.objects) {
    if ($mapObject.oS -ne 'vehicle' -or $mapObject.l0 -ne 'ship' -or $mapObject.l1 -ne 'ossyria') {
      continue
    }

    $objectPath = "Obj\vehicle.img\ship\ossyria\$($mapObject.l2)"
    $objectNode = $rootNode.FindNodeByPath($objectPath, $true)
    if ($null -eq $objectNode -or $objectNode.FullPath -eq $rootNode.FullPath) {
      throw "Unable to find '$objectPath'."
    }

    $frameNodes = @($objectNode.Nodes | Sort-Object { [int]$_.Text })
    if ($frameNodes.Count -eq 0) {
      throw "Object '$objectPath' has no frames."
    }

    $framesProperty = $mapObject.PSObject.Properties['frames']
    if ($null -ne $framesProperty -and @($framesProperty.Value).Count -gt 0) {
      $manifestFrames = @($framesProperty.Value)
      if ($manifestFrames.Count -ne $frameNodes.Count) {
        throw "Frame count mismatch for '$objectPath': manifest=$($manifestFrames.Count), WZ=$($frameNodes.Count)."
      }

      for ($frameIndex = 0; $frameIndex -lt $frameNodes.Count; $frameIndex += 1) {
        $metadata = Get-ResolvedFrameMetadata -RootNode $rootNode -FrameNode $frameNodes[$frameIndex]
        $manifestFrame = $manifestFrames[$frameIndex]
        if ($metadata.UsedCenterFallback) { $warnings += 1 }
        if ($manifestFrame.origin.x -ne $metadata.OriginX -or $manifestFrame.origin.y -ne $metadata.OriginY) {
          Write-Output "layer=$($layer.layer) l2=$($mapObject.l2) frame=$frameIndex origin $($manifestFrame.origin.x),$($manifestFrame.origin.y) -> $($metadata.OriginX),$($metadata.OriginY)"
          $manifestFrame.origin.x = $metadata.OriginX
          $manifestFrame.origin.y = $metadata.OriginY
          $changes += 1
        }
        $manifestFrame.width = $metadata.Width
        $manifestFrame.height = $metadata.Height
      }
    }
    else {
      $metadata = Get-ResolvedFrameMetadata -RootNode $rootNode -FrameNode $frameNodes[0]
      if ($metadata.UsedCenterFallback) { $warnings += 1 }
      if ($mapObject.origin.x -ne $metadata.OriginX -or $mapObject.origin.y -ne $metadata.OriginY) {
        Write-Output "layer=$($layer.layer) l2=$($mapObject.l2) origin $($mapObject.origin.x),$($mapObject.origin.y) -> $($metadata.OriginX),$($metadata.OriginY)"
        $mapObject.origin.x = $metadata.OriginX
        $mapObject.origin.y = $metadata.OriginY
        $changes += 1
      }
    }
  }
}

Write-Output "Origin audit complete: changes=$changes warnings=$warnings"

if ($Write) {
  $json = $manifest | ConvertTo-Json -Depth 32
  [System.IO.File]::WriteAllText(
    $resolvedManifestPath,
    $json + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
  )
  Write-Output "Updated manifest: $resolvedManifestPath"
}
