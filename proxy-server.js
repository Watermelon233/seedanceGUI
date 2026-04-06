/**
 * 简单的代理服务器 - 避免 CORS 问题
 * 运行: node proxy-server.js
 */

const http = require('http');

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // 处理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/v1/videos') {
    // 转发到 aihubmix
    const options = {
      hostname: 'aihubmix.com',
      port: 443,
      path: '/v1/videos',
      method: 'POST',
      headers: {
        ...req.headers,
        host: 'aihubmix.com'
      }
    };

    const https = require('https');
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('代理请求错误:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/v1/videos/')) {
    // 查询任务状态
    const taskId = req.url.split('/').pop();
    const options = {
      hostname: 'aihubmix.com',
      port: 443,
      path: `/v1/videos/${taskId}`,
      method: 'GET',
      headers: {
        ...req.headers,
        host: 'aihubmix.com'
      }
    };

    const https = require('https');
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('代理请求错误:', err);
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
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`API 端点: http://localhost:${PORT}/api/v1/videos`);
});
