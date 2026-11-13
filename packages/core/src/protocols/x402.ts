import { PaymentChallenge } from '../types.js';

export class X402Protocol {
  public static isChallenge(status: number, headers: Headers, bodyText: string): boolean {
    if (status !== 402) return false;
    
    const authHeader = headers.get('www-authenticate') || '';
    if (authHeader.toLowerCase().includes('x-402') || authHeader.toLowerCase().includes('x402')) {
      return true;
    }

    if (headers.get('payment-required') || headers.get('x-payment-required')) {
      return true;
    }

    try {
      const parsed = JSON.parse(bodyText);
      if (parsed.protocol === 'x402' || (parsed.price !== undefined && parsed.recipient !== undefined)) {
        return true;
      }
    } catch {
      // not json
    }

    return false;
  }

  public static parseChallenge(headers: Headers, bodyText: string): PaymentChallenge {
    const rawHeaders: Record<string, string> = {};
    headers.forEach((v, k) => { rawHeaders[k] = v; });

    let amount = 0.02;
    let currency = 'USDC';
    let recipient = 'merchant.near';
    let network = 'near';
    let description = 'API Access';
    let challengeToken: string | undefined = undefined;

    // 1. Try parsing JSON body
    try {
      const bodyJson = JSON.parse(bodyText);
      const data = bodyJson.detail || bodyJson.payment || bodyJson;
      if (data.amount !== undefined) amount = parseFloat(data.amount);
      else if (data.price !== undefined) amount = parseFloat(data.price);

      if (data.currency) currency = data.currency;
      if (data.recipient) recipient = data.recipient;
      if (data.network) network = data.network;
      if (data.description) description = data.description;
      if (data.challengeToken) challengeToken = data.challengeToken;
    } catch {
      // Not json body
    }

    // 2. Try parsing WWW-Authenticate header: X-402 amount="0.02", currency="USDC", recipient="..."
    const authHeader = headers.get('www-authenticate');
    if (authHeader && (authHeader.includes('X-402') || authHeader.includes('x402'))) {
      const amountMatch = authHeader.match(/amount="?([0-9.]+)"?/i);
      if (amountMatch) amount = parseFloat(amountMatch[1]);

      const currMatch = authHeader.match(/currency="?([A-Za-z0-9]+)"?/i);
      if (currMatch) currency = currMatch[1];

      const recipMatch = authHeader.match(/recipient="?([A-Za-z0-9_.-]+)"?/i);
      if (recipMatch) recipient = recipMatch[1];

      const netMatch = authHeader.match(/network="?([A-Za-z0-9_.-]+)"?/i);
      if (netMatch) network = netMatch[1];

      const descMatch = authHeader.match(/description="?([^",]+)"?/i);
      if (descMatch) description = descMatch[1];
    }

    return {
      protocol: 'x402',
      amount,
      currency,
      recipient,
      network,
      description,
      challengeToken,
      rawHeaders
    };
  }

  public static buildProofHeaders(txHash: string, proofToken: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${proofToken}`,
      'X-Payment-Proof': txHash,
      'X-Payment-Protocol': 'x402'
    };
  }
}

