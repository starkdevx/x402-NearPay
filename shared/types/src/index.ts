export interface RpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params: any;
}

export interface RpcResponse<T = any> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  receipt?: PaymentReceipt;
}

export interface PaymentRequirement {
  error: string;
  amount: string;          // In human readable or yoctoNEAR
  amountYocto: string;     // Exact yoctoNEAR (1 NEAR = 1e24 yocto)
  amountUsd?: string;
  currency: 'NEAR' | 'USDC';
  recipient: string;       // e.g. "treasury.nearpay.near"
  network: 'mainnet' | 'testnet';
  method: string;
  challengeId: string;
  rangeBatchingAvailable?: boolean;
}

export interface PaymentReceipt {
  signature: string;       // NEAR transaction hash or signature
  timestamp: number;
  payer: string;
  recipient: string;
  amount: string;
  currency: string;
  method: string;
  network: string;
  blockHeight?: number;
  explorerUrl: string;
  status: 'CONFIRMED' | 'SETTLED';
}

export interface RangePurchaseRequest {
  startBlock: number;
  endBlock: number;
  durationSeconds: number; // e.g. 3600 (1 hr)
  payer: string;
  paymentTxSignature: string;
}

export interface RangePurchaseResponse {
  success: boolean;
  token: string;           // JWT or signed bearer token
  range: {
    startBlock: number;
    endBlock: number;
    blockCount: number;
  };
  pricing: {
    totalNear: string;
    priceUsd: string;
  };
  access: {
    duration: number;
    expiresAt: number;
  };
}

export interface RangeTokenPayload {
  startBlock: number;
  endBlock: number;
  payer: string;
  expiresAt: number;
  txSignature: string;
}
