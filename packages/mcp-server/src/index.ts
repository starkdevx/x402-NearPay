import * as readline from 'readline';
import { loadConfig } from '../../core/dist/config.js';
import { PolicyEngine } from '../../core/dist/policy.js';
import { ReceiptManager } from '../../core/dist/receipts.js';
import { nearPayFetch } from '../../core/dist/client.js';

interface JsonRpcRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}

const TOOLS = [
  {
    name: 'nearpay_curl',
    description: 'Executes an HTTP request. If the endpoint returns HTTP 402 (Payment Required), automatically checks policy spending bounds, settles payment via NEAR Intents, retries with proof, and returns paid data.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Target API endpoint URL' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT'], default: 'GET' },
        body: { type: 'string', description: 'Optional request body' },
        planned_budget: { type: 'number', description: 'Optional maximum price willing to pay; triggers autonomous negotiation if quoted higher.' }
      },
      required: ['url']
    }
  },
  {
    name: 'inspect_payment',
    description: 'Dry run / inspect an HTTP 402 paywall without executing payment or spending funds. Returns price, recipient, and protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Target API endpoint URL to inspect' }
      },
      required: ['url']
    }
  },
  {
    name: 'get_wallet_balance',
    description: 'Inspect the agent policy-bound wallet balances across NEAR and cross-chain stablecoins (USDC).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_spending_limits',
    description: 'Inspect the agent policy limits: max single payment, 24-hr daily budget, remaining allowance, approval thresholds.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_payment_history',
    description: 'Retrieve tamper-evident audit receipts of past API and agent payments.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max receipts to return', default: 10 }
      }
    }
  },
  {
    name: 'discover_paid_apis',
    description: 'Discover available NEAR-native paid APIs, datasets, and agent micro-services in the ecosystem.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter: analytics, validators, ai, or defi' }
      }
    }
  }
];

const PAID_API_CATALOG = [
  {
    name: 'NEAR Ecosystem Intelligence',
    endpoint: 'http://localhost:4025/v1/near/top-ecosystem',
    price: '$0.02 USDC',
    protocol: 'x402',
    category: 'analytics',
    description: 'Real-time TVL, active accounts, and contract deployment metrics across top NEAR protocols.'
  },
  {
    name: 'NEAR Validator Oracle',
    endpoint: 'http://localhost:4025/v1/near/validator-intelligence',
    price: '$0.04 USDC',
    protocol: 'MPP',
    category: 'validators',
    description: 'Validator seat prices, stake distributions, uptime, and Nakamoto coefficient.'
  },
  {
    name: 'NEAR Agent Research Report',
    endpoint: 'http://localhost:4025/v1/near/market-research',
    price: '$0.09 USDC (Negotiable)',
    protocol: 'x402',
    category: 'ai',
    description: 'Comprehensive research synthesis for autonomous agent trading & settlement strategies.'
  }
];

async function handleToolCall(name: string, args: any): Promise<any> {
  const config = loadConfig();
  const policy = new PolicyEngine(config);

  switch (name) {
    case 'nearpay_curl': {
      const res = await nearPayFetch(args.url, {
        method: args.method || 'GET',
        body: args.body,
        plannedBudget: args.planned_budget
      });
      return {
        success: true,
        data: res.data,
        wasPaid: res.wasPaid,
        receipt: res.receipt
      };
    }

    case 'inspect_payment': {
      const rawRes = await fetch(args.url);
      if (rawRes.status !== 402) {
        return { isPaidEndpoint: false, status: rawRes.status, message: 'Endpoint is not paywalled.' };
      }
      const authHeader = rawRes.headers.get('www-authenticate') || '';
      const text = await rawRes.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch {}
      return {
        isPaidEndpoint: true,
        protocol: authHeader.toUpperCase().includes('MPP') ? 'MPP' : 'x402',
        challengeHeaders: authHeader,
        challengeBody: parsed,
        agentPolicyCheck: policy.evaluate({
          protocol: authHeader.toUpperCase().includes('MPP') ? 'mpp' : 'x402',
          amount: 0.02,
          currency: 'USDC',
          recipient: 'inspected.near',
          network: 'near',
          rawHeaders: {}
        })
      };
    }

    case 'get_wallet_balance': {
      return {
        agentId: config.agentId,
        ownerAccountId: config.ownerAccountId,
        network: config.network,
        balances: config.balances,
        settlementProvider: config.settlementProvider
      };
    }

    case 'get_spending_limits': {
      return {
        dailyBudget: config.policy.dailyBudget,
        dailySpent: config.policy.dailySpent,
        remainingDailyAllowance: policy.getRemainingDailyBudget(),
        maxPaymentPerRequest: config.policy.maxPaymentPerRequest,
        requireApprovalAbove: config.policy.requireApprovalAbove,
        allowedAssets: config.policy.allowedAssets,
        allowedNetworks: config.policy.allowedNetworks
      };
    }

    case 'get_payment_history': {
      const limit = args.limit || 10;
      const receipts = ReceiptManager.getReceipts().slice(0, limit);
      return { total: receipts.length, receipts };
    }

    case 'discover_paid_apis': {
      let results = PAID_API_CATALOG;
      if (args.category) {
        results = results.filter(a => a.category.toLowerCase() === args.category.toLowerCase());
      }
      return { apis: results };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function sendResponse(id: number | string | undefined, result: any): void {
  if (id === undefined) return;
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(msg + '\n');
}

function sendError(id: number | string | undefined, code: number, message: string): void {
  if (id === undefined) return;
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(msg + '\n');
}

export function startMcpServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const req: JsonRpcRequest = JSON.parse(line);
      
      if (req.method === 'initialize') {
        sendResponse(req.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'near-pay-mcp',
            version: '1.0.0'
          }
        });
      } else if (req.method === 'notifications/initialized') {
        // notification, no response
      } else if (req.method === 'tools/list') {
        sendResponse(req.id, { tools: TOOLS });
      } else if (req.method === 'tools/call') {
        const { name, arguments: toolArgs } = req.params;
        try {
          const res = await handleToolCall(name, toolArgs || {});
          sendResponse(req.id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(res, null, 2)
              }
            ]
          });
        } catch (err: any) {
          sendResponse(req.id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err.message }, null, 2)
              }
            ],
            isError: true
          });
        }
      } else {
        sendError(req.id, -32601, `Method not found: ${req.method}`);
      }
    } catch (err: any) {
      sendError(undefined, -32700, `Parse error: ${err.message}`);
    }
  });

  // Log status to stderr so stdout remains clean for MCP JSON-RPC
  process.stderr.write(`[NEAR Pay MCP] Server running on stdio with 6 payment tools.\n`);
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.includes('mcp')) {
  startMcpServer();
}

