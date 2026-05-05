# browser-metered-client — Project Specification

A minimal JavaScript client library for [browser-metered-proxy](https://github.com/emerson-argueta/browser-metered-proxy). It handles the three things every browser app needs when talking to the proxy: **attaching identity, signing submissions, and dispatching capabilities.**

---

## What This Is

A small, focused JS library (no framework, no bundler required) that abstracts the three integration concerns a browser app has with the proxy:

1. **JWT identity** — store the token after login/register, attach it automatically to every request
2. **Ed25519 signing** — generate and store a keypair, sign submission payloads for tamper-proof storage
3. **Capability dispatch** — send requests in the correct envelope shape, return structured results

It does not:
- Know what capabilities exist or what their payloads mean
- Orchestrate workflows or chain capabilities
- Manage application state
- Provide a UI

---

## API Design

### Initialization

```javascript
import { createClient } from 'browser-metered-client'

const client = createClient({
  baseUrl: 'https://your-proxy.fly.dev',  // required
  storage: localStorage,                   // optional, default: localStorage
})
```

### Auth

```javascript
// Register — stores JWT automatically
await client.auth.register('user@example.com', 'password')

// Login — stores JWT automatically
await client.auth.login('user@example.com', 'password')

// Set token manually (e.g. from local SQLite in a WASM app)
client.auth.setToken(jwt)

// Get current token
client.auth.getToken()

// Clear token (logout)
client.auth.clearToken()
```

### Capability dispatch

```javascript
// Basic capability — JWT attached automatically
const result = await client.invoke('verify_income', {
  external_id: 'item_abc123'
})
// result: { status, raw_cost_cents, markup_cents, total_charged_cents, income_data }

// Signed submission — payload signed with stored Ed25519 keypair
const result = await client.invoke('submit_form', {
  data: { name: 'Jane Doe', income: 75000 },
  idempotency_key: 'application_abc123'
}, { sign: true })
// result: { submission_id, status, raw_cost_cents, markup_cents, total_charged_cents }
```

### Key management

```javascript
// Generate a new Ed25519 keypair and store it
await client.keys.generate()

// Check if a keypair exists
client.keys.exists()

// Get the public key as base64 (safe to share / store in server)
await client.keys.publicKey()

// Clear the stored keypair
client.keys.clear()
```

### Usage & billing

```javascript
// Paginated capability log
const log = await client.usage.log({
  capability: 'verify_income',   // optional
  provider: 'plaid',             // optional
  status: 'success',             // optional
  start_date: '2026-01-01',      // optional
  page: 1                        // optional
})
// log: { records, total, page, pages }

// Monthly summary
const summary = await client.usage.summary()
// summary: { this_month_total_cents, this_month_raw_cost_cents,
//            this_month_markup_cents, all_time_total_cents,
//            breakdown_by_capability, breakdown_by_provider, ... }
```

---

## Envelope Shape

When `invoke` is called without signing:

```json
{
  "capability": "verify_income",
  "payload": { "external_id": "item_abc123" }
}
```

When `invoke` is called with `{ sign: true }`:

```json
{
  "capability": "submit_form",
  "payload": { "data": { ... }, "idempotency_key": "..." },
  "signature": {
    "algorithm": "ed25519",
    "public_key": "<base64 public key>",
    "value": "<base64 signature>"
  }
}
```

The canonical message that gets signed:

```
submit_form:{"data":{...},"idempotency_key":"..."}
```

This matches exactly what `SignatureVerifier.canonical_message` produces on the proxy side.

---

## Storage Model

The client stores two things:

| Key | Value | Default location |
|-----|-------|-----------------|
| `bmp_token` | JWT string | `localStorage` |
| `bmp_keypair` | Ed25519 keypair (CryptoKey, non-extractable private key) | `localStorage` (exported as JWK) |

Storage is configurable — pass any object with `getItem(key)` and `setItem(key, value)` to `createClient`. This lets WASM apps use their own SQLite-backed storage instead of `localStorage`.

```javascript
// Custom storage — e.g. a WASM Rails app's SQLite wrapper
const client = createClient({
  baseUrl: 'https://your-proxy.fly.dev',
  storage: {
    getItem: (key) => db.query('SELECT value FROM kv WHERE key = ?', [key]),
    setItem: (key, value) => db.exec('INSERT OR REPLACE INTO kv VALUES (?, ?)', [key, value])
  }
})
```

---

## Signing Model

Ed25519 signing uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) — no third-party crypto dependency.

```javascript
// Key generation
const keypair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify']
)

// Signing
const messageBytes = new TextEncoder().encode(canonicalMessage)
const signatureBytes = await crypto.subtle.sign('Ed25519', privateKey, messageBytes)
const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
```

The private key is stored as a JWK and never exposed outside the library. The public key is exported as raw bytes and base64-encoded for transport.

---

## Error Handling

`invoke` rejects with a structured error on non-2xx responses:

```javascript
try {
  await client.invoke('verify_income', { external_id: 'item_abc' })
} catch (err) {
  err.status   // HTTP status code
  err.message  // error message from proxy
}
```

---

## File Structure

```
src/
├── client.js          # createClient — main entry point
├── auth.js            # register, login, setToken, getToken, clearToken
├── invoke.js          # capability dispatch + envelope building
├── keys.js            # Ed25519 keypair generation, storage, signing
├── usage.js           # log, summary
└── errors.js          # ProxyError class

index.js               # re-exports createClient
```

---

## Browser Requirements

- **Ed25519 via Web Crypto API:** Chrome 113+, Firefox 129+, Safari 17+
- No bundler required — ships as an ES module
- No runtime dependencies

---

## JSDoc

All public functions are documented with JSDoc. Editors with TypeScript language server support (VS Code, etc.) will surface types and autocomplete automatically.

```javascript
/**
 * @param {string} capability - The capability name (e.g. "verify_income")
 * @param {Object} payload - The capability payload
 * @param {{ sign?: boolean }} [options]
 * @returns {Promise<Object>} The capability result including cost fields
 */
export async function invoke(capability, payload, options = {}) { ... }
```

---

## Roadmap

- [ ] `createClient` with configurable storage and baseUrl
- [ ] Auth module (register, login, token management)
- [ ] Capability dispatch with envelope building
- [ ] Ed25519 keypair generation and signing
- [ ] Usage log and summary
- [ ] Error handling with structured `ProxyError`
- [ ] JSDoc on all public APIs
- [ ] Tests (Node.js + jsdom for WebCrypto)
- [ ] Publish to npm as `browser-metered-client`
