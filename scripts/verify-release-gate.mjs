import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requestedGate = process.argv[2];
if (!/^S[0-4]$/.test(requestedGate ?? '')) {
  throw new Error('Usage: node scripts/verify-release-gate.mjs S0|S1|S2|S3|S4');
}

const registryPath = resolve('config/release-gates.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const gate = registry.gates?.[requestedGate];
if (!gate?.approved) throw new Error(`${requestedGate} is not approved.`);
if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
  throw new Error(`${requestedGate} has no evidence.`);
}
if (!Array.isArray(gate.approvals) || gate.approvals.length === 0) {
  throw new Error(`${requestedGate} has no named approval.`);
}
for (const evidence of gate.evidence) {
  if (
    typeof evidence !== 'string' ||
    (!evidence.startsWith('https://') && !existsSync(resolve(evidence)))
  ) {
    throw new Error(`${requestedGate} evidence is missing or invalid: ${String(evidence)}`);
  }
}
console.log(`${requestedGate} approved with ${gate.evidence.length} evidence record(s).`);
