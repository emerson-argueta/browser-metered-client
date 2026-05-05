import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUsage } from '../src/usage.js'

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'HTTP Error',
    json: () => Promise.resolve(body),
  })
}

describe('usage', () => {
  const BASE = 'https://proxy.example.com'
  const emptyLog = { records: [], total: 0, page: 1, pages: 0 }

  let auth, usage

  beforeEach(() => {
    auth = { getToken: vi.fn().mockReturnValue('mytoken') }
    usage = createUsage(BASE, auth)
  })

  describe('log', () => {
    it('GETs /api/usage/log with no query string when called with no args', async () => {
      globalThis.fetch = mockFetch(200, emptyLog)
      await usage.log()
      const [url] = fetch.mock.calls[0]
      expect(url).toBe(`${BASE}/api/usage/log`)
    })

    it('appends all provided filter params to the query string', async () => {
      globalThis.fetch = mockFetch(200, emptyLog)
      await usage.log({ capability: 'verify_income', provider: 'plaid', status: 'success', start_date: '2026-01-01', page: 2 })
      const [url] = fetch.mock.calls[0]
      expect(url).toContain('capability=verify_income')
      expect(url).toContain('provider=plaid')
      expect(url).toContain('status=success')
      expect(url).toContain('start_date=2026-01-01')
      expect(url).toContain('page=2')
    })

    it('omits undefined filter params from the query string', async () => {
      globalThis.fetch = mockFetch(200, emptyLog)
      await usage.log({ capability: 'verify_income' })
      const [url] = fetch.mock.calls[0]
      expect(url).not.toContain('provider=')
      expect(url).not.toContain('status=')
    })

    it('attaches Authorization header', async () => {
      globalThis.fetch = mockFetch(200, emptyLog)
      await usage.log()
      const [, options] = fetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer mytoken')
    })

    it('returns the parsed response body', async () => {
      const logData = { records: [{ id: 1 }], total: 1, page: 1, pages: 1 }
      globalThis.fetch = mockFetch(200, logData)
      const res = await usage.log()
      expect(res).toEqual(logData)
    })

    it('throws ProxyError on non-2xx', async () => {
      globalThis.fetch = mockFetch(401, { error: 'Unauthorized' })
      await expect(usage.log()).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
    })
  })

  describe('summary', () => {
    const summaryData = {
      this_month_total_cents: 500,
      this_month_raw_cost_cents: 400,
      this_month_markup_cents: 100,
      all_time_total_cents: 10000,
    }

    it('GETs /api/usage/summary', async () => {
      globalThis.fetch = mockFetch(200, summaryData)
      await usage.summary()
      const [url] = fetch.mock.calls[0]
      expect(url).toBe(`${BASE}/api/usage/summary`)
    })

    it('attaches Authorization header', async () => {
      globalThis.fetch = mockFetch(200, summaryData)
      await usage.summary()
      const [, options] = fetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer mytoken')
    })

    it('returns the parsed summary', async () => {
      globalThis.fetch = mockFetch(200, summaryData)
      const res = await usage.summary()
      expect(res).toEqual(summaryData)
    })

    it('throws ProxyError on non-2xx', async () => {
      globalThis.fetch = mockFetch(401, { error: 'Unauthorized' })
      await expect(usage.summary()).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
    })
  })
})
