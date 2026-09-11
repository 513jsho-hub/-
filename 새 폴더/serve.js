// 의존성 설치 없이(node_modules 없이) 정적 파일 + 예약 데이터 API를 제공하는 작은 서버
// 실행: node serve.js
// 같은 와이파이의 다른 기기에서 접속하려면: http://<이 컴퓨터의 IP>:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function defaultData() {
  return { adminPassword: '1234', booths: [] };
}

function readData(cb) {
  fs.readFile(DATA_FILE, 'utf8', (err, content) => {
    if (err) {
      const initial = defaultData();
      fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), () => cb(initial));
      return;
    }
    try {
      cb(JSON.parse(content));
    } catch (e) {
      const initial = defaultData();
      fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), () => cb(initial));
    }
  });
}

function serveStatic(req, res, urlPath) {
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/api/data' && req.method === 'GET') {
    readData((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (urlPath === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: '잘못된 JSON' }));
      }
    });
    return;
  }

  serveStatic(req, res, urlPath);
});

server.listen(PORT, () => {
  const nets = require('os').networkInterfaces();
  console.log(`축제부스 예약 사이트 실행 중`);
  console.log(`- 내 컴퓨터에서: http://localhost:${PORT}`);
  Object.values(nets).flat().forEach((net) => {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`- 같은 와이파이의 다른 기기에서: http://${net.address}:${PORT}`);
    }
  });
});
