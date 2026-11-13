import * as fs from 'fs';
import * as path from 'path';
import { getNearPayDir } from './config.js';
import { PaymentReceipt } from './types.js';

const RECEIPTS_FILE = path.join(getNearPayDir(), 'receipts.json');

export class ReceiptManager {
  public static getReceipts(): PaymentReceipt[] {
    if (!fs.existsSync(RECEIPTS_FILE)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(RECEIPTS_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static addReceipt(receipt: PaymentReceipt): void {
    const receipts = this.getReceipts();
    receipts.unshift(receipt);
    // Keep last 100 receipts
    const trimmed = receipts.slice(0, 100);
    fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  }

  public static formatTable(receipts?: PaymentReceipt[]): string {
    const list = receipts || this.getReceipts();
    if (list.length === 0) {
      return 'No transactions recorded yet. Run `near-pay curl <url>` to execute a paid API call.';
    }

    const header = `| Date & Time          | Provider / Endpoint          | Protocol | Amount    | Settlement Hash         | Verified | Budget Left |`;
    const divider = `| -------------------- | ---------------------------- | -------- | --------- | ----------------------- | -------- | ----------- |`;

    const rows = list.slice(0, 15).map(r => {
      const dt = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const prov = (r.provider || r.targetUrl).slice(0, 28).padEnd(28);
      const proto = r.protocol.toUpperCase().padEnd(8);
      const amt = (`$${r.amount.toFixed(2)} ${r.currency}`).padEnd(9);
      const hash = (r.txHash ? r.txHash.substring(0, 12) + '...' : 'none').padEnd(23);
      const verified = (r.workPassedCheck ? ' [PASS] ' : ' [FAIL] ').padEnd(8);
      const budget = (`$${r.remainingBudget.toFixed(2)}`).padEnd(11);
      return `| ${dt.padEnd(20)} | ${prov} | ${proto} | ${amt} | ${hash} | ${verified} | ${budget} |`;
    });

    return [header, divider, ...rows].join('\n');
  }
}

