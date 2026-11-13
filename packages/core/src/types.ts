export interface SpendingPolicy {
  maxPaymentPerRequest: number; // e.g. 0.50 USDC
  dailyBudget: number;          // e.g. 5.00 USDC
  dailySpent: number;           // Current spend in 24hr window
  lastResetTimestamp: number;   // Epoch ms
  allowedAssets: string[];      // e.g. ["USDC", "NEAR"]
  allowedNetworks: string[];    // e.g. ["near", "base"]
  requireApprovalAbove: number; // e.g. 1.00 USDC
  autoNegotiateAbove?: number;  // Threshold to trigger counter-offer
}

export interface AgentConfig {
  agentId: string;
  ownerAccountId: string;
  agentApiKey: string;
  network: 'near-mainnet' | 'near-testnet' | 'demo';
  settlementProvider: 'near-intents' | 'pingpay' | 'agent-api';
  agentApiUrl: string;
  policy: SpendingPolicy;
  balances: {
    USDC: number;
    NEAR: number;
  };
}

export interface PaymentChallenge {
  protocol: 'x402' | 'mpp';
  amount: number;
  currency: string;
  recipient: string;
  network: string;
  challengeToken?: string;
  description?: string;
  rawHeaders: Record<string, string>;
}

export interface PaymentReceipt {
  receiptId: string;
  timestamp: string;
  targetUrl: string;
  provider: string;
  protocol: 'x402' | 'mpp';
  amount: number;
  currency: string;
  settlementType: string;
  txHash: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  remainingBudget: number;
  workPassedCheck: boolean;
  proofHeader: string;
  details?: Record<string, any>;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  negotiationRecommended?: boolean;
}

export interface SettlementResult {
  success: boolean;
  txHash: string;
  proofHeader: string;
  proofValue: string;
  protocol: 'x402' | 'mpp';
  amountSettled: number;
  currency: string;
  solver?: string;
  error?: string;
}

