import { AgentConfig, PaymentChallenge, PolicyCheckResult } from './types.js';
import { saveConfig } from './config.js';

export class PolicyEngine {
  constructor(private config: AgentConfig) {
    this.refreshRollingWindow();
  }

  private refreshRollingWindow(): void {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - this.config.policy.lastResetTimestamp > ONE_DAY_MS) {
      this.config.policy.dailySpent = 0;
      this.config.policy.lastResetTimestamp = now;
      saveConfig(this.config);
    }
  }

  public evaluate(challenge: PaymentChallenge): PolicyCheckResult {
    this.refreshRollingWindow();

    const policy = this.config.policy;

    // 1. Asset check
    const normalizedAsset = challenge.currency.toUpperCase();
    if (!policy.allowedAssets.includes(normalizedAsset)) {
      return {
        allowed: false,
        reason: `Asset '${challenge.currency}' is not permitted by agent policy. Allowed: ${policy.allowedAssets.join(', ')}`
      };
    }

    // 2. Network check
    const normalizedNetwork = challenge.network.toLowerCase();
    if (policy.allowedNetworks.length > 0 && !policy.allowedNetworks.includes(normalizedNetwork)) {
      return {
        allowed: false,
        reason: `Network '${challenge.network}' is not in policy whitelist. Allowed: ${policy.allowedNetworks.join(', ')}`
      };
    }

    // 3. Max payment per request check
    if (challenge.amount > policy.maxPaymentPerRequest) {
      return {
        allowed: false,
        reason: `Requested amount ($${challenge.amount} ${challenge.currency}) exceeds maximum single payment cap of $${policy.maxPaymentPerRequest}`
      };
    }

    // 4. Daily budget check
    const remainingDaily = policy.dailyBudget - policy.dailySpent;
    if (challenge.amount > remainingDaily) {
      return {
        allowed: false,
        reason: `Insufficient daily budget. Attempting $${challenge.amount}, but only $${remainingDaily.toFixed(4)} remains of $${policy.dailyBudget} daily limit.`
      };
    }

    // 5. Require human approval threshold check
    if (challenge.amount >= policy.requireApprovalAbove) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Amount ($${challenge.amount}) reaches manual approval threshold of $${policy.requireApprovalAbove}`
      };
    }

    // 6. Negotiation check (if price exceeds autoNegotiateAbove)
    if (policy.autoNegotiateAbove && challenge.amount > policy.autoNegotiateAbove) {
      return {
        allowed: true,
        negotiationRecommended: true,
        reason: `Price ($${challenge.amount}) is eligible for autonomous discount negotiation.`
      };
    }

    return { allowed: true };
  }

  public recordSpend(amount: number, currency: string): void {
    this.config.policy.dailySpent += amount;
    
    // Deduct from agent virtual balance if applicable
    const curr = currency.toUpperCase();
    if (curr === 'USDC' && this.config.balances.USDC !== undefined) {
      this.config.balances.USDC = Math.max(0, this.config.balances.USDC - amount);
    } else if (curr === 'NEAR' && this.config.balances.NEAR !== undefined) {
      this.config.balances.NEAR = Math.max(0, this.config.balances.NEAR - amount);
    }

    saveConfig(this.config);
  }

  public getRemainingDailyBudget(): number {
    this.refreshRollingWindow();
    return Math.max(0, this.config.policy.dailyBudget - this.config.policy.dailySpent);
  }
}

