/**
 * 代理服务器 - 避免 CORS 问题
 * 运行: node proxy-server.cjs
 */

const http = require('http');
const https = require('https');

const PORT = 3002;
const TIMEOUT = 10 * 60 * 1000; // 10分钟超时，支持大文件上传

const server = http.createServer(async (req, res) => {
  // 处理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/v1/videos') {
    console.log('[代理] POST /api/v1/videos');
    console.log('[代理] Headers:', JSON.stringify(req.headers, null, 2));

    // 收集请求体以便记录大小
    let requestBodySize = 0;
    req.on('data', (chunk) => {
      requestBodySize += chunk.length;
    });

    // 转发到 aihubmix
    const options = {
      hostname: 'aihubmix.com',
      port: 443,
      path: '/v1/videos',
      method: 'POST',
      headers: {
        ...req.headers,
        host: 'aihubmix.com',
        'Content-Length': req.headers['content-length'] // 保持原始长度
      },
      timeout: TIMEOUT
    };

    console.log('[代理] 转发请求到 aihubmix.com');

    const proxyReq = https.request(options, (proxyRes) => {
      console.log('[代理] 响应状态:', proxyRes.statusCode);
      console.log('[代理] 响应头:', JSON.stringify(proxyRes.headers, null, 2));

      // 处理响应
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);

      proxyRes.on('end', () => {
        console.log('[代理] 响应传输完成');
      });
    });

    // 设置超时
    proxyReq.setTimeout(TIMEOUT, () => {
      console.error('[代理] 请求超时');
      proxyReq.destroy();
      res.writeHead(408);
      res.end(JSON.stringify({ error: 'Request timeout' }));
    });

    proxyReq.on('error', (err) => {
      console.error('[代理] 请求错误:', err.message);
      console.error('[代理] 错误详情:', err);

      // 处理 socket hang up
      if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        res.writeHead(502);
        res.end(JSON.stringify({
          error: 'Connection reset by upstream server. The request may be too large or the server may be unavailable.'
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    proxyReq.on('socket', () => {
      console.log('[代理] Socket 已连接');
    });

    proxyReq.on('finish', () => {
      console.log('[代理] 请求发送完成, 大小:', requestBodySize, 'bytes (', (requestBodySize / 1024).toFixed(2), 'KB)');
    });

    req.pipe(proxyReq);
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/v1/videos/')) {
    const taskId = req.url.split('/').pop();
    console.log('[代理] GET /api/v1/videos/' + taskId);

    const options = {
      hostname: 'aihubmix.com',
      port: 443,
      path: `/v1/videos/${taskId}`,
      method: 'GET',
      headers: {
        ...req.headers,
        host: 'aihubmix.com'
      },
      timeout: TIMEOUT
    };

    const proxyReq = https.request(options, (proxyRes) => {
      console.log('[代理] 响应状态:', proxyRes.statusCode);
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.setTimeout(TIMEOUT, () => {
      proxyReq.destroy();
      res.writeHead(408);
      res.end(JSON.stringify({ error: 'Request timeout' }));
    });

    proxyReq.on('error', (err) => {
      console.error('[代理] GET 请求错误:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`════════════════════════════════════════════════════════════════`);
  console.log(`🚀 代理服务器已启动`);
  console.log(`════════════════════════════════════════════════════════════════`);
  console.log(`本地地址: http://localhost:${PORT}`);
  console.log(`API 端点:  http://localhost:${PORT}/api/v1/videos`);
  console.log(`超时时间:  ${TIMEOUT / 1000} 秒`);
  console.log(`════════════════════════════════════════════════════════════════`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[代理] 收到 SIGTERM，正在关闭...');
  server.close(() => {
    console.log('[代理] 服务器已关闭');
    process.exit(0);
  });
});
