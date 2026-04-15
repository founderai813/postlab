// Cloudflare Worker — Gemini API Proxy
// 部署後在 Cloudflare Dashboard 設定環境變數：
//   GEMINI_API_KEY  — 你的 Gemini API Key
//   ALLOWED_ORIGIN  — 你的前端網址，例如 https://founderai813.github.io（選填，預設允許所有來源）

// 簡易 Rate Limit（每個 IP 每分鐘最多 15 次）
const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipHits.get(ip);
  if (!record || now - record.start > RATE_WINDOW) {
    ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  record.count++;
  return record.count > RATE_LIMIT;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const requestOrigin = request.headers.get('Origin') || '*';

    // 檢查 Origin（如果有設定 ALLOWED_ORIGIN）
    if (allowedOrigin !== '*' && requestOrigin !== allowedOrigin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const origin = allowedOrigin !== '*' ? allowedOrigin : requestOrigin;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { ...corsHeaders(origin), 'Access-Control-Max-Age': '86400' },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // Rate Limit
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // API Key
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    try {
      const body = await request.json();

      // 驗證請求結構
      if (!body.contents || !Array.isArray(body.contents) || !body.contents[0]?.parts) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      // 限制 prompt 長度（防止濫用）
      const text = body.contents[0].parts[0]?.text || '';
      if (text.length > 5000) {
        return new Response(JSON.stringify({ error: 'Prompt too long' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
