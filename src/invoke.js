import { ProxyError, InsufficientBalanceError } from './errors.js';

/**
 * @param {string} baseUrl
 * @param {{ getToken: () => string|null }} auth
 * @param {{ publicKey: () => Promise<string|null>, sign: (msg: string) => Promise<string> }} keys
 */
export function createInvoke(baseUrl, auth, keys) {
  /**
   * @param {string} capability - The capability name (e.g. "verify_income")
   * @param {Object} payload - The capability payload
   * @param {{ sign?: boolean }} [options]
   * @returns {Promise<Object>} The capability result including cost fields
   */
  async function invoke(capability, payload, options = {}) {
    const envelope = { capability, payload };

    if (options.sign) {
      const canonical = `${capability}:${JSON.stringify(payload)}`;
      const [pubKey, signature] = await Promise.all([
        keys.publicKey(),
        keys.sign(canonical),
      ]);
      envelope.signature = {
        algorithm: 'ed25519',
        public_key: pubKey,
        value: signature,
      };
    }

    const token = auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/api/capability`, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 402 && data.code === 'insufficient_balance') {
        throw new InsufficientBalanceError(data.error || 'Insufficient balance');
      }
      throw new ProxyError(res.status, data.error || res.statusText, data.code);
    }

    return res.json();
  }

  return invoke;
}
