import { ProxyError } from './errors.js';

/**
 * @param {string} baseUrl
 * @param {{ getToken: () => string|null }} auth
 */
export function createUsage(baseUrl, auth) {
  function authHeaders() {
    const token = auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * @param {{ capability?: string, provider?: string, status?: string, start_date?: string, page?: number }} [filters]
   * @returns {Promise<{ records: Object[], total: number, page: number, pages: number }>}
   */
  async function log(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) params.set(key, value);
    }
    const query = params.toString();
    const res = await fetch(
      `${baseUrl}/api/usage/log${query ? `?${query}` : ''}`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ProxyError(res.status, data.error || res.statusText);
    }
    return res.json();
  }

  /**
   * @returns {Promise<Object>}
   */
  async function summary() {
    const res = await fetch(`${baseUrl}/api/usage/summary`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ProxyError(res.status, data.error || res.statusText);
    }
    return res.json();
  }

  return { log, summary };
}
