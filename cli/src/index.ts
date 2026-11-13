export * from './cli.js';
import { runCli } from './cli.js';

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('cli.js') || 
                    process.argv[1]?.replace(/\\/g, '/').endsWith('index.js') ||
                    process.argv[1]?.replace(/\\/g, '/').endsWith('near-pay.js') ||
                    process.argv[1]?.replace(/\\/g, '/').endsWith('near-pay');

if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error('[near-pay error]', err);
    process.exit(1);
  });
}
