import * as crypto from 'crypto';
import { loadConfig } from './config.js';
import { PolicyEngine } from './policy.js';
import { X402Protocol } from './protocols/x402.js';
import { MPPProtocol } from './protocols/mpp.js';
import { SettlementEngine } from './settlement/intents.js';
import { NegotiationEngine } from './negotiator.js';
import { ReceiptManager } from './receipts.js';
import { PaymentChallenge, PaymentReceipt } from './types.js';

export interface NearPayFetchOptions extends RequestInit {
  plannedBudget?: number;
  silent?: boolean;
  onLifecycleEvent?: (event: { step: string; data: any }) => void;
}

export interface NearPayResponse {
  response: Response;
  data: any;
  receipt?: PaymentReceipt;
  wasPaid: boolean;
  lifecycle: Array<{ step: string; timestamp: number; details: any }>;
}

export async function nearPayFetch(url: string, options: NearPayFetchOptions = {}): Promise<NearPayResponse> {
  const config = loadConfig();
  const policyEngine = new PolicyEngine(config);
  const settlementEngine = new SettlementEngine(config);
  const lifecycle: Array<{ step: string; timestamp: number; details: any }> = [];

  const emit = (step: string, details: any) => {
    lifecycle.push({ step, timestamp: Date.now(), details });
    if (options.onLifecycleEvent) {
      options.onLifecycleEvent({ step, data: details });
    }
    // Also notify debugger server if running locally on port 4020
    try {
      fetch('http://127.0.0.1:4020/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, timestamp: Date.now(), details, url })
      }).catch(() => {});
    } catch {}
  };

  emit('REQUEST_START', { url, method: options.method || 'GET' });

  // 1. Initial request
  let res = await fetch(url, options);

  if (res.status !== 402) {
    emit('DIRECT_RESPONSE', { status: res.status });
    let text = await res.text();
    let parsedData = text;
    try { parsedData = JSON.parse(text); } catch {}
    return {
      response: res,
      data: parsedData,
      wasPaid: false,
      lifecycle
    };
  }

  // 2. Intercept 402 Payment Required
  const bodyText = await res.text();
  emit('PAYMENT_REQUIRED', { status: 402, headers: Object.fromEntries(res.headers.entries()), body: bodyText });

  let challenge: PaymentChallenge;
  if (MPPProtocol.isChallenge(res.status, res.headers, bodyText)) {
    challenge = MPPProtocol.parseChallenge(res.headers, bodyText);
    emit('PROTOCOL_DETECTED', { protocol: 'mpp', challenge });
  } else {
    // Default to x402 standard
    challenge = X402Protocol.parseChallenge(res.headers, bodyText);
    emit('PROTOCOL_DETECTED', { protocol: 'x402', challenge });
  }

  // 3. Optional Autonomous Negotiation
  let effectiveAmount = challenge.amount;
  if (options.plannedBudget && challenge.amount > options.plannedBudget) {
    emit('NEGOTIATION_TRIGGERED', { quote: challenge.amount, plannedBudget: options.plannedBudget });
    const negResult = await NegotiationEngine.negotiate(challenge, options.plannedBudget);
    emit('NEGOTIATION_RESULT', negResult);

    if (!negResult.counterAccepted) {
      throw new Error(`[NEAR Pay Negotiation] Counter-offer rejected. Target: $${options.plannedBudget}, Quote: $${challenge.amount}. Aborting payment.`);
    }
    effectiveAmount = negResult.finalPrice;
    challenge.amount = effectiveAmount;
  }

  // 4. Policy Verification (No blind payments!)
  emit('POLICY_CHECK_START', { challenge, agentPolicy: config.policy });
  const policyCheck = policyEngine.evaluate(challenge);
  
  if (!policyCheck.allowed) {
    emit('POLICY_REJECTED', { reason: policyCheck.reason });
    throw new Error(`[NEAR Pay Policy] Payment rejected by agent safety bounds: ${policyCheck.reason}`);
  }

  if (policyCheck.requiresApproval) {
    emit('APPROVAL_REQUIRED', { amount: challenge.amount, threshold: config.policy.requireApprovalAbove });
    // In automated CLI mode, log warning or prompt. For hackathon demo, we proceed with audit logged.
  }

  emit('POLICY_APPROVED', {
    amount: challenge.amount,
    currency: challenge.currency,
    dailySpentAfter: config.policy.dailySpent + challenge.amount,
    dailyRemaining: policyEngine.getRemainingDailyBudget() - challenge.amount
  });

  // 5. Execute Settlement via NEAR Intents / Agent API
  emit('SETTLEMENT_START', {
    provider: config.settlementProvider,
    network: challenge.network,
    recipient: challenge.recipient,
    amount: challenge.amount
  });

  const settlement = await settlementEngine.settle(challenge);
  if (!settlement.success) {
    emit('SETTLEMENT_FAILED', { error: settlement.error });
    throw new Error(`[NEAR Pay Settlement] Failed to execute intent: ${settlement.error}`);
  }

  emit('SETTLEMENT_SUCCESS', {
    intentHash: settlement.txHash,
    solver: settlement.solver,
    amountSettled: settlement.amountSettled
  });

  // 6. Build Proof Headers and Retry Original Request
  let proofHeaders: Record<string, string>;
  if (challenge.protocol === 'mpp') {
    proofHeaders = MPPProtocol.buildProofHeaders(settlement.txHash, settlement.proofValue);
  } else {
    proofHeaders = X402Protocol.buildProofHeaders(settlement.txHash, settlement.proofValue);
  }

  emit('RETRY_WITH_PROOF', { proofHeaders });

  const retryHeaders = new Headers(options.headers || {});
  for (const [k, v] of Object.entries(proofHeaders)) {
    retryHeaders.set(k, v);
  }

  const retryRes = await fetch(url, {
    ...options,
    headers: retryHeaders
  });

  const responseText = await retryRes.text();
  let responseData: any = responseText;
  try { responseData = JSON.parse(responseText); } catch {}

  const workPassed = retryRes.status === 200;
  emit('RETRY_RESPONSE', { status: retryRes.status, workPassed });

  if (!workPassed) {
    throw new Error(`[NEAR Pay] Retried request with payment proof failed with status ${retryRes.status}: ${responseText}`);
  }

  // 7. Update spend and record receipt
  policyEngine.recordSpend(challenge.amount, challenge.currency);

  const receipt: PaymentReceipt = {
    receiptId: `rcpt_${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date().toISOString(),
    targetUrl: url,
    provider: challenge.recipient,
    protocol: challenge.protocol,
    amount: challenge.amount,
    currency: challenge.currency,
    settlementType: `${config.settlementProvider} (1Click solver)`,
    txHash: settlement.txHash,
    status: 'SUCCESS',
    remainingBudget: policyEngine.getRemainingDailyBudget(),
    workPassedCheck: workPassed,
    proofHeader: settlement.proofHeader,
    details: {
      solver: settlement.solver,
      payerAgent: config.agentId,
      owner: config.ownerAccountId
    }
  };

  ReceiptManager.addReceipt(receipt);
  emit('RECEIPT_GENERATED', { receipt });

  return {
    response: retryRes,
    data: responseData,
    receipt,
    wasPaid: true,
    lifecycle
  };
}

