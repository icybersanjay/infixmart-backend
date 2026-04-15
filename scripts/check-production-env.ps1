$ErrorActionPreference = "Stop"

$envFiles = @(
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local"
)

$values = @{}

foreach ($file in $envFiles) {
  $fullPath = Join-Path (Get-Location) $file
  if (-not (Test-Path -LiteralPath $fullPath)) {
    continue
  }

  foreach ($line in Get-Content -LiteralPath $fullPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf("=")
    if ($separatorIndex -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    $value = $trimmed.Substring($separatorIndex + 1).Trim()
    $values[$key] = $value
  }
}

Get-ChildItem Env: | ForEach-Object {
  $values[$_.Name] = $_.Value
}

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Get-Value([string]$key) {
  if ($values.ContainsKey($key)) {
    return [string]$values[$key]
  }

  return ""
}

function Add-Error([string]$message) {
  $errors.Add($message)
}

function Add-Warning([string]$message) {
  $warnings.Add($message)
}

function Test-Placeholder([string]$value) {
  $normalized = $value.Trim().ToLowerInvariant()
  if (-not $normalized) { return $true }

  return $normalized.Contains("yourdomain") -or
    $normalized.Contains("your_database") -or
    $normalized.Contains("replace_with") -or
    $normalized.Contains("chooseaverystrongpasswordhere") -or
    $normalized.Contains("xxxxxxxx") -or
    $normalized.Contains("your_")
}

$requiredKeys = @(
  "FRONTEND_URL",
  "FRONTEND_URL_WWW",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SITE_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "JWT_SECRET",
  "JWT_SECRET_ACCESS_TOKEN",
  "JWT_SECRET_REFRESH_TOKEN",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID"
)

foreach ($key in $requiredKeys) {
  if (-not (Get-Value $key).Trim()) {
    Add-Error "Missing required env: $key"
  }
}

function Test-ProductionUrl([string]$key) {
  $value = (Get-Value $key).Trim()
  if (-not $value) {
    return
  }

  $uri = $null
  $isValid = [System.Uri]::TryCreate($value, [System.UriKind]::Absolute, [ref]$uri)
  if (-not $isValid -or -not $uri) {
    Add-Error "$key must be a valid absolute URL"
    return
  }

  if ($uri.Scheme -ne "https") {
    Add-Error "$key must use https in production"
  }

  $urlHost = $uri.Host.ToLowerInvariant()
  if ($urlHost -eq "localhost" -or $urlHost -eq "127.0.0.1") {
    Add-Error "$key cannot point to localhost in production"
  }
}

@(
  "FRONTEND_URL",
  "FRONTEND_URL_WWW",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SITE_URL"
) | ForEach-Object { Test-ProductionUrl $_ }

foreach ($key in @("JWT_SECRET", "JWT_SECRET_ACCESS_TOKEN", "JWT_SECRET_REFRESH_TOKEN", "PAYMENT_STATE_SECRET")) {
  $value = (Get-Value $key).Trim()
  if (-not $value) {
    if ($key -eq "PAYMENT_STATE_SECRET") {
      Add-Warning "PAYMENT_STATE_SECRET is not set; confirm payment state protection is configured"
    }
    continue
  }

  if (Test-Placeholder $value) {
    Add-Error "$key is still using a placeholder value"
  } elseif ($value.Length -lt 64) {
    Add-Warning "$key should be at least 64 characters"
  }
}

foreach ($key in @("RAZORPAY_KEY_ID", "NEXT_PUBLIC_RAZORPAY_KEY_ID")) {
  $value = (Get-Value $key).Trim()
  if (-not $value) {
    continue
  }

  if (Test-Placeholder $value) {
    Add-Error "$key is still using a placeholder value"
  } elseif ($value.StartsWith("rzp_test_")) {
    Add-Warning "$key is using a Razorpay test key"
  }
}

foreach ($key in @("ADMIN_EMAIL", "ADMIN_PASSWORD", "RAZORPAY_KEY_SECRET")) {
  $value = (Get-Value $key).Trim()
  if ($value -and (Test-Placeholder $value)) {
    Add-Error "$key is still using a placeholder value"
  }
}

if ((Get-Value "COOKIE_SECURE").Trim().ToLowerInvariant() -eq "false") {
  Add-Error "COOKIE_SECURE must not be false in production"
}

if ((Get-Value "NODE_ENV").Trim() -and (Get-Value "NODE_ENV").Trim().ToLowerInvariant() -ne "production") {
  Add-Warning "NODE_ENV is not set to production"
}

$frontendUrl = (Get-Value "FRONTEND_URL").Trim()
$publicSiteUrl = (Get-Value "NEXT_PUBLIC_SITE_URL").Trim()
if ($frontendUrl -and $publicSiteUrl -and $frontendUrl -ne $publicSiteUrl) {
  Add-Warning "FRONTEND_URL and NEXT_PUBLIC_SITE_URL differ; confirm this is intentional"
}

$dbPassword = Get-Value "DB_PASSWORD"
if ($dbPassword -and $dbPassword.Length -lt 12) {
  Add-Warning "DB_PASSWORD looks short; use a stronger production password"
}

if (-not (Get-Value "NEXT_PUBLIC_GOOGLE_CLIENT_ID").Trim()) {
  Add-Warning "NEXT_PUBLIC_GOOGLE_CLIENT_ID is empty; Google login will be unavailable"
}

if (-not (Get-Value "SMTP_HOST").Trim()) {
  Add-Warning "SMTP_HOST is empty; email features will be unavailable"
}

if (-not (Get-Value "ALLOWED_ORIGINS").Trim()) {
  Add-Warning "ALLOWED_ORIGINS is empty; relying only on derived frontend URLs"
}

if ($errors.Count -gt 0) {
  Write-Host "Production env check failed:`n" -ForegroundColor Red
  foreach ($message in $errors) {
    Write-Host "- $message" -ForegroundColor Red
  }

  if ($warnings.Count -gt 0) {
    Write-Host "`nWarnings:" -ForegroundColor Yellow
    foreach ($message in $warnings) {
      Write-Host "- $message" -ForegroundColor Yellow
    }
  }

  exit 1
}

Write-Host "Production env check passed." -ForegroundColor Green

if ($warnings.Count -gt 0) {
  Write-Host "`nWarnings:" -ForegroundColor Yellow
  foreach ($message in $warnings) {
    Write-Host "- $message" -ForegroundColor Yellow
  }
}
