# Micropayment-Gated Historical NEAR Blockchain Data
### Best x402 Integration on NEAR Protocol (Track 7: Agent Economy)

A production-ready micropayment gateway that implements **HTTP 402 (Payment Required)** to monetize access to historical NEAR blockchain data. Users and AI agents pay micro-amounts in NEAR or USDC to query historical transactions, blocks, chunk execution outcomes, and contract states.

---

## ⚡ What It Does

This gateway enables sustainable monetization of NEAR archival and historical data access through:
- **Pay-per-query access** to NEAR Historical Archival RPC (Blocks, Transactions, Chunks, Contract State).
- **Wallet-based authentication** using non-custodial NEAR signatures (`X-Payment-Signature`).
- **Real NEAR micropayments** on NEAR mainnet (or testnet) with instant settlement.
- **Range-Based Payment Batching**: Pay once for a range of blocks (e.g., 10,000 blocks for 0.05 NEAR), receive a signed token (`X-Range-Token`), and query freely with zero per-query overhead.
- **Transparent pricing & cryptographic receipts** for every query with direct links to [NearBlocks Explorer](https://nearblocks.io).
- **`near-pay` CLI**: A drop-in `pay.sh` style tool for developers and autonomous AI agents.

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │ 1. Select query & sign micropayment (NEAR / USDC)
│  Dashboard  │ 2. Request historical/RPC data + payment proof
│ (Port 3001) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │ 3. Enforce HTTP 402 Payment Required
│ (Port 4021) │ 4. Verify payment proof / range token with facilitator
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Facilitator │ 5. Validate transaction structure & non-custodial signature
│ (Port 3000) │ 6. Validate settlement to treasury.nearpay.near
└──────┬──────┘ 7. Return confirmation & receipt
       │
       ├────────────────────────┐
       │                        │
       ▼                        ▼
┌─────────────┐          ┌─────────────────────┐
│    NEAR     │          │    NEAR Archival    │
│   Mainnet   │          │       Node RPC      │
│  (Pagoda)   │          │ (archival-rpc.near) │
└─────────────┘          └─────────────────────┘
       │                        │
       └───────────┬────────────┘
                   ▼
            ┌─────────────┐
            │   Receipt   │ Transaction signature / hash
            │ Generation  │ + verified historical data returned
            └─────────────┘
```

---

## 🚀 Key Features

### 1. x402 Protocol Implementation
- Responds with standard `HTTP 402 Payment Required` headers:
  `WWW-Authenticate: X-402 amount="0.00005", currency="NEAR", recipient="treasury.nearpay.near", network="near-mainnet"`
- Dynamic pricing per RPC method (`block`, `tx`, `chunk`, `query`, `gas_price`).
- Cryptographic receipt generation with on-chain verification links.

### 2. Range-Based Payment Batching
*Instead of paying for each individual query, purchase access to a range of blocks (e.g., 115,000,000 - 115,010,000) and query freely within that range.*
- **Lower overhead**: One payment instead of 10,000 transactions.
- **Cost-effective**: 0.05 NEAR (~$0.25) for 10,000 blocks vs $2.50 for individual queries.
- **Better UX**: Zero wallet prompts during data analysis sessions.

### 3. Real NEAR Micropayments
- User/agent signs a non-custodial transfer to `treasury.nearpay.near`.
- No custodial wallets — users maintain full control of private keys.
- Facilitator verifies signature structure and amount before upstream data delivery.

### 4. Live Dashboard (`http://localhost:3001`)
- Real-time service status monitoring (Gateway, Facilitator, Archival RPC).
- Interactive query interface with verified working presets for NEAR blocks and transactions.
- Range-batching pass manager and live receipt ledger.

---

## 📊 Pricing Model

All historical data queries require micropayments in NEAR (or USDC):

| RPC Method | Price (NEAR) | Price (USD) | Description |
| :--- | :--- | :--- | :--- |
| `block` | 0.00005 NEAR | ~$0.00025 | Complete historical block & chunk headers |
| `tx` | 0.00002 NEAR | ~$0.00010 | Transaction outcome & receipt status |
| `chunk` | 0.00002 NEAR | ~$0.00010 | Specific shard chunk details |
| `query` | 0.00003 NEAR | ~$0.00015 | View account balance, state, or contract code |
| `gas_price` | 0.00001 NEAR | ~$0.00005 | Historical gas price for a block height |
| `validators` | 0.00004 NEAR | ~$0.00020 | Active validator set and stake weights |

---

## 🛠️ Project Structure

```
Near-API/
├── backend/
│   ├── facilitator/          # Payment verification & settlement (Port 3000)
│   │   └── src/
│   │       ├── index.ts      # Main facilitator server
│   │       ├── verify.ts     # Signature validation & receipt generator
│   │       ├── settle.ts     # Range token signer & validator
│   │       └── config.ts     # Treasury & network configuration
│   └── gateway/              # HTTP 402 enforcement & RPC proxy (Port 4021)
│       └── src/
│           ├── index.ts      # Main gateway server
│           ├── middleware.ts # HTTP 402 enforcement & challenge builder
│           ├── pricing.ts    # Dynamic pricing per NEAR RPC method
│           ├── range.ts      # Range-based payment batching
│           └── proxy.ts      # Upstream NEAR Archival RPC proxy
├── frontend/
│   └── dashboard/            # Interactive Web Client (Port 3001)
│       └── public/
│           └── index.html    # Full UI with Query builder & Range Pass
├── cli/                      # near-pay CLI (like pay.sh)
│   ├── bin/near-pay.js
│   └── src/cli.ts
└── shared/
    └── types/                # Shared TypeScript types (@x402-gateway/types)
```

---

## 💻 Quick Start & Usage

### 1. Running the Services
All services run locally:
```bash
# Terminal 1 - Start Facilitator
npm run facilitator
# Runs on http://localhost:3000

# Terminal 2 - Start Gateway
npm run gateway
# Runs on http://localhost:4021

# Terminal 3 - Start Dashboard
npm run dashboard
# Runs on http://localhost:3001
```

### 2. Using the Dashboard
Open **http://localhost:3001** in your browser:
1. Select a query preset (e.g. *Block #115000000* or *Historical Tx Query*).
2. Click **"Pay Micropayment & Fetch Data"**.
3. The gateway intercepts the 402 challenge, the wallet signs the micropayment, and the verified archival data is delivered with a NearBlocks receipt link!

---

## 📡 API Examples

### HTTP 402 Flow

#### Initial Request (No Payment)
```bash
curl.exe -i -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"block\",\"params\":{\"block_id\":115000000}}'
```

#### Response: HTTP 402 Payment Required
```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: X-402 amount="0.00005", currency="NEAR", recipient="treasury.nearpay.near", network="near-mainnet"
X-Payment-Required: true
Content-Type: application/json

{
  "error": "Payment required",
  "amount": "0.00005 NEAR",
  "amountYocto": "50000000000000000000",
  "currency": "NEAR",
  "recipient": "treasury.nearpay.near",
  "method": "block",
  "pricingUSD": "$0.00025",
  "description": "Fetch complete block and chunk headers",
  "rangeBatchingAvailable": true
}
```

---

### Using the `near-pay` CLI (Drop-in `pay.sh` tool)

The CLI automatically handles the 402 challenge, signs the payment, retries, and returns the verified data:

```bash
# Query any block
node cli/dist/index.js rpc block '{"block_id": 115000000}'

# Query historical transaction
node cli/dist/index.js rpc tx '["3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU"]'

# View wallet balance
node cli/dist/index.js balance
```

Output:
```
[near-pay] Sending POST request to http://localhost:4021/rpc...
[!] HTTP 402 Payment Required intercepted.
    Method:    block
    Price:     0.00005 NEAR ($0.00025)
    Recipient: treasury.nearpay.near
    [near-pay] Signing non-custodial NEAR micropayment...
    [near-pay] Retrying with payment proof (X-Payment-Signature)...
    [OK] Gateway verified payment & delivered data (HTTP 200).

{
  "jsonrpc": "2.0",
  "result": { ... historical block data ... },
  "receipt": {
    "signature": "near_sig_1cebce81a777...",
    "amount": "0.000050 NEAR",
    "explorerUrl": "https://nearblocks.io/tx/near_sig_1cebce81a777..."
  }
}
```

---

### Range-Based Payment Batching

Purchase bulk access to a block range (e.g. 10,000 blocks) and query freely without paying per-query:

#### 1. Purchase Range Access
```bash
node cli/dist/index.js buy-range 115000000 115010000
```
Response:
```
==> Purchasing Range-Based Batch Access
  * Range:    Blocks 115000000 - 115010000 (10001 blocks)
  * Duration: 1 hour (3600s)
[OK] Range Access Purchased Successfully!
  * Total Price: 0.0500 NEAR ($0.2500)
  * Token saved: ~/.near-pay/range-token.json
```

#### 2. Query Freely in Range (0 Extra Payments!)
```bash
node cli/dist/index.js rpc block '{"block_id": 115005000}'
```
*The request includes `X-Range-Token`, the gateway verifies the block falls in the purchased range, and the block data is returned immediately with zero HTTP 402 challenge!*

---

## 📄 License
MIT © NEAR x402 Gateway Team
