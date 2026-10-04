param([Parameter(Mandatory=$true)][string]$AddonBuilder, [string]$OutputDirectory="$PSScriptRoot\build\@ExtinctionRSS\addons")
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $AddonBuilder)) { throw 'Select the AddonBuilder.exe installed with DayZ Tools.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
& $AddonBuilder "$PSScriptRoot\ExtinctionRSS" $OutputDirectory '-packonly' "-include=$PSScriptRoot\addon-files.txt"
if ($LASTEXITCODE -ne 0) { throw 'DayZ Addon Builder reported a failure.' }
Write-Output "Install the built PBO with -serverMod=@ExtinctionRSS and start the companion agent. Validate on a test server first."
