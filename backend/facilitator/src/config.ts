export const CONFIG = {
  PORT: parseInt(process.env.FACILITATOR_PORT || '3005', 10),
  NETWORK: process.env.NETWORK || 'mainnet',
  NEAR_RPC_URL: process.env.NEAR_RPC_URL || 'https://archival-rpc.mainnet.near.org',
  FALLBACK_RPC_URL: 'https://rpc.mainnet.near.org',
  PAYMENT_RECIPIENT: process.env.PAYMENT_RECIPIENT || 'treasury.nearpay.near',
  TOKEN_SECRET: process.env.TOKEN_SECRET || 'near_x402_gateway_secret_2026_super_secure',
  EXPLORER_BASE_URL: process.env.NETWORK === 'testnet' 
    ? 'https://testnet.nearblocks.io/tx/' 
    : 'https://nearblocks.io/tx/'
};

