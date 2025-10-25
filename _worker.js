export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // -----------------------
    // 1️⃣ API 请求处理
    // -----------------------
    if (url.pathname === '/ssl' && request.method === 'POST') {
      return handleSSLApi(request);
    }

    // -----------------------
    // 2️⃣ 返回 HTML 页面
    // -----------------------
    return new Response(renderPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

async function handleSSLApi(request) {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { email, zoneId: zone_id, apikey: api_key, enabled = true, ca: certificate_authority = 'ssl_com' } = body;

    // 简单验证
    if (!email || !zone_id || !api_key) {
      return createJSONResponse({ success: false, errors: ['邮箱、区域ID、API密钥都不能为空'] }, 400);
    }
    if (!validateEmail(email)) {
      return createJSONResponse({ success: false, errors: ['邮箱格式不正确'] }, 400);
    }

    // 调用 Cloudflare API
    const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id}/ssl/universal/settings`, {
      method: 'PATCH',
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled, certificate_authority }),
    });

    const result = await cfRes.json();

    if (!cfRes.ok || !result.success) {
      return createJSONResponse({ success: false, errors: result.errors || [{ message: 'Cloudflare API调用失败' }] }, cfRes.status);
    }

    return createJSONResponse(result);

  } catch (error) {
    return createJSONResponse({ success: false, errors: [{ message: `请求失败: ${error.message || '未知错误'}` }] }, 500);
  }

  function createJSONResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}


function renderPage() {
  return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare Universal SSL 控制面板</title>
    <style>
      body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; padding: 20px; }
      .container { max-width: 500px; margin: auto; background: #fff; padding: 30px 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      h2 { text-align: center; margin-bottom: 25px; color: #333; }
      input, select, button { width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; }
      input:focus, select:focus { outline: none; border-color: #3498db; box-shadow: 0 0 5px rgba(52,152,219,0.3); }
      button { background: #3498db; color: #fff; border: none; cursor: pointer; transition: background 0.2s; }
      button:hover { background: #2980b9; }
      button:disabled { background: #95a5a6; cursor: not-allowed; }
      .result { padding: 12px; border-radius: 6px; display: none; margin-top: 15px; word-break: break-word; }
      .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
    </head>
    <body>
    <div class="container">
      <h2>🔐 Cloudflare SSL 控制面板</h2>
      <form id="sslform">
        <label>📧 Cloudflare 邮箱:</label>
        <input type="email" id="email" placeholder="user@example.com" required>
        
        <label>🌐 Zone ID:</label>
        <input type="text" id="zoneid" placeholder="区域 ID" required>
        
        <label>🔑 Global API Key:</label>
        <input type="text" id="apikey" placeholder="API Key" required>
        
        <button type="submit" id="submitBtn">🚀 提交更新SSL证书</button>
      </form>
      <div class="result" id="resultMsg"></div>
    </div>
    
    <script>
    const sslform = document.getElementById('sslform');
    const resultMsg = document.getElementById('resultMsg');
    const submitBtn = document.getElementById('submitBtn');
    
    sslform.addEventListener('submit', async e => {
      e.preventDefault();
      resultMsg.style.display='none';
      const email = document.getElementById('email').value.trim();
      const zoneId = document.getElementById('zoneid').value.trim();
      const apikey = document.getElementById('apikey').value.trim();
    
      if(!email || !zoneId || !apikey){ 
        alert('请填写完整信息'); 
        return; 
      }
    
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 提交中...';
    
      try {
        const res = await fetch('/ssl',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({email, zoneId, apikey})
        });
        const data = await res.json();
        if(data.success){
          showResult('证书添加成功！请稍后在Cloudflare的SSL/TLS的边缘证书查看', true);
        } else {
          showResult('添加失败: ' + JSON.stringify(data.errors), false);
        }
      } catch(err){
        showResult('请求失败: ' + err, false);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 提交更新SSL证书';
      }
    });
    
    function showResult(msg, success){
      resultMsg.textContent = msg;
      resultMsg.className = 'result ' + (success ? 'success' : 'error');
      resultMsg.style.display = 'block';
      resultMsg.scrollIntoView({behavior:'smooth'});
    }
    </script>
    </body>
    </html>`;
}
