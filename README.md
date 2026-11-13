# NEAR Pay — The Payment Layer for AI Agents

> **NEAR Hackathon 2026** • **Track 7: Agent Economy** (*Tagline: "Give AI a wallet"*)  
> *Inspired by Solana Foundation's `pay.sh`, re-engineered natively for NEAR Intents, Chain Signatures, and Policy-Bound Agent Wallets.*

---

## ⚡ The Big Idea

When an autonomous AI agent encounters an **HTTP 402 Payment Required** response while accessing an API or buying dataset compute, **NEAR Pay**:
1. **Intercepts** the HTTP 402 challenge.
2. **Identifies** the payment protocol (**x402** or **MPP**).
3. **Verifies** spending safety against owner-delegated cryptographic constraints (zero master private keys exposed).
4. **Negotiates** autonomously if a quote exceeds planned budget (1-round counter-offer with rationale).
5. **Settles** the payment through **NEAR Intents** and **1Click API solvers** (cross-chain stablecoins or NEAR).
6. **Retries** the original request with payment proof headers.
7. **Delivers** verified data to the agent and writes a tamper-evident audit receipt.

```
Without NEAR Pay:
$ curl https://api.nearpay.network/v1/near/top-ecosystem
HTTP 402: Payment Required (Agent crashes or halts)

With NEAR Pay:
$ near-pay curl https://api.nearpay.network/v1/near/top-ecosystem
[!] HTTP 402 Payment Required intercepted.
    Protocol:   X402
    Price:      $0.02 USDC
    Recipient:  aurora_analytics.near
    [Policy] Passed safety bounds. Remaining daily allowance: $4.98
    [NEAR Intents] Broadcasting intent to 1Click solver network...
    [NEAR Intents] Solved! Hash: 0xint_9a8f273b019c4d92
    [near-pay] Retrying original request with cryptographic proof...
    [OK] Provider returned HTTP 200 (Verified).
{
  "status": "SUCCESS",
  "dataset": "Top NEAR Ecosystem Projects",
  "projects": [...]
}
```

---

## 🏆 Why NEAR Pay Wins Track 7 (Agent Economy)

| Feature | Solana Foundation `pay.sh` | NEAR Pay | Track 7 Hackathon Alignment |
| :--- | :--- | :--- | :--- |
| **CLI Interceptor** | `pay curl <url>` | `near-pay curl <url>` | 1:1 drop-in curl replacement |
| **Key Management** | Raw private keys in OS keychain | **Policy-bound NEAR Agent API** | Master key never leaves the owner; agent only holds scoped grant |
| **Budget Safety** | Uncapped wallet exposure | **Strict per-tx & daily caps** | Immune to prompt injection draining treasury |
| **Cross-Chain Settlement** | Solana-only | **NEAR Intents (1Click API)** | Agent pays with USDC on NEAR or Base; provider receives preferred chain token |
| **Payment Protocols** | x402 & MPP | **x402 & MPP** | Full dual-protocol compliance with PingPay facilitator |
| **Model Context Protocol** | `pay mcp` | **`near-pay mcp`** | 6 specialized payment tools for Claude, Codex, Cursor & NEAR AI |
| **Autonomous Negotiation** | None | **1-Round Counter-Offer** | Fulfills hackathon requirement: counters once with reasoning or walks away |
| **Payment Debugger** | `debugger.pay.sh` | **`near-pay debugger`** | Real-time web visualizer with live SSE payment lifecycle events |

---

## 🛡️ Key Management: How the Agent Holds Its Keys

### What the Agent Has
The agent **never** holds the master account's private keys. It operates through the **NEAR Agent API** (`api.demo.agentsonintents.com`). The owner signs an on-chain grant specifying:
- `max_payment`: e.g. `$0.50`
- `daily_budget`: e.g. `$5.00`
- `allowed_assets`: `["USDC", "NEAR"]`
- `require_approval_above`: e.g. `$1.00`

### What the Agent CANNOT Do Without You
1. **Cannot spend beyond the per-transaction limit**: Any call above `$0.50` is automatically rejected.
2. **Cannot exceed the 24-hour rolling budget**: Once `$5.00` is reached, all payments halt until the next window.
3. **Cannot interact with unwhitelisted contracts/assets**: Prevents token-drainer scams.
4. **Cannot transfer master account ownership**: The agent cannot sign raw transactions outside scoped settlement intents.

---

## 📦 Monorepo Architecture

```
Near-API/
├── crates/
│   └── near-pay-cli/         # Native high-performance Rust CLI
├── packages/
│   ├── core/                 # TypeScript Core SDK & Node CLI (`near-pay`)
│   │   ├── src/policy.ts     # Cryptographic policy engine & budget tracker
│   │   ├── src/protocols/    # x402 and MPP protocol challenge parsers
│   │   ├── src/settlement/   # NEAR Intents 1Click solver & Agent API client
│   │   ├── src/negotiator.ts # Autonomous 1-round negotiation loop
│   │   └── src/receipts.ts   # Tamper-evident JSON audit ledger
│   ├── mcp-server/           # Model Context Protocol server (Claude / Cursor)
│   ├── debugger/             # Real-time visual payment inspector (port 4020)
│   └── demo-provider/        # Sample Paid NEAR Data API (port 4025)
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Installation & Build
```bash
# Install dependencies & compile TypeScript packages
npm install
npm run build
```

### 2. View Agent Profile & Spending Limits
```bash
node packages/core/dist/cli.js whoami
```

### 3. Start the Live Demo Provider & Visual Debugger
In one terminal:
```bash
npm run provider
# Runs on http://127.0.0.1:4025
```

In a second terminal:
```bash
npm run debugger
# Opens visual inspector at http://127.0.0.1:4020
```

### 4. Execute Paid Requests
```bash
# Test x402 payment flow ($0.02 USDC)
node packages/core/dist/cli.js curl http://127.0.0.1:4025/v1/near/top-ecosystem

# Test MPP payment flow ($0.04 USDC)
node packages/core/dist/cli.js curl http://127.0.0.1:4025/v1/near/validator-intelligence

# Test Autonomous Negotiation flow ($0.09 quote vs $0.04 budget)
node packages/core/dist/cli.js curl http://127.0.0.1:4025/v1/near/market-research --budget 0.04
```

### 5. Automated 1-Command Hackathon Demo
```bash
npm run demo
# Runs an end-to-end multi-scenario test including x402, MPP, negotiation, and receipt generation!
```

---

## 🤖 AI Assistant MCP Integration

Add NEAR Pay to Claude Desktop, Cursor, or Codex by adding this entry to your `mcpServers` configuration:

```json
{
  "mcpServers": {
    "near-pay": {
      "command": "node",
      "args": ["<PATH_TO_PROJECT>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Tools Exposed to AI:
- `nearpay_curl`: Execute paid HTTP GET/POST with automatic 402 settlement.
- `inspect_payment`: Preview payment challenge without spending funds.
- `get_wallet_balance`: Query USDC and NEAR holdings.
- `get_spending_limits`: Check remaining daily allowance and safety caps.
- `get_payment_history`: Fetch past receipts.
- `discover_paid_apis`: Directory of paid agent APIs in the NEAR ecosystem.

---

## 📄 License
Apache-2.0 © NEAR Pay Team

