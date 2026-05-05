import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInvoke } from '../src/invoke.js'

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'HTTP Error',
    json: () => Promise.resolve(body),
  })
}

describe('invoke', () => {
  const BASE = 'https://proxy.example.com'
  const successResult = { status: 'success', total_charged_cents: 100 }

  let auth, keys, invoke

  beforeEach(() => {
    auth = { getToken: vi.fn().mockReturnValue(null) }
    keys = { publicKey: vi.fn(), sign: vi.fn() }
    invoke = createInvoke(BASE, auth, keys)
  })

  it('POSTs to /api/capability with capability and payload envelope', async () => {
    globalThis.fetch = mockFetch(200, successResult)
    await invoke('verify_income', { external_id: 'item_abc' })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/capability`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ capability: 'verify_income', payload: { external_id: 'item_abc' } }),
      })
    )
  })

  it('attaches Authorization header when a token exists', async () => {
    auth.getToken.mockReturnValue('mytoken')
    globalThis.fetch = mockFetch(200, successResult)
    await invoke('verify_income', {})
    const [, options] = fetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer mytoken')
  })

  it('omits Authorization header when no token is set', async () => {
    globalThis.fetch = mockFetch(200, successResult)
    await invoke('verify_income', {})
    const [, options] = fetch.mock.calls[0]
    expect(options.headers['Authorization']).toBeUndefined()
  })

  it('returns the parsed response body', async () => {
    globalThis.fetch = mockFetch(200, successResult)
    const res = await invoke('verify_income', {})
    expect(res).toEqual(successResult)
  })

  it('throws ProxyError on non-2xx response', async () => {
    globalThis.fetch = mockFetch(404, { error: 'Unknown capability' })
    await expect(invoke('unknown', {})).rejects.toMatchObject({
      status: 404,
      message: 'Unknown capability',
    })
  })

  it('throws ProxyError on 422 with error message', async () => {
    globalThis.fetch = mockFetch(422, { error: 'Invalid signature' })
    await expect(invoke('submit_form', {})).rejects.toMatchObject({
      status: 422,
      message: 'Invalid signature',
    })
  })

  describe('with sign: true', () => {
    beforeEach(() => {
      keys.publicKey.mockResolvedValue('base64pubkey==')
      keys.sign.mockResolvedValue('base64sig==')
    })

    it('includes a signature envelope in the request body', async () => {
      globalThis.fetch = mockFetch(200, successResult)
      await invoke('submit_form', { data: { name: 'Jane' } }, { sign: true })
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.signature).toEqual({
        algorithm: 'ed25519',
        public_key: 'base64pubkey==',
        value: 'base64sig==',
      })
    })

    it('signs the canonical message matching proxy SignatureVerifier format', async () => {
      globalThis.fetch = mockFetch(200, successResult)
      const payload = { data: { name: 'Jane' }, idempotency_key: 'app_abc' }
      await invoke('submit_form', payload, { sign: true })
      expect(keys.sign).toHaveBeenCalledWith(`submit_form:${JSON.stringify(payload)}`)
    })

    it('fetches public key and signature in parallel', async () => {
      let publicKeyResolved = false
      let signResolved = false
      keys.publicKey.mockImplementation(() =>
        new Promise(r => setTimeout(() => { publicKeyResolved = true; r('pub==') }, 10))
      )
      keys.sign.mockImplementation(() =>
        new Promise(r => setTimeout(() => { signResolved = true; r('sig==') }, 10))
      )
      globalThis.fetch = mockFetch(200, successResult)
      await invoke('submit_form', {}, { sign: true })
      expect(publicKeyResolved).toBe(true)
      expect(signResolved).toBe(true)
    })
  })
})
