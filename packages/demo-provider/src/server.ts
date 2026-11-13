import * as http from 'http';

const PORT = parseInt(process.env.PORT || '4025', 10);

const server = http.createServer((req, res) => {
  const url = req.url || '';
  const authHeader = req.headers['authorization'] || '';
  const proofHeader = req.headers['x-payment-proof'] || req.headers['x-mpp-proof'] || '';

  // Free health check
  if (url === '/health' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      service: 'NEAR Pay Demonstration Paid Data Provider',
      supportedProtocols: ['x402', 'MPP'],
      endpoints: [
        { path: '/v1/near/top-ecosystem', cost: '$0.02 USDC', protocol: 'x402' },
        { path: '/v1/near/validator-intelligence', cost: '$0.04 USDC', protocol: 'MPP' },
        { path: '/v1/near/market-research', cost: '$0.09 USDC (Negotiable)', protocol: 'x402' }
      ]
    }));
    return;
  }

  // 1. x402 Paid Endpoint
  if (url.includes('/v1/near/top-ecosystem')) {
    if (!authHeader && !proofHeader) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'X-402 amount="0.02", currency="USDC", recipient="aurora_analytics.near", network="near"',
        'Payment-Required': 'true'
      });
      res.end(JSON.stringify({
        error: 'Payment Required',
        protocol: 'x402',
        price: 0.02,
        currency: 'USDC',
        recipient: 'aurora_analytics.near',
        description: 'Top 5 NEAR Ecosystem Protocol Metrics'
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'SUCCESS',
      dataset: 'Top NEAR Ecosystem Projects',
      timestamp: new Date().toISOString(),
      projects: [
        { rank: 1, name: 'Aurora', category: 'EVM Layer 2', tvl: '$64.2M', tps: '1,420' },
        { rank: 2, name: 'Ref Finance', category: 'DEX / AMM', tvl: '$48.9M', volume24h: '$12.4M' },
        { rank: 3, name: 'Burrow Cash', category: 'Money Market', tvl: '$31.8M', supplyApy: '8.4%' },
        { rank: 4, name: 'Meta Pool', category: 'Liquid Staking', tvl: '$88.5M', apy: '9.2%' },
        { rank: 5, name: 'NEAR Intents (1Click)', category: 'Cross-Chain Solvers', volume24h: '$35.1M', solvers: 18 }
      ],
      settledVia: 'NEAR Intents (1Click Solver)',
      paymentProofVerified: true
    }));
    return;
  }

  // 2. MPP Paid Endpoint
  if (url.includes('/v1/near/validator-intelligence')) {
    if (!authHeader.includes('MPP') && !proofHeader) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'MPP realm="validator.near", cost="0.04", currency="USDC", payee="staking_oracle.near", challenge="ch_882910"',
        'Payment-Required': 'true'
      });
      res.end(JSON.stringify({
        protocol: 'mpp',
        cost: 0.04,
        currency: 'USDC',
        payee: 'staking_oracle.near',
        challenge: 'ch_882910'
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'SUCCESS',
      protocol: 'MPP Verified',
      validatorCount: 240,
      seatPrice: '38,500 NEAR',
      totalStaked: '584,200,190 NEAR',
      nakamotoCoefficient: 14
    }));
    return;
  }

  // 3. Negotiable Endpoint
  if (url.includes('/v1/near/market-research')) {
    const isNegotiated = req.headers['x-negotiated-price'] === '0.046';
    if (!authHeader && !isNegotiated) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'X-402 amount="0.09", currency="USDC", recipient="research_firm.near", network="near"'
      });
      res.end(JSON.stringify({
        error: 'Payment Required',
        price: 0.09,
        currency: 'USDC',
        recipient: 'research_firm.near'
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'SUCCESS',
      note: 'Accepted negotiated price of $0.046 USDC',
      marketSummary: 'NEAR AI & Agent Economy report delivered to autonomous agent.'
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[NEAR Pay Demo Provider] Running at http://127.0.0.1:${PORT}`);
  console.log(`[NEAR Pay Demo Provider] Endpoints:`);
  console.log(`  - GET http://127.0.0.1:${PORT}/v1/near/top-ecosystem (x402: $0.02 USDC)`);
  console.log(`  - GET http://127.0.0.1:${PORT}/v1/near/validator-intelligence (MPP: $0.04 USDC)`);
  console.log(`  - GET http://127.0.0.1:${PORT}/v1/near/market-research (x402 Negotiable: $0.09 USDC)`);
});

