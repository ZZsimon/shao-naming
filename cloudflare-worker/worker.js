/**
 * Cloudflare Worker · 反向代理 shao-naming.vercel.app
 *
 * 作用：把对你自有域名的访问，转发到 Vercel 站点，
 *       让国内用户经由 Cloudflare 优选节点访问，绕开 vercel.app 在大陆的限速。
 *
 * 用法：
 *   1. 在 Cloudflare → Workers & Pages 新建 Worker，把本文件内容整段粘贴进去；
 *   2. 部署后，在 Triggers 给它绑定你的自定义域名（见 README 步骤）。
 *
 * 如果以后换了 Vercel 地址或自定义源域名，只改下面这一行即可。
 */
const TARGET_HOST = 'shao-naming.vercel.app';
const TARGET_URL = `https://${TARGET_HOST}`;

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);

    // 预检请求直接放行
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // 复制请求头，并把 Host / Origin / Referer 改写成目标站点
    const headers = new Headers(request.headers);
    headers.set('Host', TARGET_HOST);
    if (headers.has('Origin')) headers.set('Origin', TARGET_URL);
    if (headers.has('Referer')) {
      try {
        const r = new URL(headers.get('Referer'));
        headers.set('Referer', `${TARGET_URL}${r.pathname}${r.search}`);
      } catch (_) {}
    }

    const requestOptions = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestOptions.body = await request.clone().arrayBuffer();
    }

    const targetUrl = `${TARGET_URL}${url.pathname}${url.search}`;
    const response = await fetch(targetUrl, requestOptions);

    // 处理重定向：把指向目标站点的跳转改写回当前代理域名
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location') || '';
      const respHeaders = new Headers(response.headers);
      applyCors(respHeaders);
      if (location.startsWith(TARGET_URL)) {
        respHeaders.set('Location', location.replace(TARGET_URL, url.origin));
      } else if (location.startsWith('//' + TARGET_HOST)) {
        respHeaders.set('Location', location.replace('//' + TARGET_HOST, '//' + url.hostname));
      }
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    }

    const respHeaders = new Headers(response.headers);
    applyCors(respHeaders);

    const contentType = respHeaders.get('content-type') || '';
    const isText =
      contentType.includes('text/html') ||
      contentType.includes('javascript') ||
      contentType.includes('text/css') ||
      contentType.includes('application/json') ||
      contentType.includes('xml');

    // 文本类响应：把内嵌的目标站点绝对地址改写成代理域名
    if (isText) {
      const text = await response.text();
      const rewritten = rewriteUrls(text, url.origin);
      return new Response(rewritten, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    }

    // 二进制（图片/字体/视频等）原样转发
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (error) {
    return new Response(`代理请求失败: ${error.message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

function rewriteUrls(content, proxyOrigin) {
  const escHost = TARGET_HOST.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escUrl = TARGET_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const proxyHost = new URL(proxyOrigin).hostname;
  return content
    .replace(new RegExp(escUrl, 'g'), proxyOrigin)
    .replace(new RegExp(`//${escHost}(?![\\w.])`, 'g'), `//${proxyHost}`);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function applyCors(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.delete('Content-Security-Policy');
  headers.delete('X-Frame-Options');
}
