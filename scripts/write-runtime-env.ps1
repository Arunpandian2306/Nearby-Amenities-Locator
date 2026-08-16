$rootDir = Split-Path -Parent $PSScriptRoot
$runtimeEnvPath = Join-Path $rootDir 'src\js\runtime-env.js'

function Read-DotEnvFile {
    param (
        [string]$Path
    )

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($rawLine in Get-Content $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            continue
        }

        $equalsIndex = $line.IndexOf('=')
        if ($equalsIndex -lt 0) {
            continue
        }

        $key = $line.Substring(0, $equalsIndex).Trim()
        $value = $line.Substring($equalsIndex + 1).Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

$envFiles = @(
    (Join-Path $rootDir '.env.local'),
    (Join-Path $rootDir '.env')
)

$fileEnv = @{}
foreach ($envFile in $envFiles) {
    $fileEnv = Read-DotEnvFile -Path $envFile
    if ($fileEnv.ContainsKey('GEMINI_API_KEY') -and $fileEnv['GEMINI_API_KEY']) {
        break
    }
}

$geminiApiKey = $env:GEMINI_API_KEY
if (-not $geminiApiKey -and $fileEnv.ContainsKey('GEMINI_API_KEY')) {
    $geminiApiKey = $fileEnv['GEMINI_API_KEY']
}

if ($geminiApiKey -and $geminiApiKey -match '^(your_.*|placeholder.*|change_me.*)$') {
    $geminiApiKey = ''
}

if ($null -eq $geminiApiKey) {
    $geminiApiKey = ''
}

$runtimeSource = 'window.__APP_ENV__ = Object.freeze(' + (@{ GEMINI_API_KEY = $geminiApiKey } | ConvertTo-Json -Compress) + ");`r`n"
Set-Content -Path $runtimeEnvPath -Value $runtimeSource -Encoding UTF8 -NoNewline

if ($geminiApiKey) {
    Write-Host 'Wrote src/js/runtime-env.js from GEMINI_API_KEY.'
} else {
    Write-Host 'Wrote src/js/runtime-env.js without GEMINI_API_KEY. Set the env var or .env file to enable chat.'
}
