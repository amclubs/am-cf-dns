#!/bin/bash

# 配置参数
API_TOKEN="你的CF的API_TOKEN"
ZONE_ID="你的域名ZONE_ID"

# 基础 URL
baseUrl="https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records"

# 请求头
headers=(
  -H "Authorization: Bearer $API_TOKEN"
  -H "Content-Type: application/json"
)

# 列出所有 DNS 记录
listUrl="$baseUrl?per_page=500"
echo "Listing DNS records from: $listUrl"
response=$(curl -s "${headers[@]}" "$listUrl")
records=$(echo "$response" | jq -r '.result[] | @base64')

# 遍历每一条记录
for record in $records; do
  _jq() {
    echo "$record" | base64 --decode | jq -r "$1"
  }

  name=$(_jq '.name')
  content=$(_jq '.content')
  id=$(_jq '.id')

  echo "Deleting $name that points to $content"

  deleteUrl="$baseUrl/$id"
  curl -s -X DELETE "${headers[@]}" "$deleteUrl"
  echo "Deleted: $deleteUrl"
done
