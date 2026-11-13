import * as crypto from 'crypto';
import { CONFIG } from './config.js';
import { RangeTokenPayload } from '@x402-gateway/types';

export class SettlementManager {
  /**
   * Generates a signed range access token (HMAC-SHA256 authenticated)
   */
  public static createRangeToken(
    startBlock: number,
    endBlock: number,
    payer: string,
    durationSeconds: number,
    txSignature: string
  ): string {
    const payload: RangeTokenPayload = {
      startBlock,
      endBlock,
      payer,
      expiresAt: Date.now() + durationSeconds * 1000,
      txSignature
    };

    const encodedData = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', CONFIG.TOKEN_SECRET)
      .update(encodedData)
      .digest('base64url');

    return `${encodedData}.${signature}`;
  }

  /**
   * Validates a range token and checks if target block number falls within authorized range
   */
  public static verifyRangeToken(
    token: string,
    targetBlock?: number
  ): { valid: boolean; error?: string; payload?: RangeTokenPayload } {
    if (!token) return { valid: false, error: 'No range token provided' };

    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false, error: 'Malformed range token format' };

    const [encodedData, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', CONFIG.TOKEN_SECRET)
      .update(encodedData)
      .digest('base64url');

    if (signature !== expectedSig) {
      return { valid: false, error: 'Invalid range token cryptographic signature' };
    }

    try {
      const payload: RangeTokenPayload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf-8'));

      if (Date.now() > payload.expiresAt) {
        return { valid: false, error: 'Range access token has expired' };
      }

      if (targetBlock !== undefined) {
        if (targetBlock < payload.startBlock || targetBlock > payload.endBlock) {
          return {
            valid: false,
            error: `Target block ${targetBlock} is outside authorized range [${payload.startBlock} - ${payload.endBlock}]`
          };
        }
      }

      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: `Failed to decode range token: ${err.message}` };
    }
  }
}
