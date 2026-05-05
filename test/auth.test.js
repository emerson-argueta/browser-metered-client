import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuth } from '../src/auth.js'

function makeStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value },
  }
}

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'HTTP Error',
    json: () => Promise.resolve(body),
  })
}

describe('auth', () => {
  const BASE = 'https://proxy.example.com'
  let storage, auth

  beforeEach(() => {
    storage = makeStorage()
    auth = createAuth(BASE, storage)
  })

  describe('register', () => {
    it('POSTs to /api/auth/register with email, password, password_confirmation', async () => {
      globalThis.fetch = mockFetch(201, { token: 'jwt123' })
      await auth.register('a@b.com', 'pass', 'pass')
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'pass', password_confirmation: 'pass' }),
        })
      )
    })

    it('stores the token on success', async () => {
      globalThis.fetch = mockFetch(201, { token: 'jwt123' })
      await auth.register('a@b.com', 'pass', 'pass')
      expect(storage.getItem('bmp_token')).toBe('jwt123')
    })

    it('throws ProxyError with joined errors array on validation failure', async () => {
      globalThis.fetch = mockFetch(422, { errors: ['Email is invalid', 'Password is too short'] })
      await expect(auth.register('bad', 'x', 'y')).rejects.toMatchObject({
        status: 422,
        message: 'Email is invalid, Password is too short',
      })
    })

    it('throws ProxyError with error string on other failures', async () => {
      globalThis.fetch = mockFetch(500, { error: 'Internal server error' })
      await expect(auth.register('a@b.com', 'pass', 'pass')).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error',
      })
    })
  })

  describe('login', () => {
    it('POSTs to /api/auth/login with email and password', async () => {
      globalThis.fetch = mockFetch(200, { token: 'jwt456' })
      await auth.login('a@b.com', 'pass')
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'pass' }),
        })
      )
    })

    it('stores the token on success', async () => {
      globalThis.fetch = mockFetch(200, { token: 'jwt456' })
      await auth.login('a@b.com', 'pass')
      expect(storage.getItem('bmp_token')).toBe('jwt456')
    })

    it('throws ProxyError on invalid credentials', async () => {
      globalThis.fetch = mockFetch(401, { error: 'Invalid email or password' })
      await expect(auth.login('a@b.com', 'wrong')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password',
      })
    })
  })

  describe('token management', () => {
    it('getToken returns null when nothing is stored', () => {
      expect(auth.getToken()).toBeNull()
    })

    it('setToken / getToken round-trips the value', () => {
      auth.setToken('mytoken')
      expect(auth.getToken()).toBe('mytoken')
    })

    it('clearToken makes getToken return null', () => {
      auth.setToken('mytoken')
      auth.clearToken()
      expect(auth.getToken()).toBeNull()
    })
  })
})
