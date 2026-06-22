# עדכון כתובת Web App ב-config.json + order-api.json
# הרץ: .\setup\update-order-api.ps1
# ואז הדבק את כתובת ה-Web App (Ctrl+V) ולחץ Enter

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'config.json'
$orderApiPath = Join-Path $root 'order-api.json'

Write-Host 'הדבק כתובת Web App (script.google.com/.../exec):' -ForegroundColor Cyan
$url = (Get-Clipboard).Trim()

if ($url -notmatch 'script\.google\.com/macros/s/.+/exec') {
    Write-Host 'כתובת לא תקינה. העתק מ-Apps Script -> Deploy -> Web app URL' -ForegroundColor Red
    exit 1
}

$orderApi = @{ enabled = $true; url = $url } | ConvertTo-Json
Set-Content -Path $orderApiPath -Value $orderApi -Encoding UTF8

$config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $config.orderApi) { $config | Add-Member -NotePropertyName orderApi -NotePropertyValue @{} }
$config.orderApi.enabled = $true
$config.orderApi.url = $url
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host 'עודכן config.json + order-api.json' -ForegroundColor Green
