import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const PORT = parseInt(process.env.DASHBOARD_PORT || '3001', 10);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get('/health', (req, res) => {
  res.json({ status: 'ONLINE', service: 'NEAR x402 Gateway Dashboard', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEAR x402 Dashboard] Running at http://localhost:${PORT}`);
});
