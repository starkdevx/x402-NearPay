import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentConfig } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.near-pay');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export const DEFAULT_CONFIG: AgentConfig = {
  agentId: 'near-agent-77a9e14c',
  ownerAccountId: 'alex_near.near',
  agentApiKey: 'agt_demo_key_sec_89f02c91a32b',
  network: 'demo',
  settlementProvider: 'near-intents',
  agentApiUrl: 'https://api.demo.agentsonintents.com',
  policy: {
    maxPaymentPerRequest: 0.50,
    dailyBudget: 5.00,
    dailySpent: 0.00,
    lastResetTimestamp: Date.now(),
    allowedAssets: ['USDC', 'NEAR'],
    allowedNetworks: ['near', 'base'],
    requireApprovalAbove: 1.00,
    autoNegotiateAbove: 0.04
  },
  balances: {
    USDC: 25.00,
    NEAR: 14.50
  }
};

export function getNearPayDir(): string {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  return CONFIG_DIR;
}

export function loadConfig(): AgentConfig {
  getNearPayDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed, policy: { ...DEFAULT_CONFIG.policy, ...parsed.policy } };
  } catch (err) {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AgentConfig): void {
  getNearPayDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

