import express from 'express';
import cors from 'cors';
import { PRICING_TABLE } from './pricing.js';
import { x402PaymentMiddleware } from './middleware.js';
import { RpcProxy } from './proxy.js';
import { RangeManager } from './range.js';

const PORT = parseInt(process.env.GATEWAY_PORT || '4021', 10);
const app = express();

app.use(cors());
app.use(express.json());

// Service status
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'NEAR Historical Data x402 Gateway',
    port: PORT,
    protocols: ['x402'],
    network: 'near-mainnet',
    endpoints: {
      rpc: '/rpc',
      pricing: '/pricing',
      purchaseRange: '/purchase-range'
    }
  });
});

// Method pricing directory
app.get('/pricing', (req, res) => {
  res.json({
    currency: 'NEAR',
    unit: 'yoctoNEAR (1e24)',
    methods: PRICING_TABLE
  });
});

// Range-Based Payment Batching Endpoint
app.post('/purchase-range', async (req, res) => {
  try {
    const result = await RangeManager.purchaseRange(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Micropayment-Gated RPC Endpoint
app.post('/rpc', x402PaymentMiddleware, async (req, res) => {
  try {
    const rpcResponse = await RpcProxy.executeRpc(req.body);
    
    // Attach cryptographic receipt if query was paid
    if (res.locals.receipt) {
      rpcResponse.receipt = res.locals.receipt;
    }

    res.json(rpcResponse);
  } catch (err: any) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || 1,
      error: { code: -32603, message: `RPC Execution error: ${err.message}` }
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NEAR x402 Gateway] Running on http://localhost:${PORT}`);
  console.log(`[NEAR x402 Gateway] RPC Endpoint: http://localhost:${PORT}/rpc`);
  console.log(`[NEAR x402 Gateway] Pricing Directory: http://localhost:${PORT}/pricing`);
});

