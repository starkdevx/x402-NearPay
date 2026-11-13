import { PaymentChallenge } from '../types.js';

export class MPPProtocol {
  public static isChallenge(status: number, headers: Headers, bodyText: string): boolean {
    if (status !== 402) return false;

    const authHeader = headers.get('www-authenticate') || '';
    if (authHeader.toUpperCase().includes('MPP')) {
      return true;
    }

    try {
      const parsed = JSON.parse(bodyText);
      if (parsed.protocol === 'mpp' || parsed.scheme === 'mpp') {
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

    let amount = 0.05;
    let currency = 'USDC';
    let recipient = 'mpp_provider.near';
    let network = 'near';
    let description = 'Machine Payments Protocol Micro-Service';
    let challengeToken: string | undefined = undefined;

    const authHeader = headers.get('www-authenticate') || '';
    if (authHeader.toUpperCase().includes('MPP')) {
      const costMatch = authHeader.match(/cost="?([0-9.]+)"?/i) || authHeader.match(/amount="?([0-9.]+)"?/i);
      if (costMatch) amount = parseFloat(costMatch[1]);

      const currMatch = authHeader.match(/currency="?([A-Za-z0-9]+)"?/i);
      if (currMatch) currency = currMatch[1];

      const payeeMatch = authHeader.match(/payee="?([A-Za-z0-9_.-]+)"?/i) || authHeader.match(/recipient="?([A-Za-z0-9_.-]+)"?/i);
      if (payeeMatch) recipient = payeeMatch[1];

      const tokenMatch = authHeader.match(/challenge="?([^",]+)"?/i);
      if (tokenMatch) challengeToken = tokenMatch[1];
    }

    try {
      const bodyJson = JSON.parse(bodyText);
      if (bodyJson.cost !== undefined) amount = parseFloat(bodyJson.cost);
      if (bodyJson.currency) currency = bodyJson.currency;
      if (bodyJson.payee || bodyJson.recipient) recipient = bodyJson.payee || bodyJson.recipient;
      if (bodyJson.challenge) challengeToken = bodyJson.challenge;
    } catch {
      // ignore
    }

    return {
      protocol: 'mpp',
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
      'Authorization': `MPP token="${proofToken}", hash="${txHash}"`,
      'X-MPP-Proof': txHash,
      'X-Payment-Protocol': 'mpp'
    };
  }
}

