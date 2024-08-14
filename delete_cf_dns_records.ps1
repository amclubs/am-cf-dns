
# 配置参数
$API_TOKEN = "你的CF的API_TOKEN"
$ZONE_ID   = "你的域名ZONE_ID"

# 基础 URL
$baseUrl = "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records"

# 请求头
$headers = @{
  'Authorization' = "Bearer $API_TOKEN"
  'Content-Type'  = "application/json"
}

# 列出所有 DNS 记录
$listUrl = $baseUrl + '?per_page=500'
Write-Host $listUrl
$records = Invoke-RestMethod -Uri $listUrl -Method 'GET' -Headers $headers
$records = $records | Select-Object -ExpandProperty result

# 遍历每一条记录
foreach ($record in $records) {
  Write-Host "Deleting $($record.name) that points to $($record.content)"

  $deleteUrl = $baseUrl + '/' + $record.id
  Invoke-RestMethod -Uri $deleteUrl -Method 'DELETE' -Headers $headers
  Write-Host $deleteUrl
}
