import { ProxyError } from './errors.js';

const TOKEN_KEY = 'bmp_token';

/**
 * @param {string} baseUrl
 * @param {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void }} storage
 */
export function createAuth(baseUrl, storage) {
  /**
   * @param {string} email
   * @param {string} password
   * @param {string} passwordConfirmation
   * @returns {Promise<void>}
   */
  async function register(email, password, passwordConfirmation) {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, password_confirmation: passwordConfirmation }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.errors ? data.errors.join(', ') : (data.error || res.statusText);
      throw new ProxyError(res.status, message);
    }
    const data = await res.json();
    storage.setItem(TOKEN_KEY, data.token);
  }

  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  async function login(email, password) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ProxyError(res.status, data.error || res.statusText);
    }
    const data = await res.json();
    storage.setItem(TOKEN_KEY, data.token);
  }

  /**
   * @param {string} jwt
   */
  function setToken(jwt) {
    storage.setItem(TOKEN_KEY, jwt);
  }

  /**
   * @returns {string|null}
   */
  function getToken() {
    return storage.getItem(TOKEN_KEY) || null;
  }

  function clearToken() {
    storage.setItem(TOKEN_KEY, '');
  }

  return { register, login, setToken, getToken, clearToken };
}
