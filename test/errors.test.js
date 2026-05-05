import { describe, it, expect } from 'vitest'
import { ProxyError } from '../src/errors.js'

describe('ProxyError', () => {
  it('sets name, status, and message', () => {
    const err = new ProxyError(422, 'Validation failed')
    expect(err.name).toBe('ProxyError')
    expect(err.status).toBe(422)
    expect(err.message).toBe('Validation failed')
    expect(err).toBeInstanceOf(Error)
  })
})
