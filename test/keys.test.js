import { describe, it, expect, beforeEach } from 'vitest'
import { createKeys } from '../src/keys.js'

function makeStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value },
  }
}

describe('keys', () => {
  let storage, keys

  beforeEach(() => {
    storage = makeStorage()
    keys = createKeys(storage)
  })

  it('exists() returns false before generate()', () => {
    expect(keys.exists()).toBe(false)
  })

  it('generate() stores a valid JWK keypair', async () => {
    await keys.generate()
    expect(keys.exists()).toBe(true)
    const { privateJwk, publicJwk } = JSON.parse(storage.getItem('bmp_keypair'))
    expect(privateJwk.kty).toBe('OKP')
    expect(privateJwk.crv).toBe('Ed25519')
    expect(publicJwk.kty).toBe('OKP')
    expect(publicJwk.crv).toBe('Ed25519')
  })

  it('publicKey() returns null before generate()', async () => {
    expect(await keys.publicKey()).toBeNull()
  })

  it('publicKey() returns a 32-byte base64-encoded string after generate()', async () => {
    await keys.generate()
    const pub = await keys.publicKey()
    expect(typeof pub).toBe('string')
    // Ed25519 raw public key is always 32 bytes
    expect(atob(pub)).toHaveLength(32)
  })

  it('clear() makes exists() return false', async () => {
    await keys.generate()
    keys.clear()
    expect(keys.exists()).toBe(false)
  })

  it('sign() throws when no keypair is stored', async () => {
    await expect(keys.sign('test')).rejects.toThrow('No keypair found')
  })

  it('sign() returns a non-empty base64 string', async () => {
    await keys.generate()
    const sig = await keys.sign('hello')
    expect(typeof sig).toBe('string')
    expect(sig.length).toBeGreaterThan(0)
  })

  it('sign() produces a signature verifiable with the stored public key', async () => {
    await keys.generate()
    const message = 'verify_income:{"external_id":"item_abc"}'
    const sig = await keys.sign(message)

    const { publicJwk } = JSON.parse(storage.getItem('bmp_keypair'))
    const publicKey = await crypto.subtle.importKey(
      'jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0))
    const msgBytes = new TextEncoder().encode(message)
    const valid = await crypto.subtle.verify('Ed25519', publicKey, sigBytes, msgBytes)
    expect(valid).toBe(true)
  })

  it('sign() produces a signature that fails for a tampered message', async () => {
    await keys.generate()
    const sig = await keys.sign('verify_income:{"external_id":"item_abc"}')

    const { publicJwk } = JSON.parse(storage.getItem('bmp_keypair'))
    const publicKey = await crypto.subtle.importKey(
      'jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0))
    const tamperedBytes = new TextEncoder().encode('verify_income:{"external_id":"tampered"}')
    const valid = await crypto.subtle.verify('Ed25519', publicKey, sigBytes, tamperedBytes)
    expect(valid).toBe(false)
  })
})
