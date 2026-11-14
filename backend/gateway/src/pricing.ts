export interface MethodPrice {
  near: number;
  yocto: string;
  usd: string;
  description: string;
}

// 1 NEAR = 10^24 yoctoNEAR
export const PRICING_TABLE: Record<string, MethodPrice> = {
  block: {
    near: 0.00005,
    yocto: '50000000000000000000',
    usd: '$0.00025',
    description: 'Fetch complete block and chunk headers'
  },
  tx: {
    near: 0.00002,
    yocto: '20000000000000000000',
    usd: '$0.00010',
    description: 'Fetch transaction execution outcome and receipt status'
  },
  chunk: {
    near: 0.00002,
    yocto: '20000000000000000000',
    usd: '$0.00010',
    description: 'Fetch shard chunk details'
  },
  query: {
    near: 0.00003,
    yocto: '30000000000000000000',
    usd: '$0.00015',
    description: 'View account state, contract code or function call'
  },
  gas_price: {
    near: 0.00001,
    yocto: '10000000000000000000',
    usd: '$0.00005',
    description: 'Retrieve gas price for a given block'
  },
  validators: {
    near: 0.00004,
    yocto: '40000000000000000000',
    usd: '$0.00020',
    description: 'Retrieve active validator set and stake weights'
  },
  status: {
    near: 0.00001,
    yocto: '10000000000000000000',
    usd: '$0.00005',
    description: 'Node sync status and latest block height'
  }
};

export const DEFAULT_PRICE: MethodPrice = {
  near: 0.00002,
  yocto: '20000000000000000000',
  usd: '$0.00010',
  description: 'Standard NEAR RPC query'
};

export function getPriceForMethod(method: string): MethodPrice {
  return PRICING_TABLE[method.toLowerCase()] || DEFAULT_PRICE;
}

