import { createAuth } from './auth.js';
import { createKeys } from './keys.js';
import { createInvoke, createQuote } from './invoke.js';
import { createUsage } from './usage.js';

/**
 * @param {{
 *   baseUrl: string,
 *   storage?: { getItem: (key: string) => string|null, setItem: (key: string, value: string) => void }
 * }} options
 * @returns {{
 *   auth: { register: Function, login: Function, setToken: Function, getToken: Function, clearToken: Function },
 *   keys: { generate: Function, exists: Function, publicKey: Function, clear: Function },
 *   invoke: Function,
 *   usage: { log: Function, summary: Function }
 * }}
 */
export function createClient({ baseUrl, storage = localStorage }) {
  const auth = createAuth(baseUrl, storage);
  const keys = createKeys(storage);
  const invoke = createInvoke(baseUrl, auth, keys);
  const quote = createQuote(baseUrl, auth);
  const usage = createUsage(baseUrl, auth);

  return { auth, keys, invoke, quote, usage };
}
