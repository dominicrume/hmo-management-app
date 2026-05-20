// Post-response verification layer.
// Checks AI output before it reaches the client.

export interface VerificationResult {
  passed:    boolean;
  warnings:  string[];
  piiFlags:  string[];
  grounded:  boolean;  // response is grounded in provided context
}

// UK PII patterns that should never appear verbatim in AI responses
// (except when deliberately echoing tenant data back to the worker)
const NINO_PATTERN  = /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b/g;
const SORT_CODE     = /\b\d{2}-\d{2}-\d{2}\b/g;
const ACCOUNT_NO    = /\b\d{8}\b/g;

// Phrases that indicate the AI may be hallucinating / speculating
const SPECULATION_PHRASES = [
  'i believe', 'i think', 'i assume', 'probably', 'likely to be',
  'it seems', 'might be', 'could be that', 'my understanding is',
];

// Phrases that indicate the AI is operating out of scope
const OUT_OF_SCOPE = [
  'legal advice', 'medical diagnosis', 'prescribe', 'solicitor',
  'immigration status', 'right to remain',
];

export function verifyResponse(
  response:    string,
  contextText: string,
): VerificationResult {
  const warnings:  string[] = [];
  const piiFlags:  string[] = [];
  const lower      = response.toLowerCase();

  // 1. PII leak detection — flag NINO / financial patterns in the response
  //    that are NOT in the provided context (i.e. the AI invented them)
  const responseNinos  = Array.from(response.match(NINO_PATTERN)   ?? []);
  const contextNinos   = Array.from(contextText.match(NINO_PATTERN) ?? []);
  for (const nino of responseNinos) {
    if (!contextNinos.includes(nino)) {
      piiFlags.push(`Possible hallucinated NINO: ${nino}`);
    }
  }
  if ((response.match(SORT_CODE) ?? []).length > 0) {
    piiFlags.push('Sort code pattern detected in response — verify this is intentional');
  }
  if ((response.match(ACCOUNT_NO) ?? []).length > 0) {
    piiFlags.push('8-digit number detected — may be a bank account number');
  }

  // 2. Speculation detection
  for (const phrase of SPECULATION_PHRASES) {
    if (lower.includes(phrase)) {
      warnings.push(`Speculation detected: "${phrase}" — AI should only state what data shows`);
      break; // one warning is enough
    }
  }

  // 3. Out-of-scope detection
  for (const phrase of OUT_OF_SCOPE) {
    if (lower.includes(phrase)) {
      warnings.push(`Out-of-scope content: "${phrase}" — AI should not provide this`);
    }
  }

  // 4. Grounding check — response references at least some data from context
  //    (rudimentary: checks if at least one word from context appears in response)
  const contextWords = new Set(contextText.toLowerCase().split(/\W+/).filter((w) => w.length > 5));
  const responseWords = lower.split(/\W+/);
  const overlap = responseWords.filter((w) => contextWords.has(w)).length;
  const grounded = overlap > 3 || response.includes('No information') || response.includes('not recorded');

  if (!grounded) {
    warnings.push('Response may not be grounded in tenant context — review carefully');
  }

  return {
    passed:   piiFlags.length === 0,
    warnings,
    piiFlags,
    grounded,
  };
}
