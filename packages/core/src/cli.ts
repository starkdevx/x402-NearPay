import { loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';
import { PolicyEngine } from './policy.js';
import { ReceiptManager } from './receipts.js';
import { nearPayFetch } from './client.js';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

export async function runCli(args: string[]): Promise<void> {
  const command = args[0] || 'help';

  switch (command) {
    case 'setup':
      await handleSetup(args.slice(1));
      break;
    case 'whoami':
      handleWhoami();
      break;
    case 'balance':
      handleBalance();
      break;
    case 'curl':
      await handleCurl(args.slice(1));
      break;
    case 'history':
      handleHistory();
      break;
    case 'demo':
      await handleDemo();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

function printHelp(): void {
  console.log(`
${c.bright}${c.cyan}NEAR Pay${c.reset} — The Payment Layer for AI Agents
${c.dim}Let AI agents access, use and pay for APIs with NEAR Intents & Policy-Bound Wallets${c.reset}

${c.bright}USAGE:${c.reset}
  near-pay <command> [arguments]

${c.bright}COMMANDS:${c.reset}
  ${c.green}setup${c.reset}                    Initialize or configure policy-bound agent wallet
  ${c.green}whoami${c.reset}                   Inspect agent identity, owner delegation & spending limits
  ${c.green}balance${c.reset}                  Check agent balances across NEAR and cross-chain stables
  ${c.green}curl <url>${c.reset}               Execute HTTP request; intercepts 402s & settles via NEAR Intents
  ${c.green}history${c.reset}                  View tamper-evident payment receipts & audit log
  ${c.green}demo${c.reset}                     Run automated end-to-end hackathon demonstration
  ${c.green}mcp${c.reset}                      Start Model Context Protocol server over stdio
  ${c.green}debugger${c.reset}                 Launch real-time web visualizer on http://localhost:4020

${c.bright}EXAMPLES:${c.reset}
  near-pay curl https://api.nearpay.network/v1/near/top-ecosystem
  near-pay curl http://localhost:4021/v1/near/top-ecosystem
  near-pay setup --daily-budget 10.00 --max-payment 1.00
`);
}

async function handleSetup(args: string[]): Promise<void> {
  const config = loadConfig();
  console.log(`\n${c.bright}${c.cyan}==> Configuring NEAR Pay Agent Wallet${c.reset}`);
  
  // Parse optional flags
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--daily-budget' && args[i + 1]) {
      config.policy.dailyBudget = parseFloat(args[++i]);
    } else if (args[i] === '--max-payment' && args[i + 1]) {
      config.policy.maxPaymentPerRequest = parseFloat(args[++i]);
    } else if (args[i] === '--owner' && args[i + 1]) {
      config.ownerAccountId = args[++i];
    } else if (args[i] === '--reset') {
      Object.assign(config, DEFAULT_CONFIG);
    }
  }

  saveConfig(config);

  console.log(`${c.green}[OK]${c.reset} Agent Wallet initialized with cryptographic delegation:`);
  console.log(`  * Agent ID:          ${c.yellow}${config.agentId}${c.reset}`);
  console.log(`  * Owner Account:     ${c.yellow}${config.ownerAccountId}${c.reset} (Holds master keys)`);
  console.log(`  * Network:           ${c.cyan}${config.network}${c.reset}`);
  console.log(`  * Settlement Rail:   ${c.cyan}${config.settlementProvider} (1Click cross-chain solver)${c.reset}`);
  console.log(`  * Daily Spending Cap: \$${config.policy.dailyBudget.toFixed(2)} USDC`);
  console.log(`  * Max Per-Request:    \$${config.policy.maxPaymentPerRequest.toFixed(2)} USDC`);
  console.log(`  * Approval Threshold: \$${config.policy.requireApprovalAbove.toFixed(2)} USDC`);
  console.log(`  * Permitted Assets:   ${config.policy.allowedAssets.join(', ')}\n`);
}

function handleWhoami(): void {
  const config = loadConfig();
  const policy = new PolicyEngine(config);
  const remaining = policy.getRemainingDailyBudget();

  console.log(`\n${c.bright}${c.cyan}=================== NEAR PAY AGENT PROFILE ===================${c.reset}`);
  console.log(`Agent ID:            ${c.bright}${config.agentId}${c.reset}`);
  console.log(`Master Owner:        ${c.green}${config.ownerAccountId}${c.reset} (Zero master key exposure)`);
  console.log(`Key Delegation:      Policy-scoped session token (${config.agentApiKey.substring(0, 14)}...)`);
  console.log(`Settlement Engine:   ${c.cyan}${config.settlementProvider}${c.reset} via ${config.agentApiUrl}`);
  console.log(`------------------- SPENDING BOUNDARIES -------------------`);
  console.log(`Daily Budget Cap:    \$${config.policy.dailyBudget.toFixed(2)} USDC`);
  console.log(`Daily Spent (24h):   \$${config.policy.dailySpent.toFixed(2)} USDC`);
  console.log(`Remaining Allowance: ${c.green}\$${remaining.toFixed(2)} USDC${c.reset}`);
  console.log(`Max Single Request:  \$${config.policy.maxPaymentPerRequest.toFixed(2)} USDC`);
  console.log(`Require Approval >:  \$${config.policy.requireApprovalAbove.toFixed(2)} USDC`);
  console.log(`Allowed Assets:      ${config.policy.allowedAssets.join(', ')}`);
  console.log(`Allowed Networks:    ${config.policy.allowedNetworks.join(', ')}`);
  console.log(`===========================================================\n`);
}

function handleBalance(): void {
  const config = loadConfig();
  console.log(`\n${c.bright}${c.cyan}==> NEAR Pay Agent Balances${c.reset}`);
  console.log(`  * USDC:  ${c.green}${config.balances.USDC.toFixed(2)} USDC${c.reset}`);
  console.log(`  * NEAR:  ${c.green}${config.balances.NEAR.toFixed(4)} NEAR${c.reset}`);
  console.log(`  * Settlement status: Ready for 1Click cross-chain routing\n`);
}

async function handleCurl(args: string[]): Promise<void> {
  const url = args.find(a => !a.startsWith('-'));
  if (!url) {
    console.error(`${c.red}Error: Missing URL. Usage: near-pay curl <url>${c.reset}`);
    process.exit(1);
  }

  const isSilent = args.includes('-s') || args.includes('--silent');
  const targetBudgetIndex = args.indexOf('--budget');
  const plannedBudget = targetBudgetIndex !== -1 ? parseFloat(args[targetBudgetIndex + 1]) : undefined;

  if (!isSilent) {
    console.log(`\n${c.cyan}[near-pay]${c.reset} Sending request to ${url}...`);
  }

  try {
    const result = await nearPayFetch(url, {
      plannedBudget,
      silent: isSilent,
      onLifecycleEvent: (ev) => {
        if (isSilent) return;
        switch (ev.step) {
          case 'PAYMENT_REQUIRED':
            console.log(`${c.yellow}[!] HTTP 402 Payment Required intercepted.${c.reset}`);
            break;
          case 'PROTOCOL_DETECTED':
            console.log(`    Protocol:   ${c.bright}${ev.data.protocol.toUpperCase()}${c.reset}`);
            console.log(`    Price:      ${c.green}\$${ev.data.challenge.amount} ${ev.data.challenge.currency}${c.reset}`);
            console.log(`    Recipient:  ${ev.data.challenge.recipient}`);
            break;
          case 'NEGOTIATION_TRIGGERED':
            console.log(`    ${c.magenta}[Negotiate] Quote exceeds target budget ($${ev.data.plannedBudget}). Formulating counter...${c.reset}`);
            break;
          case 'NEGOTIATION_RESULT':
            console.log(`    ${c.magenta}[Negotiate] ${ev.data.reasoning}${c.reset}`);
            break;
          case 'POLICY_APPROVED':
            console.log(`    ${c.green}[Policy] Passed agent safety bounds.${c.reset} Daily remaining: \$${ev.data.dailyRemaining.toFixed(2)}`);
            break;
          case 'SETTLEMENT_START':
            console.log(`    ${c.cyan}[NEAR Intents] Broadcasting intent to 1Click solver network...${c.reset}`);
            break;
          case 'SETTLEMENT_SUCCESS':
            console.log(`    ${c.green}[NEAR Intents] Solved! Hash: ${ev.data.intentHash}${c.reset}`);
            break;
          case 'RETRY_WITH_PROOF':
            console.log(`    ${c.cyan}[near-pay] Retrying original request with cryptographic proof...${c.reset}`);
            break;
          case 'RETRY_RESPONSE':
            console.log(`    ${c.green}[OK] Provider returned HTTP ${ev.data.status} (Verified).${c.reset}\n`);
            break;
        }
      }
    });

    if (typeof result.data === 'object') {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(result.data);
    }

    if (!isSilent && result.receipt) {
      console.log(`\n${c.dim}--- Payment Receipt [${result.receipt.receiptId}] ---${c.reset}`);
      console.log(`${c.dim}Paid \$${result.receipt.amount} ${result.receipt.currency} to ${result.receipt.provider} via ${result.receipt.settlementType}${c.reset}`);
      console.log(`${c.dim}Audit Hash: ${result.receipt.txHash} | Remaining Daily Allowance: \$${result.receipt.remainingBudget.toFixed(2)}${c.reset}\n`);
    }
  } catch (err: any) {
    console.error(`\n${c.red}[near-pay error] ${err.message}${c.reset}\n`);
    process.exit(1);
  }
}

function handleHistory(): void {
  console.log(`\n${c.bright}${c.cyan}======================= NEAR PAY TRANSACTION AUDIT =======================${c.reset}\n`);
  console.log(ReceiptManager.formatTable());
  console.log(`\n${c.dim}Receipts cryptographically verifiable & stored in ~/.near-pay/receipts.json${c.reset}\n`);
}

async function handleDemo(): Promise<void> {
  const { runEndToEndDemo } = await import('./demo-runner.js');
  await runEndToEndDemo();
}

// Auto-run if executed directly as entry script
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('cli.js') || 
                    process.argv[1]?.replace(/\\/g, '/').endsWith('near-pay.js') ||
                    process.argv[1]?.replace(/\\/g, '/').endsWith('near-pay');

if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error('[near-pay error]', err);
    process.exit(1);
  });
}


