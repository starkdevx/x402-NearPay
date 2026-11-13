import { Request, Response, NextFunction } from 'express';
import { getPriceForMethod } from './pricing.js';

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';
const PAYMENT_RECIPIENT = process.env.PAYMENT_RECIPIENT || 'treasury.nearpay.near';

export async function x402PaymentMiddleware(req: Request, res: Response, next: NextFunction): Promise<any> {
  const method = req.body?.method || 'unknown';
  const price = getPriceForMethod(method);

  // 1. Check Range-Based Batch Access Token
  const rangeToken = req.headers['x-range-token'] as string;
  if (rangeToken) {
    try {
      const targetBlock = req.body?.params?.block_id || req.body?.params?.height;
      const verifyRes = await fetch(`${FACILITATOR_URL}/verify-range-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rangeToken, targetBlock })
      });

      if (verifyRes.ok) {
        const verifyData: any = await verifyRes.json();
        if (verifyData.valid) {
          // Bypassed via Range Token!
          res.setHeader('X-Payment-Status', 'RANGE_TOKEN_AUTHORIZED');
          res.setHeader('X-Range-Blocks', `${verifyData.payload.startBlock}-${verifyData.payload.endBlock}`);
          return next();
        }
      }
    } catch (err: any) {
      console.warn(`[Gateway Middleware] Range token check error: ${err.message}`);
    }
  }

  // 2. Check Single-Query Payment Signature
  const paymentSig = (req.headers['x-payment-signature'] as string) ||
                     (req.headers['authorization']?.replace(/^Bearer\s+/i, ''));

  if (paymentSig) {
    try {
      const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: paymentSig,
          amountYocto: price.yocto,
          method
        })
      });

      if (verifyRes.ok) {
        const verifyData: any = await verifyRes.json();
        if (verifyData.valid) {
          res.locals.receipt = verifyData.receipt;
          res.setHeader('X-Payment-Status', 'PAID_AND_VERIFIED');
          res.setHeader('X-Payment-Signature', verifyData.txSignature);
          return next();
        }
      } else {
        const errData: any = await verifyRes.json();
        return res.status(402).json({
          error: 'Payment verification failed',
          details: errData.error
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: `Facilitator connection failed: ${err.message}` });
    }
  }

  // 3. No Payment -> Enforce HTTP 402
  res.setHeader(
    'WWW-Authenticate',
    `X-402 amount="${price.near}", currency="NEAR", recipient="${PAYMENT_RECIPIENT}", network="near-mainnet"`
  );
  res.setHeader('X-Payment-Required', 'true');

  return res.status(402).json({
    error: 'Payment required',
    amount: `${price.near} NEAR`,
    amountYocto: price.yocto,
    currency: 'NEAR',
    recipient: PAYMENT_RECIPIENT,
    method,
    pricingUSD: price.usd,
    description: price.description,
    rangeBatchingAvailable: true
  });
}
