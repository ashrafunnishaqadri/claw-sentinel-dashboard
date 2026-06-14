# ============================================
# ClawSentinel REST API Test Script
# Run with: powershell -ExecutionPolicy Bypass -File test_api.ps1
# Make sure server.py is running first!
# ============================================

$BASE_URL = "http://localhost:8000"

function Print-Header($title) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
}

function Test-GET($endpoint) {
    Print-Header "GET $endpoint"
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL$endpoint" -Method GET
        $json = $response.Content | ConvertFrom-Json
        Write-Host "STATUS: $($response.StatusCode) OK" -ForegroundColor Green
        Write-Host "RESPONSE:" -ForegroundColor Yellow
        $json | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

function Test-POST($endpoint, $body) {
    Print-Header "POST $endpoint"
    try {
        $json_body = $body | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$BASE_URL$endpoint" -Method POST `
            -ContentType "application/json" -Body $json_body
        $json = $response.Content | ConvertFrom-Json
        Write-Host "STATUS: $($response.StatusCode) OK" -ForegroundColor Green
        Write-Host "RESPONSE:" -ForegroundColor Yellow
        $json | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

# ================================================
# GET ENDPOINT TESTS (8 dedicated endpoints)
# ================================================

# TEST 1: Critical CVEs count
Test-GET "/api/critical-cves"

# TEST 2: High risk nodes count
Test-GET "/api/high-risk-nodes"

# TEST 3: Average risk score + sparkline
Test-GET "/api/avg-risk-score"

# TEST 4: Open incident responses
Test-GET "/api/open-responses"

# TEST 5: Patch compliance rate + trend data
Test-GET "/api/patch-compliance"

# TEST 6: Risk score distribution (doughnut chart data)
Test-GET "/api/risk-distribution"

# TEST 7: Top CVEs by risk score
Test-GET "/api/top-cves"

# TEST 8: Top risky assets (sorted by score desc)
Test-GET "/api/top-risky-assets"

# TEST 9: Full dashboard snapshot (legacy endpoint)
Test-GET "/api/dashboard"

# ================================================
# POST ENDPOINT TESTS
# ================================================

# TEST 10: POST Refresh (live score update)
Test-POST "/api/refresh" @{}

# TEST 11: POST Mitigate an Asset
Test-POST "/api/mitigate" @{
    assetName = "GPU-88"
    cve       = "CVE-2024-1102"
}

# TEST 12: POST Update Prioritization Count
Test-POST "/api/prioritization-count" @{
    count = 5
}

# TEST 13: POST Generate Report
Test-POST "/api/generate-report" @{
    type      = "executive"
    scope     = "all"
    incKpi    = $true
    incCharts = $true
    incTable  = $true
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  All API Tests Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green


function Test-POST($endpoint, $body) {
    Print-Header "POST $endpoint"
    try {
        $json_body = $body | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$BASE_URL$endpoint" -Method POST `
            -ContentType "application/json" -Body $json_body
        $json = $response.Content | ConvertFrom-Json
        Write-Host "STATUS: $($response.StatusCode) OK" -ForegroundColor Green
        Write-Host "RESPONSE:" -ForegroundColor Yellow
        $json | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

# ---- TEST 1: GET Dashboard Data ----
Test-GET "/api/dashboard"

# ---- TEST 2: POST Refresh (live score update) ----
Test-POST "/api/refresh" @{}

# ---- TEST 3: POST Mitigate an Asset ----
Test-POST "/api/mitigate" @{
    assetName = "GPU-88"
    cve       = "CVE-2024-1102"
}

# ---- TEST 4: POST Update Prioritization Count ----
Test-POST "/api/prioritization-count" @{
    count = 5
}

# ---- TEST 5: POST Generate Report ----
Test-POST "/api/generate-report" @{
    type      = "executive"
    scope     = "all"
    incKpi    = $true
    incCharts = $true
    incTable  = $true
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  All API Tests Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
