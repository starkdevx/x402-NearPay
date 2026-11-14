import { RangePurchaseRequest, RangePurchaseResponse } from '@x402-gateway/types';

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3005';

export class RangeManager {
  public static async purchaseRange(reqData: RangePurchaseRequest): Promise<RangePurchaseResponse> {
    const res = await fetch(`${FACILITATOR_URL}/create-range-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData)
    });

    if (!res.ok) {
      throw new Error(`Facilitator rejected range purchase: ${await res.text()}`);
    }

    return await res.json() as RangePurchaseResponse;
  }
}

