import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { PaymentVerifier } from './verify.js';
import { SettlementManager } from './settle.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health & Status
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'NEAR x402 Payment Facilitator',
    port: CONFIG.PORT,
    network: CONFIG.NETWORK,
    paymentRecipient: CONFIG.PAYMENT_RECIPIENT,
    upstreamRpc: CONFIG.NEAR_RPC_URL
  });
});

// Verify single query micropayment
app.post('/verify', async (req, res) => {
  const { signature, amountYocto, method } = req.body;

  if (!signature || !amountYocto) {
    return res.status(400).json({ valid: false, error: 'Missing required parameters' });
  }

  const result = await PaymentVerifier.verifyPayment(signature, amountYocto, method || 'unknown');

  if (!result.valid) {
    return res.status(400).json(result);
  }

  const receipt = PaymentVerifier.generateReceipt(
    result.payer!,
    result.amount!,
    method || 'unknown',
    result.txSignature!
  );

  res.json({
    valid: true,
    payer: result.payer,
    txSignature: result.txSignature,
    receipt
  });
});

// Issue Range-Based Batch Access Token
app.post('/create-range-token', (req, res) => {
  const { startBlock, endBlock, payer, durationSeconds } = req.body;
  const txSignature = req.body.txSignature || req.body.paymentTxSignature;

  if (!startBlock || !endBlock || !payer || !txSignature) {
    return res.status(400).json({ success: false, error: 'Missing range configuration parameters' });
  }

  const duration = durationSeconds || 3600;
  const token = SettlementManager.createRangeToken(
    Number(startBlock),
    Number(endBlock),
    payer,
    duration,
    txSignature
  );

  const blockCount = Math.abs(endBlock - startBlock) + 1;
  const priceNear = (blockCount * 0.000005).toFixed(4);
  const priceUsd = (Number(priceNear) * 5.0).toFixed(4); // approx $5/NEAR

  res.json({
    success: true,
    token,
    range: {
      startBlock: Number(startBlock),
      endBlock: Number(endBlock),
      blockCount
    },
    pricing: {
      totalNear: `${priceNear} NEAR`,
      priceUsd: `$${priceUsd}`
    },
    access: {
      duration,
      expiresAt: Date.now() + duration * 1000
    }
  });
});

// Validate Range Access Token
app.post('/verify-range-token', (req, res) => {
  const { token, targetBlock } = req.body;
  const result = SettlementManager.verifyRangeToken(token, targetBlock !== undefined ? Number(targetBlock) : undefined);

  if (!result.valid) {
    return res.status(403).json(result);
  }

  res.json(result);
});

app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`[NEAR x402 Facilitator] Listening on http://localhost:${CONFIG.PORT}`);
  console.log(`[NEAR x402 Facilitator] Recipient Treasury: ${CONFIG.PAYMENT_RECIPIENT}`);
  console.log(`[NEAR x402 Facilitator] Network: ${CONFIG.NETWORK}`);
});
