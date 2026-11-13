import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const PORT = parseInt(process.env.DEBUGGER_PORT || '4020', 10);
const sseClients: http.ServerResponse[] = [];
const eventHistory: any[] = [];

const server = http.createServer((req, res) => {
  const url = req.url || '';

  // 1. SSE Stream
  if (url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    sseClients.push(res);

    // Send existing history
    for (const ev of eventHistory.slice(-20)) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
    return;
  }

  // 2. Event Ingestion API
  if (url === '/api/event' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        eventHistory.push(parsed);
        // Broadcast to all connected browsers
        const payload = `data: ${JSON.stringify(parsed)}\n\n`;
        sseClients.forEach(c => c.write(payload));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. Clear History API
  if (url === '/api/clear' && req.method === 'POST') {
    eventHistory.length = 0;
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ step: 'SYSTEM_RESET', details: {} })}\n\n`));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 4. Static Frontend
  const filePath = url === '/' || url === '' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n============================================================`);
  console.log(`  NEAR Pay Visual Payment Inspector & Debugger              `);
  console.log(`  Dashboard:  http://127.0.0.1:${PORT}                       `);
  console.log(`============================================================\n`);
});

